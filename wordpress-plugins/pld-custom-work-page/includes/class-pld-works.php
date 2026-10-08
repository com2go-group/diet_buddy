<?php
defined( 'ABSPATH' ) || exit;

/**
 * Master "Works" page: ordered project grid (3 per row) with lazy loading.
 */
class PLD_Works {

	const OPT_HERO = 'pld_works_hero'; // array( 'images' => int[], 'height' => '25vw' )

	public static function init() {
		add_image_size( 'pld-card', 350, 500, true ); // master project image: 350 x 500, cropped.
		add_shortcode( 'pld_works', array( __CLASS__, 'shortcode' ) );
		add_action( 'rest_api_init', array( __CLASS__, 'register_rest' ) );
	}

	public static function batch_size() {
		$n = (int) get_option( PLD_OPT_BATCH, 6 );
		return min( 30, max( 3, $n ) );
	}

	/** Ordered list of project IDs chosen for the master page. */
	public static function get_order() {
		$order = get_option( PLD_OPT_ORDER, array() );
		return is_array( $order ) ? array_values( array_map( 'intval', $order ) ) : array();
	}

	/** Published projects from the saved order. */
	public static function visible_ids() {
		return array_values(
			array_filter(
				self::get_order(),
				static function ( $id ) {
					return PLD_CPT === get_post_type( $id ) && 'publish' === get_post_status( $id );
				}
			)
		);
	}

	public static function card( $id, $eager = false ) {
		$thumb = get_post_thumbnail_id( $id );
		$img   = $thumb
			? wp_get_attachment_image(
				$thumb,
				'pld-card',
				false,
				array(
					'loading'  => $eager ? 'eager' : 'lazy',
					'decoding' => 'async',
				)
			)
			: '<span class="pld-card__noimg"></span>';
		return sprintf(
			'<article class="pld-card"><a href="%1$s"><span class="pld-card__img">%2$s</span><h3 class="pld-card__title">%3$s</h3></a></article>',
			esc_url( get_permalink( $id ) ),
			$img,
			esc_html( get_the_title( $id ) )
		);
	}

	public static function cards( $ids, $first_eager = 0 ) {
		$html = '';
		foreach ( $ids as $i => $id ) {
			$html .= self::card( $id, $i < $first_eager );
		}
		return $html;
	}

	public static function hero() {
		$o = get_option( self::OPT_HERO, array() );
		return array(
			'images' => ! empty( $o['images'] ) && is_array( $o['images'] ) ? array_values( array_map( 'absint', $o['images'] ) ) : array(),
			'height' => ! empty( $o['height'] ) ? $o['height'] : '25vw',
			'spacer' => isset( $o['spacer'] ) ? absint( $o['spacer'] ) : 0, // px of empty space above the hero
		);
	}

	private static function hero_html() {
		$h      = self::hero();
		$spacer = $h['spacer'] ? '<div class="pld-works-spacer" style="height:' . (int) $h['spacer'] . 'px" aria-hidden="true"></div>' : '';
		if ( ! $h['images'] ) {
			return $spacer;
		}
		return $spacer . '<div class="pld-works-hero">' . PLD_Components::render(
			array( 'type' => 'hero', 'images' => $h['images'], 'height' => $h['height'], 'duration' => '5', 'title' => '' )
		) . '</div>';
	}

	public static function shortcode() {
		PLD_Project::enqueue_front();
		$ids   = self::visible_ids();
		$batch = self::batch_size();
		$heading = '<h1 class="pld-works-title">' . esc_html( get_the_title() ) . '</h1>';
		if ( ! $ids ) {
			return self::hero_html() . '<div class="pld-works">' . $heading . '<p class="pld-empty">' . esc_html__( 'No projects yet.', 'pld-work' ) . '</p></div>';
		}
		$first = array_slice( $ids, 0, $batch );
		$more  = count( $ids ) > $batch;

		return self::hero_html() . '<div class="pld-works" data-offset="' . (int) count( $first ) . '" data-done="' . ( $more ? '0' : '1' ) . '">' . $heading
			. '<div class="pld-grid">' . self::cards( $first, 3 ) . '</div>'
			. ( $more ? '<div class="pld-sentinel" aria-hidden="true"><span class="pld-spinner"></span></div>'
				. '<noscript><style>.pld-sentinel{display:none}</style></noscript>' : '' )
			. '</div>';
	}

	public static function register_rest() {
		register_rest_route(
			'pld/v1',
			'/works',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => array( __CLASS__, 'rest_works' ),
				'args'                => array(
					'offset' => array( 'sanitize_callback' => 'absint', 'default' => 0 ),
				),
			)
		);
	}

	public static function rest_works( WP_REST_Request $req ) {
		$ids    = self::visible_ids();
		$offset = (int) $req->get_param( 'offset' );
		$slice  = array_slice( $ids, $offset, self::batch_size() );
		$next   = $offset + count( $slice );
		return rest_ensure_response(
			array(
				'html'   => self::cards( $slice ),
				'offset' => $next,
				'done'   => $next >= count( $ids ),
			)
		);
	}
}
