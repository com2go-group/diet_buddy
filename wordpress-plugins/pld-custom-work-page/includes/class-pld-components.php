<?php
defined( 'ABSPATH' ) || exit;

/**
 * Component schema, sanitising and front-end rendering.
 *
 * Layout and animations follow the reference project page (periclesliatsos.com/sample-project):
 * fading full-height hero, 2/3 text + 1/3 image sections, 3-image rows, closing spacer.
 */
class PLD_Components {

	/** Same motion vocabulary as the reference page (Elementor-style entrance animations). */
	public static function animations() {
		return array(
			'fade-up'     => __( 'Fade in up', 'pld-work' ),
			'fade-in'     => __( 'Fade in', 'pld-work' ),
			'fade-right'  => __( 'Fade in right', 'pld-work' ),
			'fade-left'   => __( 'Fade in left', 'pld-work' ),
			'slide-up'    => __( 'Slide in up', 'pld-work' ),
			'slide-right' => __( 'Slide in right', 'pld-work' ),
			'slide-left'  => __( 'Slide in left', 'pld-work' ),
			'zoom-in'     => __( 'Zoom in', 'pld-work' ),
			'none'        => __( 'None', 'pld-work' ),
		);
	}

	private static function anim( $key, $label, $default ) {
		return array(
			'key'     => $key,
			'type'    => 'select',
			'label'   => $label,
			'options' => self::animations(),
			'default' => $default,
		);
	}

	/**
	 * Field types: text, inline (text + <strong>/<em>/<br>), textarea, select, image (attachment id), gallery (ids).
	 */
	public static function schema() {
		return array(
			'hero'       => array(
				'label'  => __( 'Hero slideshow', 'pld-work' ),
				'fields' => array(
					array( 'key' => 'images', 'type' => 'gallery', 'label' => __( 'Background images (several = fading slideshow)', 'pld-work' ) ),
					array(
						'key'     => 'height',
						'type'    => 'select',
						'label'   => __( 'Height', 'pld-work' ),
						'options' => array( '100' => '100% of screen', '85' => '85% of screen', '70' => '70% of screen', '50' => '50% of screen' ),
						'default' => '100',
					),
					array(
						'key'     => 'duration',
						'type'    => 'select',
						'label'   => __( 'Seconds per slide', 'pld-work' ),
						'options' => array( '3' => '3', '5' => '5', '8' => '8', '12' => '12' ),
						'default' => '5',
					),
					array( 'key' => 'title', 'type' => 'inline', 'label' => __( 'Overlay title (optional)', 'pld-work' ) ),
				),
			),
			'text_image' => array(
				'label'  => __( 'Text + image (2/3 · 1/3)', 'pld-work' ),
				'fields' => array(
					array( 'key' => 'title', 'type' => 'inline', 'label' => __( 'Title (use <strong>Bold</strong> for the highlighted word)', 'pld-work' ) ),
					array( 'key' => 'body', 'type' => 'textarea', 'label' => __( 'Text — blank line = new paragraph. Basic HTML allowed, e.g. <strong>Scope of work</strong> …', 'pld-work' ) ),
					array( 'key' => 'image', 'type' => 'image', 'label' => __( 'Image', 'pld-work' ) ),
					array(
						'key'     => 'side',
						'type'    => 'select',
						'label'   => __( 'Image side', 'pld-work' ),
						'options' => array( 'right' => __( 'Right', 'pld-work' ), 'left' => __( 'Left', 'pld-work' ) ),
						'default' => 'right',
					),
					array(
						'key'     => 'ratio',
						'type'    => 'select',
						'label'   => __( 'Column ratio', 'pld-work' ),
						'options' => array( '2-1' => '2/3 · 1/3', '1-1' => '1/2 · 1/2' ),
						'default' => '2-1',
					),
					self::anim( 'title_anim', __( 'Title animation', 'pld-work' ), 'fade-up' ),
					self::anim( 'text_anim', __( 'Text animation', 'pld-work' ), 'slide-up' ),
					self::anim( 'image_anim', __( 'Image animation', 'pld-work' ), 'fade-right' ),
				),
			),
			'image_row'  => array(
				'label'  => __( 'Image row', 'pld-work' ),
				'fields' => array(
					array( 'key' => 'images', 'type' => 'gallery', 'label' => __( 'Images', 'pld-work' ) ),
					array(
						'key'     => 'columns',
						'type'    => 'select',
						'label'   => __( 'Images per row', 'pld-work' ),
						'options' => array( '1' => '1', '2' => '2', '3' => '3', '4' => '4' ),
						'default' => '3',
					),
					self::anim( 'animation', __( 'Animation (each image)', 'pld-work' ), 'slide-right' ),
				),
			),
			'text'       => array(
				'label'  => __( 'Text', 'pld-work' ),
				'fields' => array(
					array( 'key' => 'title', 'type' => 'inline', 'label' => __( 'Heading', 'pld-work' ) ),
					array( 'key' => 'body', 'type' => 'textarea', 'label' => __( 'Text (basic HTML allowed)', 'pld-work' ) ),
					array(
						'key'     => 'align',
						'type'    => 'select',
						'label'   => __( 'Alignment', 'pld-work' ),
						'options' => array( 'left' => __( 'Left', 'pld-work' ), 'center' => __( 'Center', 'pld-work' ) ),
						'default' => 'left',
					),
					self::anim( 'animation', __( 'Animation', 'pld-work' ), 'slide-up' ),
				),
			),
			'image'      => array(
				'label'  => __( 'Full image', 'pld-work' ),
				'fields' => array(
					array( 'key' => 'image', 'type' => 'image', 'label' => __( 'Image', 'pld-work' ) ),
					array( 'key' => 'caption', 'type' => 'text', 'label' => __( 'Caption', 'pld-work' ) ),
					self::anim( 'animation', __( 'Animation', 'pld-work' ), 'fade-up' ),
				),
			),
			'video'      => array(
				'label'  => __( 'Video', 'pld-work' ),
				'fields' => array(
					array( 'key' => 'url', 'type' => 'text', 'label' => __( 'YouTube / Vimeo / video URL', 'pld-work' ) ),
					array( 'key' => 'caption', 'type' => 'text', 'label' => __( 'Caption', 'pld-work' ) ),
					self::anim( 'animation', __( 'Animation', 'pld-work' ), 'fade-up' ),
				),
			),
			'quote'      => array(
				'label'  => __( 'Quote', 'pld-work' ),
				'fields' => array(
					array( 'key' => 'quote', 'type' => 'textarea', 'label' => __( 'Quote', 'pld-work' ) ),
					array( 'key' => 'author', 'type' => 'text', 'label' => __( 'Author', 'pld-work' ) ),
					self::anim( 'animation', __( 'Animation', 'pld-work' ), 'fade-up' ),
				),
			),
			'spacer'     => array(
				'label'  => __( 'Spacer', 'pld-work' ),
				'fields' => array(
					array(
						'key'     => 'height',
						'type'    => 'select',
						'label'   => __( 'Height', 'pld-work' ),
						'options' => array( '40' => '40px', '80' => '80px', '120' => '120px', '200' => '200px', '300' => '300px' ),
						'default' => '120',
					),
				),
			),
		);
	}

	private static function inline_kses( $s ) {
		return wp_kses( (string) $s, array( 'strong' => array(), 'b' => array(), 'em' => array(), 'br' => array() ) );
	}

	/**
	 * Sanitise a list of components coming from the admin form.
	 */
	public static function sanitize( $raw ) {
		if ( is_string( $raw ) ) {
			$raw = json_decode( wp_unslash( $raw ), true );
		}
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$schema = self::schema();
		$out    = array();

		foreach ( $raw as $comp ) {
			if ( ! is_array( $comp ) || empty( $comp['type'] ) || ! isset( $schema[ $comp['type'] ] ) ) {
				continue;
			}
			$clean = array( 'type' => $comp['type'] );
			foreach ( $schema[ $comp['type'] ]['fields'] as $f ) {
				$v = isset( $comp[ $f['key'] ] ) ? $comp[ $f['key'] ] : '';
				switch ( $f['type'] ) {
					case 'textarea':
						$v = wp_kses_post( (string) $v );
						break;
					case 'inline':
						$v = self::inline_kses( $v );
						break;
					case 'select':
						$v = ( is_scalar( $v ) && isset( $f['options'][ (string) $v ] ) )
							? (string) $v
							: ( isset( $f['default'] ) ? $f['default'] : key( $f['options'] ) );
						break;
					case 'image':
						$v = absint( $v );
						break;
					case 'gallery':
						$v = array_values( array_filter( array_map( 'absint', is_array( $v ) ? $v : array() ) ) );
						break;
					default:
						$v = sanitize_text_field( (string) $v );
				}
				$clean[ $f['key'] ] = $v;
			}
			$out[] = $clean;
		}
		return $out;
	}

	public static function get( $post_id ) {
		$data = get_post_meta( $post_id, PLD_META, true );
		return is_array( $data ) ? $data : array();
	}

	/* --------------------------------------------------------------- render */

	public static function render_all( $post_id ) {
		$html = '';
		foreach ( self::get( $post_id ) as $comp ) {
			$html .= self::render( $comp, $post_id );
		}
		return $html;
	}

	private static function img( $id, $eager = false, $size = 'full', $extra = array() ) {
		if ( ! $id ) {
			return '';
		}
		return wp_get_attachment_image(
			$id,
			$size,
			false,
			array_merge( array( 'loading' => $eager ? 'eager' : 'lazy', 'decoding' => 'async' ), $extra )
		);
	}

	/** data attribute for the entrance animation (empty when none). */
	private static function a( $comp, $key = 'animation' ) {
		$v = isset( $comp[ $key ] ) ? $comp[ $key ] : '';
		return ( $v && 'none' !== $v ) ? ' data-pld-anim="' . esc_attr( $v ) . '"' : '';
	}

	public static function render( $comp, $post_id = 0 ) {
		switch ( $comp['type'] ) {

			case 'hero':
				if ( empty( $comp['images'] ) ) {
					return '';
				}
				$slides = '';
				foreach ( $comp['images'] as $i => $id ) {
					$slides .= '<div class="pld-slide' . ( 0 === $i ? ' is-active' : '' ) . '">' . self::img( $id, 0 === $i ) . '</div>';
				}
				$title = $comp['title'] ? '<div class="pld-hero__txt"><h1 class="pld-hero__title">' . $comp['title'] . '</h1></div>' : '';
				return sprintf(
					'<section class="pld-c pld-c--hero pld-hero--h%1$d" data-pld-slideshow data-duration="%2$d"><div class="pld-slides">%3$s</div>%4$s</section>',
					(int) $comp['height'],
					max( 1, (int) $comp['duration'] ) * 1000,
					$slides,
					$title
				);

			case 'text_image':
				$text  = '';
				$text .= $comp['title'] ? '<h2 class="pld-ti__title"' . self::a( $comp, 'title_anim' ) . '>' . $comp['title'] . '</h2>' : '';
				$text .= $comp['body'] ? '<div class="pld-ti__body"' . self::a( $comp, 'text_anim' ) . '>' . wpautop( $comp['body'] ) . '</div>' : '';
				$img   = $comp['image'] ? '<div class="pld-ti__img"' . self::a( $comp, 'image_anim' ) . '>' . self::img( $comp['image'] ) . '</div>' : '';
				if ( 'left' === $comp['side'] ) {
					$inner = '<div class="pld-ti__col pld-ti__col--img">' . $img . '</div><div class="pld-ti__col pld-ti__col--text">' . $text . '</div>';
				} else {
					$inner = '<div class="pld-ti__col pld-ti__col--text">' . $text . '</div><div class="pld-ti__col pld-ti__col--img">' . $img . '</div>';
				}
				return '<section class="pld-c pld-c--text_image pld-ratio-' . esc_attr( $comp['ratio'] ) . '">' . $inner . '</section>';

			case 'image_row':
				$items = '';
				foreach ( $comp['images'] as $id ) {
					$items .= '<div class="pld-row__item"' . self::a( $comp ) . '>' . self::img( $id ) . '</div>';
				}
				return $items ? '<section class="pld-c pld-c--image_row pld-cols-' . (int) $comp['columns'] . '">' . $items . '</section>' : '';

			case 'text':
				$inner = ( $comp['title'] ? '<h2>' . $comp['title'] . '</h2>' : '' ) . wpautop( $comp['body'] );
				return '<section class="pld-c pld-c--text pld-align-' . esc_attr( $comp['align'] ) . '"><div class="pld-narrow"' . self::a( $comp ) . '>' . $inner . '</div></section>';

			case 'image':
				if ( ! $comp['image'] ) {
					return '';
				}
				return '<section class="pld-c pld-c--image"><figure class="pld-fig"' . self::a( $comp ) . '>' . self::img( $comp['image'] )
					. ( $comp['caption'] ? '<figcaption>' . esc_html( $comp['caption'] ) . '</figcaption>' : '' ) . '</figure></section>';

			case 'video':
				if ( ! $comp['url'] ) {
					return '';
				}
				$embed = wp_oembed_get( $comp['url'] );
				if ( ! $embed ) {
					$embed = wp_video_shortcode( array( 'src' => $comp['url'] ) );
				}
				return '<section class="pld-c pld-c--video"><div class="pld-narrow"' . self::a( $comp ) . '><div class="pld-video">' . $embed . '</div>'
					. ( $comp['caption'] ? '<p class="pld-cap">' . esc_html( $comp['caption'] ) . '</p>' : '' ) . '</div></section>';

			case 'quote':
				if ( ! $comp['quote'] ) {
					return '';
				}
				return '<section class="pld-c pld-c--quote"><blockquote class="pld-quote"' . self::a( $comp ) . '><div>' . wp_kses_post( $comp['quote'] ) . '</div>'
					. ( $comp['author'] ? '<cite>' . esc_html( $comp['author'] ) . '</cite>' : '' ) . '</blockquote></section>';

			case 'spacer':
				return '<div class="pld-c pld-c--spacer" style="height:' . (int) $comp['height'] . 'px" aria-hidden="true"></div>';
		}
		return '';
	}
}
