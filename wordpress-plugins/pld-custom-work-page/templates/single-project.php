<?php
/**
 * Single project template. Copy to your theme as single-pld_project.php to override.
 */
defined( 'ABSPATH' ) || exit;

get_header();

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

get_footer();
