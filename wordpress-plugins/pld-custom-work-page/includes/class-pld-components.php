<?php
defined( 'ABSPATH' ) || exit;

/**
 * Component schema, sanitising and front-end rendering.
 */
class PLD_Components {

	public static function animations() {
		return array(
			'fade-up'     => __( 'Fade up', 'pld-work' ),
			'fade-in'     => __( 'Fade in', 'pld-work' ),
			'slide-left'  => __( 'Slide from left', 'pld-work' ),
			'slide-right' => __( 'Slide from right', 'pld-work' ),
			'zoom-in'     => __( 'Zoom in', 'pld-work' ),
			'reveal'      => __( 'Image reveal (wipe)', 'pld-work' ),
			'none'        => __( 'None', 'pld-work' ),
		);
	}

	/**
	 * Field types: text, textarea, select, image (attachment id), gallery (ids).
	 */
	public static function schema() {
		$anim = array(
			'key'     => 'animation',
			'type'    => 'select',
			'label'   => __( 'Animation', 'pld-work' ),
			'options' => self::animations(),
			'default' => 'fade-up',
		);

		return array(
			'hero'       => array(
				'label'  => __( 'Hero', 'pld-work' ),
				'fields' => array(
					array( 'key' => 'image', 'type' => 'image', 'label' => __( 'Background image', 'pld-work' ) ),
					array( 'key' => 'title', 'type' => 'text', 'label' => __( 'Title (empty = project title)', 'pld-work' ) ),
					array( 'key' => 'subtitle', 'type' => 'text', 'label' => __( 'Subtitle', 'pld-work' ) ),
					array(
						'key'     => 'height',
						'type'    => 'select',
						'label'   => __( 'Height', 'pld-work' ),
						'options' => array( '60' => '60%', '80' => '80%', '100' => '100%' ),
						'default' => '80',
					),
					array_merge( $anim, array( 'default' => 'fade-in' ) ),
				),
			),
			'info'       => array(
				'label'  => __( 'Project info', 'pld-work' ),
				'fields' => array(
					array(
						'key'   => 'items',
						'type'  => 'textarea',
						'label' => __( 'One per line as "Label: Value" (e.g. Year: 2026)', 'pld-work' ),
					),
					$anim,
				),
			),
			'text'       => array(
				'label'  => __( 'Text', 'pld-work' ),
				'fields' => array(
					array( 'key' => 'heading', 'type' => 'text', 'label' => __( 'Heading', 'pld-work' ) ),
					array( 'key' => 'body', 'type' => 'textarea', 'label' => __( 'Text (basic HTML allowed)', 'pld-work' ) ),
					array(
						'key'     => 'align',
						'type'    => 'select',
						'label'   => __( 'Alignment', 'pld-work' ),
						'options' => array( 'left' => __( 'Left', 'pld-work' ), 'center' => __( 'Center', 'pld-work' ) ),
						'default' => 'left',
					),
					$anim,
				),
			),
			'image'      => array(
				'label'  => __( 'Full image', 'pld-work' ),
				'fields' => array(
					array( 'key' => 'image', 'type' => 'image', 'label' => __( 'Image', 'pld-work' ) ),
					array( 'key' => 'caption', 'type' => 'text', 'label' => __( 'Caption', 'pld-work' ) ),
					array(
						'key'     => 'width',
						'type'    => 'select',
						'label'   => __( 'Width', 'pld-work' ),
						'options' => array( 'full' => __( 'Full width', 'pld-work' ), 'contained' => __( 'Contained', 'pld-work' ) ),
						'default' => 'full',
					),
					array_merge( $anim, array( 'default' => 'reveal' ) ),
				),
			),
			'image_text' => array(
				'label'  => __( 'Image + text', 'pld-work' ),
				'fields' => array(
					array( 'key' => 'image', 'type' => 'image', 'label' => __( 'Image', 'pld-work' ) ),
					array( 'key' => 'heading', 'type' => 'text', 'label' => __( 'Heading', 'pld-work' ) ),
					array( 'key' => 'body', 'type' => 'textarea', 'label' => __( 'Text (basic HTML allowed)', 'pld-work' ) ),
					array(
						'key'     => 'side',
						'type'    => 'select',
						'label'   => __( 'Image side', 'pld-work' ),
						'options' => array( 'left' => __( 'Left', 'pld-work' ), 'right' => __( 'Right', 'pld-work' ) ),
						'default' => 'left',
					),
					$anim,
				),
			),
			'gallery'    => array(
				'label'  => __( 'Gallery', 'pld-work' ),
				'fields' => array(
					array( 'key' => 'images', 'type' => 'gallery', 'label' => __( 'Images', 'pld-work' ) ),
					array(
						'key'     => 'columns',
						'type'    => 'select',
						'label'   => __( 'Columns', 'pld-work' ),
						'options' => array( '1' => '1', '2' => '2', '3' => '3', '4' => '4' ),
						'default' => '2',
					),
					$anim,
				),
			),
			'video'      => array(
				'label'  => __( 'Video', 'pld-work' ),
				'fields' => array(
					array( 'key' => 'url', 'type' => 'text', 'label' => __( 'YouTube / Vimeo / video URL', 'pld-work' ) ),
					array( 'key' => 'caption', 'type' => 'text', 'label' => __( 'Caption', 'pld-work' ) ),
					$anim,
				),
			),
			'quote'      => array(
				'label'  => __( 'Quote', 'pld-work' ),
				'fields' => array(
					array( 'key' => 'quote', 'type' => 'textarea', 'label' => __( 'Quote', 'pld-work' ) ),
					array( 'key' => 'author', 'type' => 'text', 'label' => __( 'Author', 'pld-work' ) ),
					$anim,
				),
			),
		);
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

	private static function img( $id, $size = 'full', $eager = false, $extra = array() ) {
		if ( ! $id ) {
			return '';
		}
		$attr = array_merge(
			array(
				'loading'  => $eager ? 'eager' : 'lazy',
				'decoding' => 'async',
			),
			$extra
		);
		return wp_get_attachment_image( $id, $size, false, $attr );
	}

	private static function wrap( $comp, $classes, $inner ) {
		$anim = isset( $comp['animation'] ) ? $comp['animation'] : 'fade-up';
		return sprintf(
			'<section class="pld-c pld-c--%1$s %2$s" data-pld-anim="%3$s">%4$s</section>',
			esc_attr( $comp['type'] ),
			esc_attr( $classes ),
			esc_attr( $anim ),
			$inner
		);
	}

	public static function render( $comp, $post_id = 0 ) {
		$type = $comp['type'];

		switch ( $type ) {
			case 'hero':
				$title = ! empty( $comp['title'] ) ? $comp['title'] : get_the_title( $post_id );
				$inner = '<div class="pld-hero__bg" data-pld-parallax>' . self::img( $comp['image'], 'full', true ) . '</div>'
					. '<div class="pld-hero__txt"><h1 class="pld-hero__title">' . esc_html( $title ) . '</h1>'
					. ( $comp['subtitle'] ? '<p class="pld-hero__sub">' . esc_html( $comp['subtitle'] ) . '</p>' : '' )
					. '</div>';
				return self::wrap( $comp, 'pld-hero--h' . (int) $comp['height'], $inner );

			case 'info':
				$rows = '';
				foreach ( preg_split( '/\r\n|\r|\n/', wp_strip_all_tags( $comp['items'] ) ) as $line ) {
					if ( false === strpos( $line, ':' ) ) {
						continue;
					}
					list( $k, $v ) = array_map( 'trim', explode( ':', $line, 2 ) );
					if ( '' === $k && '' === $v ) {
						continue;
					}
					$rows .= '<div class="pld-info__item"><dt>' . esc_html( $k ) . '</dt><dd>' . esc_html( $v ) . '</dd></div>';
				}
				return $rows ? self::wrap( $comp, '', '<dl class="pld-info">' . $rows . '</dl>' ) : '';

			case 'text':
				$inner = ( $comp['heading'] ? '<h2>' . esc_html( $comp['heading'] ) . '</h2>' : '' )
					. '<div class="pld-text__body">' . wpautop( $comp['body'] ) . '</div>';
				return self::wrap( $comp, 'pld-align-' . $comp['align'], '<div class="pld-inner">' . $inner . '</div>' );

			case 'image':
				if ( ! $comp['image'] ) {
					return '';
				}
				$inner = '<figure class="pld-fig">' . self::img( $comp['image'] )
					. ( $comp['caption'] ? '<figcaption>' . esc_html( $comp['caption'] ) . '</figcaption>' : '' ) . '</figure>';
				return self::wrap( $comp, 'pld-w-' . $comp['width'], $inner );

			case 'image_text':
				$img  = '<div class="pld-it__img">' . self::img( $comp['image'] ) . '</div>';
				$txt  = '<div class="pld-it__txt">' . ( $comp['heading'] ? '<h2>' . esc_html( $comp['heading'] ) . '</h2>' : '' )
					. wpautop( $comp['body'] ) . '</div>';
				$body = 'right' === $comp['side'] ? $txt . $img : $img . $txt;
				return self::wrap( $comp, 'pld-side-' . $comp['side'], '<div class="pld-inner pld-it">' . $body . '</div>' );

			case 'gallery':
				$items = '';
				foreach ( $comp['images'] as $i => $id ) {
					$items .= '<div class="pld-gal__item" style="--pld-i:' . (int) $i . '">' . self::img( $id ) . '</div>';
				}
				return $items ? self::wrap( $comp, '', '<div class="pld-inner pld-gal pld-cols-' . (int) $comp['columns'] . '">' . $items . '</div>' ) : '';

			case 'video':
				if ( ! $comp['url'] ) {
					return '';
				}
				$embed = wp_oembed_get( $comp['url'] );
				if ( ! $embed ) {
					$embed = wp_video_shortcode( array( 'src' => $comp['url'] ) );
				}
				$inner = '<div class="pld-inner"><div class="pld-video">' . $embed . '</div>'
					. ( $comp['caption'] ? '<p class="pld-cap">' . esc_html( $comp['caption'] ) . '</p>' : '' ) . '</div>';
				return self::wrap( $comp, '', $inner );

			case 'quote':
				if ( ! $comp['quote'] ) {
					return '';
				}
				$inner = '<blockquote class="pld-quote"><div>' . wp_kses_post( $comp['quote'] ) . '</div>'
					. ( $comp['author'] ? '<cite>' . esc_html( $comp['author'] ) . '</cite>' : '' ) . '</blockquote>';
				return self::wrap( $comp, '', '<div class="pld-inner">' . $inner . '</div>' );
		}
		return '';
	}
}
