<?php
defined( 'ABSPATH' ) || exit;

/**
 * Admin UI for the master Works page.
 */
class PLD_Admin_Works {

	const SLUG = 'pld-works-page';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_action( 'admin_post_pld_save_works', array( __CLASS__, 'save' ) );
		add_action( 'admin_post_pld_create_page', array( __CLASS__, 'create_page' ) );
	}

	public static function menu() {
		add_submenu_page(
			'edit.php?post_type=' . PLD_CPT,
			__( 'Master Works page', 'pld-work' ),
			__( 'Master Works page', 'pld-work' ),
			'edit_pages',
			self::SLUG,
			array( __CLASS__, 'render' )
		);
	}

	private static function projects() {
		$posts = get_posts(
			array(
				'post_type'      => PLD_CPT,
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'orderby'        => 'title',
				'order'          => 'ASC',
				'no_found_rows'  => true,
			)
		);
		$out = array();
		foreach ( $posts as $p ) {
			$out[ $p->ID ] = array(
				'id'    => $p->ID,
				'title' => get_the_title( $p ),
				'thumb' => (string) get_the_post_thumbnail_url( $p, 'medium' ),
			);
		}
		return $out;
	}

	public static function assets( $hook ) {
		if ( false === strpos( $hook, self::SLUG ) ) {
			return;
		}
		wp_enqueue_style( 'pld-admin', PLD_URL . 'assets/css/admin.css', array(), PLD_VERSION );
		wp_enqueue_script( 'pld-works-admin', PLD_URL . 'assets/js/works-admin.js', array( 'jquery', 'jquery-ui-sortable' ), PLD_VERSION, true );
		wp_localize_script(
			'pld-works-admin',
			'PLD_WORKS',
			array(
				'projects' => (object) self::projects(),
				'order'    => PLD_Works::get_order(),
				'i18n'     => array(
					'left'   => __( 'Move left', 'pld-work' ),
					'right'  => __( 'Move right', 'pld-work' ),
					'up'     => __( 'Move up', 'pld-work' ),
					'down'   => __( 'Move down', 'pld-work' ),
					'remove' => __( 'Remove from page', 'pld-work' ),
					'add'    => __( 'Add', 'pld-work' ),
					'none'   => __( 'No image', 'pld-work' ),
					'empty'  => __( 'Nothing selected yet. Add projects from the list on the left.', 'pld-work' ),
					'all'    => __( 'All published projects are on the page.', 'pld-work' ),
				),
			)
		);
	}

	public static function render() {
		if ( ! current_user_can( 'edit_pages' ) ) {
			return;
		}
		$page_id = (int) get_option( PLD_OPT_PAGE );
		$page    = $page_id ? get_post( $page_id ) : null;
		$batch   = PLD_Works::batch_size();
		?>
		<div class="wrap pld-works-admin">
			<h1><?php esc_html_e( 'Master Works page', 'pld-work' ); ?></h1>

			<?php if ( isset( $_GET['saved'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification ?>
				<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Works page saved.', 'pld-work' ); ?></p></div>
			<?php endif; ?>

			<div class="pld-page-box">
				<?php if ( $page && 'trash' !== $page->post_status ) : ?>
					<strong><?php esc_html_e( 'Works page:', 'pld-work' ); ?></strong>
					<a href="<?php echo esc_url( get_permalink( $page ) ); ?>" target="_blank"><?php echo esc_html( get_the_title( $page ) ); ?></a>
					&middot; <a href="<?php echo esc_url( get_edit_post_link( $page ) ); ?>"><?php esc_html_e( 'Edit page', 'pld-work' ); ?></a>
				<?php else : ?>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline">
						<input type="hidden" name="action" value="pld_create_page">
						<?php wp_nonce_field( 'pld_create_page' ); ?>
						<?php esc_html_e( 'No Works page yet.', 'pld-work' ); ?>
						<button class="button"><?php esc_html_e( 'Create "Works" page', 'pld-work' ); ?></button>
					</form>
				<?php endif; ?>
				<span class="description"> <?php esc_html_e( 'Or place the shortcode [pld_works] in any page.', 'pld-work' ); ?></span>
			</div>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" id="pld-works-form">
				<input type="hidden" name="action" value="pld_save_works">
				<?php wp_nonce_field( 'pld_save_works' ); ?>
				<input type="hidden" name="pld_order" id="pld-order-input" value="">

				<div class="pld-works-cols">
					<div class="pld-avail">
						<h2><?php esc_html_e( 'Available projects', 'pld-work' ); ?></h2>
						<p class="description"><?php esc_html_e( 'Published projects not yet on the page.', 'pld-work' ); ?></p>
						<ul id="pld-avail-list"></ul>
					</div>
					<div class="pld-sel">
						<h2><?php esc_html_e( 'Page layout (3 per row)', 'pld-work' ); ?></h2>
						<p class="description"><?php esc_html_e( 'Drag cards, or use the arrows to move a project left, right, up or down.', 'pld-work' ); ?></p>
						<div id="pld-grid" class="pld-grid-admin"></div>
					</div>
				</div>

				<?php
				$style = PLD_Theme::style();
				$sel   = static function ( $kind ) {
					$cur  = PLD_Theme::setting( $kind );
					$html = '<select name="pld_hf_' . esc_attr( $kind ) . '"><option value="auto"' . selected( $cur, 'auto', false ) . '>' . esc_html__( 'Automatic (same as the site)', 'pld-work' ) . '</option>';
					foreach ( PLD_Theme::templates( $kind ) as $id => $title ) {
						$html .= '<option value="' . (int) $id . '"' . selected( (string) $cur, (string) $id, false ) . '>' . esc_html( $title ) . '</option>';
					}
					return $html . '<option value="theme"' . selected( $cur, 'theme', false ) . '>' . esc_html__( 'Theme default', 'pld-work' ) . '</option></select>';
				};
				?>
				<div class="pld-style-box">
					<strong><?php esc_html_e( 'Project page header / footer', 'pld-work' ); ?></strong>
					<label><?php esc_html_e( 'Header', 'pld-work' ); ?> <?php echo $sel( 'header' ); // phpcs:ignore WordPress.Security.EscapeOutput ?></label>
					<label><?php esc_html_e( 'Footer', 'pld-work' ); ?> <?php echo $sel( 'footer' ); // phpcs:ignore WordPress.Security.EscapeOutput ?></label>
					<?php if ( ! PLD_Theme::available() ) : ?>
						<span class="description"><?php esc_html_e( 'Header Footer Elementor not detected: the theme header/footer is used.', 'pld-work' ); ?></span>
					<?php endif; ?>
				</div>
				<div class="pld-style-box">
					<strong><?php esc_html_e( 'Project page text colours', 'pld-work' ); ?></strong>
					<label><?php esc_html_e( 'Text', 'pld-work' ); ?> <input type="color" name="pld_text_color" value="<?php echo esc_attr( $style['text'] ); ?>"></label>
					<label><?php esc_html_e( 'Text size (px)', 'pld-work' ); ?> <input type="number" min="10" max="30" name="pld_text_size" value="<?php echo esc_attr( $style['size'] ); ?>" class="small-text"></label>
					<label><?php esc_html_e( 'Title size (px)', 'pld-work' ); ?> <input type="number" min="12" max="60" name="pld_title_size" value="<?php echo esc_attr( $style['title'] ); ?>" class="small-text"></label>
					<label><?php esc_html_e( 'Bold labels / title', 'pld-work' ); ?> <input type="color" name="pld_label_color" value="<?php echo esc_attr( $style['label'] ); ?>"></label>
				</div>
				<p>
					<label>
						<?php esc_html_e( 'Projects loaded per batch (lazy loading):', 'pld-work' ); ?>
						<input type="number" name="pld_batch" min="3" max="30" value="<?php echo esc_attr( $batch ); ?>" class="small-text">
					</label>
				</p>
				<?php submit_button( __( 'Save Works page', 'pld-work' ) ); ?>
			</form>
		</div>
		<?php
	}

	public static function save() {
		if ( ! current_user_can( 'edit_pages' ) ) {
			wp_die( esc_html__( 'Not allowed.', 'pld-work' ), 403 );
		}
		check_admin_referer( 'pld_save_works' );

		$raw   = isset( $_POST['pld_order'] ) ? sanitize_text_field( wp_unslash( $_POST['pld_order'] ) ) : '';
		$ids   = array_unique( array_filter( array_map( 'absint', explode( ',', $raw ) ) ) );
		$ids   = array_values(
			array_filter(
				$ids,
				static function ( $id ) {
					return PLD_CPT === get_post_type( $id );
				}
			)
		);
		update_option( PLD_OPT_ORDER, $ids, false );

		if ( isset( $_POST['pld_batch'] ) ) {
			update_option( PLD_OPT_BATCH, min( 30, max( 3, absint( $_POST['pld_batch'] ) ) ), false );
		}
		$text  = isset( $_POST['pld_text_color'] ) ? sanitize_hex_color( wp_unslash( $_POST['pld_text_color'] ) ) : '';
		$label = isset( $_POST['pld_label_color'] ) ? sanitize_hex_color( wp_unslash( $_POST['pld_label_color'] ) ) : '';
		$hf = array();
		foreach ( array( 'header', 'footer' ) as $k ) {
			$v          = isset( $_POST[ 'pld_hf_' . $k ] ) ? sanitize_text_field( wp_unslash( $_POST[ 'pld_hf_' . $k ] ) ) : 'auto';
			$hf[ $k ] = ( 'auto' === $v || 'theme' === $v || ctype_digit( $v ) ) ? $v : 'auto';
		}
		update_option( PLD_Theme::OPT_HF, $hf, false );
		update_option( 'pld_style', array(
			'text'  => $text,
			'label' => $label,
			'size'  => isset( $_POST['pld_text_size'] ) ? min( 30, max( 10, absint( $_POST['pld_text_size'] ) ) ) : 14,
			'title' => isset( $_POST['pld_title_size'] ) ? min( 60, max( 12, absint( $_POST['pld_title_size'] ) ) ) : 22,
		), false );

		wp_safe_redirect( admin_url( 'edit.php?post_type=' . PLD_CPT . '&page=' . self::SLUG . '&saved=1' ) );
		exit;
	}

	public static function create_page() {
		if ( ! current_user_can( 'publish_pages' ) ) {
			wp_die( esc_html__( 'Not allowed.', 'pld-work' ), 403 );
		}
		check_admin_referer( 'pld_create_page' );

		$id = wp_insert_post(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => __( 'Works', 'pld-work' ),
				'post_content' => '[pld_works]',
			)
		);
		if ( $id && ! is_wp_error( $id ) ) {
			update_option( PLD_OPT_PAGE, $id, false );
		}
		wp_safe_redirect( admin_url( 'edit.php?post_type=' . PLD_CPT . '&page=' . self::SLUG ) );
		exit;
	}
}
