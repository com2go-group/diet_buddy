<?php
// Removes plugin settings only. Projects and their content are kept.
defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'pld_works_order' );
delete_option( 'pld_works_page_id' );
delete_option( 'pld_works_batch' );
