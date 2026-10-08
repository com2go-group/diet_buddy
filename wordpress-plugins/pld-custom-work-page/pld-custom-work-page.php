<?php
/**
 * Plugin Name:       PLD custom work page
 * Description:       Build project pages from components (hero, text, images, gallery, video, quote…) with scroll animations, and arrange a master "Works" page (3 projects per row) with lazy loading.
 * Version:           2.2.2
 * Author:            easyDigital
 * Author URI:        https://easydigital.gr
 * License:           GPL-2.0-or-later
 * Text Domain:       pld-work
 * Requires at least: 5.8
 * Requires PHP:      7.4
 */

defined( 'ABSPATH' ) || exit;

define( 'PLD_VERSION', '2.2.2' );
define( 'PLD_FILE', __FILE__ );
define( 'PLD_DIR', plugin_dir_path( __FILE__ ) );
define( 'PLD_URL', plugin_dir_url( __FILE__ ) );
define( 'PLD_CPT', 'pld_project' );
define( 'PLD_META', '_pld_components' );
define( 'PLD_OPT_ORDER', 'pld_works_order' );
define( 'PLD_OPT_PAGE', 'pld_works_page_id' );
define( 'PLD_OPT_BATCH', 'pld_works_batch' );

require_once PLD_DIR . 'includes/class-pld-components.php';
require_once PLD_DIR . 'includes/class-pld-project.php';
require_once PLD_DIR . 'includes/class-pld-works.php';
require_once PLD_DIR . 'includes/class-pld-admin-works.php';
require_once PLD_DIR . 'includes/class-pld-theme.php';

add_action(
	'plugins_loaded',
	static function () {
		PLD_Project::init();
		PLD_Works::init();
		PLD_Theme::init();
		if ( is_admin() ) {
			PLD_Admin_Works::init();
		}
	}
);

register_activation_hook(
	__FILE__,
	static function () {
		PLD_Project::register_cpt();
		flush_rewrite_rules();
	}
);

register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
