<?php
defined( 'ABSPATH' ) || exit;

/**
 * Makes project pages look like the normal pages of an Astra + "Header Footer Elementor" site.
 *
 * When an Elementor header template is available, the project template renders the same page skeleton
 * as the site's Elementor pages (header template, #content/.ast-container, footer template) itself, so
 * it never depends on how the theme prints its own header.
 */
class PLD_Theme {

	const OPT_HF = 'pld_hf'; // array( 'header' => 'auto'|'theme'|<id>, 'footer' => ... )

	private static $cache = array();

	public static function init() {
		add_filter( 'astra_page_layout', array( __CLASS__, 'layout' ), 99 );
		add_filter( 'astra_get_content_layout', array( __CLASS__, 'content_layout' ), 99 );
		add_filter( 'body_class', array( __CLASS__, 'body_class' ), 99 );
		add_action( 'wp_head', array( __CLASS__, 'css' ), 99 );
	}

	public static function style() {
		$o = get_option( 'pld_style', array() );
		return array(
			'text'  => ! empty( $o['text'] ) ? $o['text'] : '#6b5a4d',
			'label' => ! empty( $o['label'] ) ? $o['label'] : '#3b2f28',
		);
	}

	private static function is_project() {
		return is_singular( PLD_CPT );
	}

	public static function layout( $layout ) {
		return self::is_project() ? 'no-sidebar' : $layout;
	}

	public static function content_layout( $layout ) {
		return self::is_project() ? 'page-builder' : $layout;
	}

	/* ------------------------------------------------ header / footer templates */

	public static function available() {
		return class_exists( '\Elementor\Plugin' ) && post_type_exists( 'elementor-hf' );
	}

	/** Header / footer templates created with Header Footer Elementor: id => title. */
	public static function templates( $kind ) {
		if ( ! self::available() ) {
			return array();
		}
		$posts = get_posts(
			array(
				'post_type'      => 'elementor-hf',
				'post_status'    => 'publish',
				'posts_per_page' => 50,
				'orderby'        => 'ID',
				'order'          => 'ASC',
				'no_found_rows'  => true,
				'meta_query'     => array( array( 'key' => 'ehf_template_type', 'value' => 'type_' . $kind ) ), // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
		$out = array();
		foreach ( $posts as $p ) {
			$out[ $p->ID ] = get_the_title( $p ) . ' (#' . $p->ID . ')';
		}
		return $out;
	}

	public static function setting( $kind ) {
		$o = get_option( self::OPT_HF, array() );
		return isset( $o[ $kind ] ) ? $o[ $kind ] : 'auto';
	}

	/** Template id to use for 'header' | 'footer', or 0 to use the theme's own. */
	public static function template_id( $kind ) {
		if ( isset( self::$cache[ $kind ] ) ) {
			return self::$cache[ $kind ];
		}
		$id  = 0;
		$set = self::setting( $kind );
		if ( self::available() && 'theme' !== $set ) {
			if ( ctype_digit( (string) $set ) && (int) $set > 0 ) {
				$id = (int) $set;
			} else {
				$fn = 'get_hfe_' . $kind . '_id'; // site's own display rules first.
				if ( function_exists( $fn ) ) {
					$id = (int) $fn();
				}
				if ( ! $id ) {
					$all = array_keys( self::templates( $kind ) );
					$id  = $all ? (int) $all[0] : 0;
				}
			}
			$id = (int) apply_filters( 'pld_' . $kind . '_template_id', $id );
		}
		self::$cache[ $kind ] = $id;
		return $id;
	}

	/** True when the project page prints its own Elementor header (full page skeleton). */
	public static function canvas() {
		return (bool) self::template_id( 'header' );
	}

	/** Rendered template markup; call before wp_head() so Elementor's CSS is enqueued in time. */
	public static function render( $kind ) {
		$id = self::template_id( $kind );
		if ( ! $id ) {
			return '';
		}
		$html = \Elementor\Plugin::instance()->frontend->get_builder_content_for_display( $id );
		if ( 'header' === $kind ) {
			return '<header id="masthead" itemscope="itemscope" itemtype="https://schema.org/WPHeader"><p class="main-title bhf-hidden" itemprop="headline"><a href="'
				. esc_url( home_url( '/' ) ) . '" rel="home">' . esc_html( get_bloginfo( 'name' ) ) . '</a></p>' . $html . '</header>';
		}
		return '<footer itemtype="https://schema.org/WPFooter" itemscope="itemscope" id="colophon" role="contentinfo"><div class="footer-width-fixer">' . $html . '</div></footer>';
	}

	public static function body_class( $classes ) {
		if ( ! self::is_project() ) {
			return $classes;
		}
		$classes = array_diff( $classes, array( 'ast-right-sidebar', 'ast-left-sidebar', 'ast-separate-container', 'ast-two-container' ) );
		$classes = array_merge( $classes, array( 'ast-page-builder-template', 'ast-no-sidebar', 'pld-project-page' ) );
		if ( self::canvas() ) {
			$classes[] = 'ehf-header';
			$classes[] = 'ehf-template-' . get_template();
			$classes[] = 'ehf-stylesheet-' . get_stylesheet();
			if ( self::template_id( 'footer' ) ) {
				$classes[] = 'ehf-footer';
			}
		}
		return array_values( array_unique( $classes ) );
	}

	public static function css() {
		if ( ! self::is_project() ) {
			return;
		}
		$st  = self::style();
		$css = ':root{--pld-text:' . $st['text'] . ';--pld-label:' . $st['label'] . '}.pld-project-page .site-content>.ast-container{max-width:100%;padding:0;display:block}.pld-project-page #primary{margin:0;padding:0;width:100%}';
		echo '<style id="pld-theme-fix">' . $css . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput
	}
}
