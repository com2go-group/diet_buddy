<?php
defined( 'ABSPATH' ) || exit;

/**
 * Makes project pages look like normal pages of an Astra + "Header Footer Elementor" site:
 * full-width page-builder layout, and the Elementor header/footer templates
 * (even when their display rules don't include the project post type).
 */
class PLD_Theme {

	private static $hfe_header = 0;
	private static $hfe_footer = 0;

	public static function init() {
		add_filter( 'astra_page_layout', array( __CLASS__, 'layout' ), 99 );
		add_filter( 'astra_get_content_layout', array( __CLASS__, 'content_layout' ), 99 );
		add_filter( 'body_class', array( __CLASS__, 'body_class' ), 99 );
		add_action( 'wp', array( __CLASS__, 'setup_hfe' ), 99 ); // after Header Footer Elementor's own `wp` hook.
		add_action( 'wp_head', array( __CLASS__, 'css' ), 99 );
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

	public static function body_class( $classes ) {
		if ( ! self::is_project() ) {
			return $classes;
		}
		$classes = array_diff( $classes, array( 'ast-right-sidebar', 'ast-left-sidebar', 'ast-separate-container', 'ast-two-container' ) );
		$classes = array_merge( $classes, array( 'ast-page-builder-template', 'ast-no-sidebar', 'pld-project-page' ) );
		if ( self::$hfe_header ) {
			$classes[] = 'ehf-header';
			$classes[] = 'ehf-template-' . get_template();
			$classes[] = 'ehf-stylesheet-' . get_stylesheet();
		}
		if ( self::$hfe_footer ) {
			$classes[] = 'ehf-footer';
		}
		return array_values( array_unique( $classes ) );
	}

	/** First published Header Footer Elementor template of a type ('type_header' | 'type_footer'). */
	private static function find_hfe( $type ) {
		$posts = get_posts(
			array(
				'post_type'      => 'elementor-hf',
				'post_status'    => 'publish',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'orderby'        => 'ID',
				'order'          => 'ASC',
				'no_found_rows'  => true,
				'meta_query'     => array( array( 'key' => 'ehf_template_type', 'value' => $type ) ), // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
		return $posts ? (int) $posts[0] : 0;
	}

	public static function setup_hfe() {
		if ( ! self::is_project() || ! class_exists( '\Elementor\Plugin' ) || ! post_type_exists( 'elementor-hf' ) ) {
			return;
		}

		// Header: only step in when HFE did not already take over for this post type.
		if ( ! function_exists( 'hfe_header_enabled' ) || ! hfe_header_enabled() ) {
			$id = (int) apply_filters( 'pld_header_template_id', self::find_hfe( 'type_header' ) );
			if ( $id ) {
				self::$hfe_header = $id;
				remove_action( 'astra_header', 'astra_header_markup' );
				add_action( 'astra_header', array( __CLASS__, 'render_header' ) );
			}
		}

		if ( ! function_exists( 'hfe_footer_enabled' ) || ! hfe_footer_enabled() ) {
			$id = (int) apply_filters( 'pld_footer_template_id', self::find_hfe( 'type_footer' ) );
			if ( $id ) {
				self::$hfe_footer = $id;
				remove_action( 'astra_footer', 'astra_footer_markup' );
				add_action( 'astra_footer', array( __CLASS__, 'render_footer' ) );
			}
		}
	}

	private static function content( $id ) {
		return \Elementor\Plugin::instance()->frontend->get_builder_content_for_display( $id );
	}

	public static function render_header() {
		echo '<header id="masthead" itemscope="itemscope" itemtype="https://schema.org/WPHeader">';
		echo '<p class="main-title bhf-hidden" itemprop="headline"><a href="' . esc_url( home_url( '/' ) ) . '" rel="home">' . esc_html( get_bloginfo( 'name' ) ) . '</a></p>';
		echo self::content( self::$hfe_header ); // phpcs:ignore WordPress.Security.EscapeOutput
		echo '</header>';
	}

	public static function render_footer() {
		echo '<footer itemtype="https://schema.org/WPFooter" itemscope="itemscope" id="colophon" role="contentinfo"><div class="footer-width-fixer">';
		echo self::content( self::$hfe_footer ); // phpcs:ignore WordPress.Security.EscapeOutput
		echo '</div></footer>';
	}

	/** Safety net: hide Astra's own header/footer if something still printed them next to ours. */
	public static function css() {
		if ( ! self::is_project() ) {
			return;
		}
		$css = '.pld-project-page .site-content>.ast-container{max-width:100%;padding:0;display:block}.pld-project-page #primary{margin:0;padding:0;width:100%}';
		if ( self::$hfe_header ) {
			$css .= '.pld-project-page #ast-desktop-header,.pld-project-page #ast-mobile-header{display:none!important}';
		}
		if ( self::$hfe_footer ) {
			$css .= '.pld-project-page footer.site-footer{display:none!important}';
		}
		echo '<style id="pld-theme-fix">' . $css . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput
	}
}
