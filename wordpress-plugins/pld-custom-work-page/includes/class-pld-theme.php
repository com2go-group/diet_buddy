<?php
defined( 'ABSPATH' ) || exit;

/**
 * Makes project pages behave like the normal pages of an Astra + "Header Footer Elementor" (HFE) site.
 *
 * HFE decides the header/footer per page with display rules that usually don't cover custom post types.
 * Instead of printing our own markup, the project page asks HFE itself (through its filters) to use the
 * site's header/footer template, so markup, CSS, JS and body classes are exactly those of other pages.
 */
class PLD_Theme {

	const OPT_HF = 'pld_hf'; // array( 'header' => 'auto'|'theme'|<id>, 'footer' => ... )

	public static function init() {
		add_filter( 'astra_page_layout', array( __CLASS__, 'layout' ), 99 );
		add_filter( 'astra_get_content_layout', array( __CLASS__, 'content_layout' ), 99 );
		add_filter( 'body_class', array( __CLASS__, 'body_class' ), 99 );
		add_action( 'wp_head', array( __CLASS__, 'css' ), 99 );

		// Header Footer Elementor's own switches (see hfe_header_enabled() / get_hfe_header_id()).
		add_filter( 'get_hfe_header_id', array( __CLASS__, 'header_id' ), 99 );
		add_filter( 'hfe_header_enabled', array( __CLASS__, 'header_enabled' ), 99 );
		add_filter( 'get_hfe_footer_id', array( __CLASS__, 'footer_id' ), 99 );
		add_filter( 'hfe_footer_enabled', array( __CLASS__, 'footer_enabled' ), 99 );
	}

	public static function style() {
		$o = get_option( 'pld_style', array() );
		return array(
			'text'  => ! empty( $o['text'] ) ? $o['text'] : '#6b5a4d',
			'label' => ! empty( $o['label'] ) ? $o['label'] : '#3b2f28',
			'title' => ! empty( $o['title'] ) ? (int) $o['title'] : 22,
			// 21px = the old 14px default + 50 %; a stored 14 is the old default, not a deliberate choice.
			'size'  => ( ! empty( $o['size'] ) && 14 !== (int) $o['size'] ) ? (int) $o['size'] : 21,
		);
	}

	private static function is_project() {
		return is_singular( PLD_CPT );
	}

	/** True on a normal page that contains the [pld_works] shortcode. */
	private static function is_works_page() {
		if ( ! is_singular( 'page' ) ) {
			return false;
		}
		$id = (int) get_option( PLD_OPT_PAGE );
		return ( $id && get_queried_object_id() === $id ) || has_shortcode( (string) get_post_field( 'post_content', get_queried_object_id() ), 'pld_works' );
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
		$args = array(
			'post_type'      => 'elementor-hf',
			'post_status'    => 'publish',
			'posts_per_page' => 50,
			'orderby'        => 'ID',
			'order'          => 'ASC',
			'no_found_rows'  => true,
		);
		$typed = get_posts( $args + array( 'meta_query' => array( array( 'key' => 'ehf_template_type', 'value' => 'type_' . $kind ) ) ) ); // phpcs:ignore WordPress.DB.SlowDBQuery
		if ( ! $typed ) { // unknown meta layout: fall back to the template's title.
			$typed = array_filter(
				get_posts( $args ),
				static function ( $p ) use ( $kind ) {
					return false !== stripos( $p->post_title, $kind );
				}
			);
		}
		$out = array();
		foreach ( $typed as $p ) {
			$out[ $p->ID ] = get_the_title( $p ) . ' (#' . $p->ID . ')';
		}
		return $out;
	}

	public static function setting( $kind ) {
		$o = get_option( self::OPT_HF, array() );
		return isset( $o[ $kind ] ) ? $o[ $kind ] : 'auto';
	}

	/**
	 * Template id to force for a project page, or 0 to leave HFE's own decision untouched.
	 * An explicit choice always wins; "automatic" only steps in when HFE's rules matched nothing.
	 */
	private static function forced( $kind, $current ) {
		if ( ! self::is_project() ) {
			return 0;
		}
		$set = self::setting( $kind );
		if ( 'theme' === $set ) {
			return 0;
		}
		if ( ctype_digit( (string) $set ) && (int) $set > 0 ) {
			return (int) $set;
		}
		if ( $current ) {
			return 0;
		}
		$all = array_keys( self::templates( $kind ) );
		return $all ? (int) $all[0] : 0;
	}

	public static function header_id( $id ) {
		$f = self::forced( 'header', $id );
		return $f ? $f : $id;
	}

	public static function footer_id( $id ) {
		$f = self::forced( 'footer', $id );
		return $f ? $f : $id;
	}

	public static function header_enabled( $status ) {
		return self::forced( 'header', $status ) ? true : $status;
	}

	public static function footer_enabled( $status ) {
		return self::forced( 'footer', $status ) ? true : $status;
	}

	/* ------------------------------------------------------------ body + css */

	public static function body_class( $classes ) {
		if ( self::is_works_page() ) {
			$classes[] = 'pld-works-page';
		}
		if ( ! self::is_project() ) {
			return $classes;
		}
		$classes = array_diff( $classes, array( 'ast-right-sidebar', 'ast-left-sidebar', 'ast-separate-container', 'ast-two-container' ) );
		$classes = array_merge( $classes, array( 'ast-page-builder-template', 'ast-no-sidebar', 'pld-project-page' ) );
		if ( class_exists( '\Elementor\Plugin' ) ) {
			// Elementor's global fonts/colours (used by the header template) are scoped to the kit class.
			$classes[] = 'elementor-default';
			$classes[] = 'elementor-template-full-width';
			$kit       = (int) get_option( 'elementor_active_kit' );
			if ( $kit ) {
				$classes[] = 'elementor-kit-' . $kit;
			}
		}
		return array_values( array_unique( $classes ) );
	}

	public static function css() {
		$st  = self::style();
		$css = ':root{--pld-text:' . $st['text'] . ';--pld-label:' . $st['label'] . ';--pld-text-size:' . (int) $st['size'] . 'px;--pld-title-size:' . (int) $st['title'] . 'px}';
		if ( self::is_project() ) {
			$css .= '.pld-project-page .site-content>.ast-container{max-width:100%;padding:0;display:block}.pld-project-page #primary{margin:0;padding:0;width:100%}';
		}
		if ( self::is_works_page() ) { // the heading is printed by the plugin, below the hero.
			$css .= '.pld-works-page .entry-header,.pld-works-page .ast-single-entry-banner,.pld-works-page .page-title{display:none}';
		}
		echo '<style id="pld-theme-fix">' . $css . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput
	}
}
