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

	const COLS     = 3;
	const OPT_ROWS = 'pld_works_rows'; // rows per page (3 projects per row)
	const OPT_GRID = 'pld_works_grid'; // array( 'height' => px, 'anim' => key )

	public static function rows() {
		return min( 10, max( 1, (int) get_option( self::OPT_ROWS, 5 ) ) );
	}

	/** Projects per page: rows x 3 (default 5 x 3 = 15). */
	public static function per_page() {
		return self::rows() * self::grid()['cols'];
	}

	public static function animations() {
		return array(
			'fade-up'     => __( 'Fade in up', 'pld-work' ),
			'slide-right' => __( 'Slide in from right', 'pld-work' ),
			'zoom-in'     => __( 'Zoom in', 'pld-work' ),
			'reveal'      => __( 'Reveal (wipe up)', 'pld-work' ),
			'none'        => __( 'None', 'pld-work' ),
		);
	}

	/** Project image height (px; width stays 350) and the scroll animation of the project images. */
	public static function grid() {
		$o    = get_option( self::OPT_GRID, array() );
		$anim = isset( $o['anim'] ) ? $o['anim'] : 'fade-up';
		return array(
			'width'  => min( 2000, max( 100, ! empty( $o['width'] ) ? (int) $o['width'] : 350 ) ),
			'height' => min( 2000, max( 100, ! empty( $o['height'] ) ? (int) $o['height'] : 500 ) ),
			'cols'   => min( 4, max( 1, ! empty( $o['cols'] ) ? (int) $o['cols'] : 3 ) ),
			'anim'   => isset( self::animations()[ $anim ] ) ? $anim : 'fade-up',
		);
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

	public static function card( $id, $eager = false, $i = 0 ) {
		$thumb = get_post_thumbnail_id( $id );
		$g     = self::grid();
		$size  = $g['width'] > 1024 ? 'full' : ( $g['width'] > 350 ? 'large' : 'pld-card' ); // never upscale the 350x500 crop
		$img   = $thumb
			? wp_get_attachment_image(
				$thumb,
				$size,
				false,
				array(
					'loading'  => $eager ? 'eager' : 'lazy',
					'decoding' => 'async',
				)
			)
			: '<span class="pld-card__noimg"></span>';
		return sprintf(
			'<article class="pld-card" style="--i:' . (int) $i . '"><a href="%1$s"><span class="pld-card__img">%2$s</span><h3 class="pld-card__title">%3$s</h3></a></article>',
			esc_url( get_permalink( $id ) ),
			$img,
			esc_html( get_the_title( $id ) )
		);
	}

	public static function cards( $ids, $first_eager = 0 ) {
		$html = '';
		foreach ( $ids as $i => $id ) {
			$html .= self::card( $id, $i < $first_eager, $i );
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

	public static function current_page( $pages ) {
		$p = isset( $_GET['works_page'] ) ? absint( $_GET['works_page'] ) : 1; // phpcs:ignore WordPress.Security.NonceVerification
		return min( max( 1, $p ), max( 1, $pages ) );
	}

	private static function page_url( $n ) {
		$base = get_permalink();
		return $n > 1 ? add_query_arg( 'works_page', $n, $base ) : $base;
	}

	/** Previous (left) / Next (right) buttons at the bottom of the grid. */
	private static function pager_html( $page, $pages ) {
		if ( $pages < 2 ) {
			return '';
		}
		$prev = $page > 1;
		$next = $page < $pages;
		return '<nav class="pld-pager-works" aria-label="' . esc_attr__( 'Projects pages', 'pld-work' ) . '">'
			. '<a class="pld-btn pld-btn--prev' . ( $prev ? '' : ' is-off' ) . '" rel="prev" data-page="' . ( $prev ? $page - 1 : 0 ) . '" href="' . esc_url( self::page_url( max( 1, $page - 1 ) ) ) . '">' . esc_html__( 'Previous', 'pld-work' ) . '</a>'
			. '<span class="pld-pager-works__info">' . (int) $page . ' / ' . (int) $pages . '</span>'
			. '<a class="pld-btn pld-btn--next' . ( $next ? '' : ' is-off' ) . '" rel="next" data-page="' . ( $next ? $page + 1 : 0 ) . '" href="' . esc_url( self::page_url( min( $pages, $page + 1 ) ) ) . '">' . esc_html__( 'Next', 'pld-work' ) . '</a>'
			. '</nav>';
	}

	public static function shortcode() {
		PLD_Project::enqueue_front();
		$ids     = self::visible_ids();
		$g       = self::grid();
		$heading = '<h1 class="pld-works-title">' . esc_html( get_the_title() ) . '</h1>';
		if ( ! $ids ) {
			return self::hero_html() . '<div class="pld-works">' . $heading . '<p class="pld-empty">' . esc_html__( 'No projects yet.', 'pld-work' ) . '</p></div>';
		}
		$per   = self::per_page();
		$pages = (int) ceil( count( $ids ) / $per );
		$page  = self::current_page( $pages );
		$slice = array_slice( $ids, ( $page - 1 ) * $per, $per );

		return self::hero_html()
			. '<div class="pld-works" data-anim="' . esc_attr( $g['anim'] ) . '" data-cols="' . (int) $g['cols'] . '" data-page="' . (int) $page . '" data-pages="' . (int) $pages . '"'
			. ' style="--pld-cols:' . (int) $g['cols'] . ';--pld-card-w:' . (int) $g['width'] . 'px;--pld-card-ar:' . (int) $g['width'] . '/' . (int) $g['height'] . '">'
			. '<div class="pld-works__inner">'
			. $heading
			. '<div class="pld-grid">' . self::cards( $slice, $g['cols'] ) . '</div>'
			. self::pager_html( $page, $pages )
			. '</div></div>';
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
					'page' => array( 'sanitize_callback' => 'absint', 'default' => 1 ),
				),
			)
		);
	}

	public static function rest_works( WP_REST_Request $req ) {
		$ids   = self::visible_ids();
		$per   = self::per_page();
		$pages = max( 1, (int) ceil( count( $ids ) / $per ) );
		$page  = min( max( 1, (int) $req->get_param( 'page' ) ), $pages );
		return rest_ensure_response(
			array(
				'html'  => self::cards( array_slice( $ids, ( $page - 1 ) * $per, $per ) ),
				'page'  => $page,
				'pages' => $pages,
			)
		);
	}
}
