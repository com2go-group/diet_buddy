<?php
defined( 'ABSPATH' ) || exit;

/**
 * Project post type, component builder meta box and single project page.
 */
class PLD_Project {

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_cpt' ) );
		add_action( 'add_meta_boxes', array( __CLASS__, 'add_metabox' ) );
		add_action( 'save_post_' . PLD_CPT, array( __CLASS__, 'save' ), 10, 2 );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'admin_assets' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'front_assets' ) );
		add_filter( 'template_include', array( __CLASS__, 'template' ) );
		add_action( 'before_delete_post', array( __CLASS__, 'on_delete' ) );
		add_shortcode( 'pld_project', array( __CLASS__, 'shortcode' ) );
	}

	public static function register_cpt() {
		register_post_type(
			PLD_CPT,
			array(
				'labels'       => array(
					'name'               => __( 'Projects', 'pld-work' ),
					'singular_name'      => __( 'Project', 'pld-work' ),
					'add_new'            => __( 'Add project', 'pld-work' ),
					'add_new_item'       => __( 'Add new project', 'pld-work' ),
					'edit_item'          => __( 'Edit project', 'pld-work' ),
					'all_items'          => __( 'All projects', 'pld-work' ),
					'menu_name'          => __( 'PLD Works', 'pld-work' ),
					'featured_image'     => __( 'Master photo', 'pld-work' ),
					'set_featured_image' => __( 'Set master photo', 'pld-work' ),
				),
				'public'       => true,
				'show_in_rest' => false, // Classic editor + builder meta box.
				'menu_icon'    => 'dashicons-format-gallery',
				'supports'     => array( 'title', 'thumbnail', 'excerpt' ),
				'has_archive'  => false,
				'rewrite'      => array( 'slug' => 'project', 'with_front' => false ),
			)
		);
	}

	public static function add_metabox() {
		add_meta_box( 'pld_builder', __( 'Project page components', 'pld-work' ), array( __CLASS__, 'metabox' ), PLD_CPT, 'normal', 'high' );
	}

	public static function metabox( $post ) {
		wp_nonce_field( 'pld_save_project', 'pld_nonce' );
		echo '<p class="description">' . esc_html__( 'Add components, drag them (or use the arrows) to reorder. The master photo of the project is the featured image on the right.', 'pld-work' ) . '</p>';
		echo '<div id="pld-builder"></div>';
		echo '<input type="hidden" name="pld_components" id="pld-components-input" value="">';
		// Printing one (hidden) editor makes WordPress output the TinyMCE / Quicktags settings that
		// the builder's dynamically created editors reuse.
		echo '<div style="display:none">';
		wp_editor( '', 'pld_template_editor', array( 'media_buttons' => false, 'textarea_name' => 'pld_template_editor_unused', 'teeny' => false ) );
		echo '</div>';
	}

	public static function admin_assets( $hook ) {
		$screen = get_current_screen();
		if ( ! $screen || PLD_CPT !== $screen->post_type || ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
			return;
		}
		wp_enqueue_media();
		wp_enqueue_editor();
		wp_enqueue_script( 'jquery-ui-sortable' );
		wp_enqueue_style( 'pld-admin', PLD_URL . 'assets/css/admin.css', array(), PLD_VERSION );
		wp_enqueue_script( 'pld-builder', PLD_URL . 'assets/js/builder.js', array( 'jquery', 'jquery-ui-sortable', 'editor' ), PLD_VERSION, true );

		$components = PLD_Components::get( get_the_ID() );
		$thumbs     = array();
		foreach ( $components as $c ) {
			foreach ( array( 'image', 'images' ) as $k ) {
				if ( empty( $c[ $k ] ) ) {
					continue;
				}
				foreach ( (array) $c[ $k ] as $id ) {
					$url = wp_get_attachment_image_url( $id, 'thumbnail' );
					if ( $url ) {
						$thumbs[ $id ] = $url;
					}
				}
			}
		}
		wp_localize_script(
			'pld-builder',
			'PLD_BUILDER',
			array(
				'schema'     => PLD_Components::schema(),
				'components' => $components,
				'thumbs'     => (object) $thumbs,
				'i18n'       => array(
					'add'     => __( 'Add component', 'pld-work' ),
					'remove'  => __( 'Remove', 'pld-work' ),
					'confirm' => __( 'Remove this component?', 'pld-work' ),
					'choose'  => __( 'Choose image', 'pld-work' ),
					'choosem' => __( 'Choose images', 'pld-work' ),
					'clear'   => __( 'Clear', 'pld-work' ),
					'empty'   => __( 'No components yet. Add the first one below.', 'pld-work' ),
					'up'      => __( 'Move up', 'pld-work' ),
					'down'    => __( 'Move down', 'pld-work' ),
				),
			)
		);
	}

	public static function save( $post_id, $post ) {
		if ( ! isset( $_POST['pld_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['pld_nonce'] ) ), 'pld_save_project' ) ) {
			return;
		}
		if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		if ( isset( $_POST['pld_components'] ) ) {
			// Sanitised per field in PLD_Components::sanitize().
			update_post_meta( $post_id, PLD_META, PLD_Components::sanitize( $_POST['pld_components'] ) ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		}
	}

	/** Keep the master page order clean when a project is deleted. */
	public static function on_delete( $post_id ) {
		if ( PLD_CPT !== get_post_type( $post_id ) ) {
			return;
		}
		$order = array_values( array_diff( PLD_Works::get_order(), array( (int) $post_id ) ) );
		update_option( PLD_OPT_ORDER, $order, false );
	}

	/* ------------------------------------------------------------ frontend */

	public static function front_assets() {
		wp_register_style( 'pld-front', PLD_URL . 'assets/css/front.css', array(), PLD_VERSION );
		wp_register_script( 'pld-front', PLD_URL . 'assets/js/front.js', array(), PLD_VERSION, true );
		wp_localize_script(
			'pld-front',
			'PLD_FRONT',
			array( 'rest' => esc_url_raw( rest_url( 'pld/v1/works' ) ) )
		);
		if ( is_singular( PLD_CPT ) ) {
			wp_enqueue_style( 'pld-roboto', 'https://fonts.googleapis.com/css2?family=Roboto:wght@700&display=swap', array(), null ); // bold font
			self::enqueue_front();
		}
	}

	public static function enqueue_front() {
		wp_enqueue_style( 'pld-front' );
		wp_enqueue_script( 'pld-front' );
	}

	public static function template( $template ) {
		if ( is_singular( PLD_CPT ) ) {
			$custom = PLD_DIR . 'templates/single-project.php';
			// Let a theme override with single-pld_project.php.
			if ( ! locate_template( 'single-' . PLD_CPT . '.php' ) && file_exists( $custom ) ) {
				return $custom;
			}
		}
		return $template;
	}

	/** Previous / next project following the master page order. */
	public static function neighbours( $post_id ) {
		$order = array_values( array_filter( PLD_Works::get_order(), static function ( $id ) {
			return 'publish' === get_post_status( $id );
		} ) );
		$i = array_search( (int) $post_id, $order, true );
		if ( false === $i || count( $order ) < 2 ) {
			return array( null, null );
		}
		$n = count( $order );
		return array( $order[ ( $i - 1 + $n ) % $n ], $order[ ( $i + 1 ) % $n ] );
	}

	public static function shortcode( $atts ) {
		$atts = shortcode_atts( array( 'id' => 0 ), $atts, 'pld_project' );
		$id   = absint( $atts['id'] );
		if ( ! $id || PLD_CPT !== get_post_type( $id ) || 'publish' !== get_post_status( $id ) ) {
			return '';
		}
		self::enqueue_front();
		return '<div class="pld-project">' . PLD_Components::render_all( $id ) . '</div>';
	}
}
