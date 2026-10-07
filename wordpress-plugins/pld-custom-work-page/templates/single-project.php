<?php
/**
 * Single project template. Copy to your theme as single-pld_project.php to override.
 */
defined( 'ABSPATH' ) || exit;

get_header();

while ( have_posts() ) :
	the_post();
	$components = PLD_Components::get( get_the_ID() );
	$has_hero   = $components && 'hero' === $components[0]['type'];
	?>
	<main id="pld-main" class="pld-project">
		<?php if ( ! $has_hero ) : ?>
			<header class="pld-c pld-c--title" data-pld-anim="fade-up">
				<div class="pld-inner"><h1><?php the_title(); ?></h1></div>
			</header>
		<?php endif; ?>

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
