<?php
/**
 * Single project template. Copy to your theme as single-pld_project.php to override.
 *
 * With an Elementor header template available it prints the same page skeleton as the site's
 * Elementor pages (header, #content, footer). Otherwise it falls back to the theme's header/footer.
 */
defined( 'ABSPATH' ) || exit;

$pld_canvas = PLD_Theme::canvas();
if ( $pld_canvas ) {
	// Render before wp_head() so Elementor can enqueue the template CSS.
	$pld_header = PLD_Theme::render( 'header' );
	$pld_footer = PLD_Theme::render( 'footer' );
}

$pld_main = static function () {
	while ( have_posts() ) :
		the_post();
		?>
		<main id="pld-main" class="pld-project">
			<h1 class="screen-reader-text"><?php the_title(); ?></h1>

			<?php echo PLD_Components::render_all( get_the_ID() ); // phpcs:ignore WordPress.Security.EscapeOutput ?>

			<?php
			list( $prev, $next ) = PLD_Project::neighbours( get_the_ID() );
			$works_page          = (int) get_option( PLD_OPT_PAGE );
			if ( $prev || $next || $works_page ) :
				?>
				<nav class="pld-pager" aria-label="<?php esc_attr_e( 'Projects', 'pld-work' ); ?>">
					<?php if ( $prev ) : ?>
						<a class="pld-pager__prev" href="<?php echo esc_url( get_permalink( $prev ) ); ?>">&larr; <?php echo esc_html( get_the_title( $prev ) ); ?></a>
					<?php else : ?><span></span><?php endif; ?>
					<?php if ( $works_page && 'publish' === get_post_status( $works_page ) ) : ?>
						<a class="pld-pager__all" href="<?php echo esc_url( get_permalink( $works_page ) ); ?>"><?php esc_html_e( 'All works', 'pld-work' ); ?></a>
					<?php else : ?><span></span><?php endif; ?>
					<?php if ( $next ) : ?>
						<a class="pld-pager__next" href="<?php echo esc_url( get_permalink( $next ) ); ?>"><?php echo esc_html( get_the_title( $next ) ); ?> &rarr;</a>
					<?php else : ?><span></span><?php endif; ?>
				</nav>
			<?php endif; ?>
		</main>
		<?php
	endwhile;
};

if ( $pld_canvas ) :
	?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div class="hfeed site" id="page">
	<?php echo $pld_header; // phpcs:ignore WordPress.Security.EscapeOutput ?>
	<div id="content" class="site-content">
		<div class="ast-container">
			<?php $pld_main(); ?>
		</div>
	</div>
	<?php echo $pld_footer; // phpcs:ignore WordPress.Security.EscapeOutput ?>
</div>
<?php wp_footer(); ?>
</body>
</html>
	<?php
else :
	get_header();
	$pld_main();
	get_footer();
endif;
