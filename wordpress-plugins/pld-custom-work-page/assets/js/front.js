/* Front-end: scroll animations, hero parallax, lazy loaded works grid. */
(function () {
	'use strict';
	var root = document.documentElement;
	var hasIO = 'IntersectionObserver' in window;
	if (!hasIO) { return; } // Without IO everything stays visible (CSS only hides under .pld-js).
	root.classList.add('pld-js');

	var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* ---------- reveal on scroll ---------- */
	var revealIO = new IntersectionObserver(function (entries) {
		entries.forEach(function (e) {
			if (e.isIntersecting) {
				e.target.classList.add('is-in');
				revealIO.unobserve(e.target);
			}
		});
	}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

	function watch(scope) {
		(scope || document).querySelectorAll('[data-pld-anim]:not(.is-in), .pld-card:not(.is-in)').forEach(function (el) {
			revealIO.observe(el);
		});
	}

	/* ---------- hero parallax ---------- */
	var parallax = document.querySelectorAll('[data-pld-parallax]');
	if (parallax.length && !reduce) {
		var ticking = false;
		var update = function () {
			ticking = false;
			parallax.forEach(function (el) {
				var r = el.parentNode.getBoundingClientRect();
				if (r.bottom < 0 || r.top > window.innerHeight) { return; }
				el.style.transform = 'translate3d(0,' + (-r.top * 0.18).toFixed(1) + 'px,0)';
			});
		};
		window.addEventListener('scroll', function () {
			if (!ticking) { ticking = true; requestAnimationFrame(update); }
		}, { passive: true });
		update();
	}

	/* ---------- image fade-in once loaded ---------- */
	function imgs(scope) {
		scope.querySelectorAll('.pld-card__img img').forEach(function (img) {
			if (img.complete && img.naturalWidth) { img.classList.add('is-loaded'); return; }
			img.addEventListener('load', function () { img.classList.add('is-loaded'); }, { once: true });
			img.addEventListener('error', function () { img.classList.add('is-loaded'); }, { once: true });
		});
	}

	/* ---------- works grid lazy loading ---------- */
	document.querySelectorAll('.pld-works').forEach(function (wrap) {
		var grid = wrap.querySelector('.pld-grid');
		var sentinel = wrap.querySelector('.pld-sentinel');
		var offset = parseInt(wrap.getAttribute('data-offset'), 10) || 0;
		var done = wrap.getAttribute('data-done') === '1';
		var busy = false;
		imgs(grid);

		if (done || !sentinel || !window.PLD_FRONT) { return; }

		function load() {
			if (busy || done) { return; }
			busy = true;
			var url = window.PLD_FRONT.rest + (window.PLD_FRONT.rest.indexOf('?') < 0 ? '?' : '&') + 'offset=' + offset;
			fetch(url, { credentials: 'same-origin' })
				.then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
				.then(function (d) {
					var tmp = document.createElement('div');
					tmp.innerHTML = d.html;
					while (tmp.firstChild) { grid.appendChild(tmp.firstChild); }
					imgs(grid);
					watch(grid);
					offset = d.offset;
					done = !!d.done;
					if (done) { wrap.setAttribute('data-done', '1'); lazyIO.disconnect(); }
				})
				.catch(function () { /* retry on next intersection */ })
				.then(function () { busy = false; });
		}

		var lazyIO = new IntersectionObserver(function (entries) {
			if (entries.some(function (e) { return e.isIntersecting; })) {
				load();
				// Keep filling if the sentinel is still on screen after the batch.
				setTimeout(function () {
					var r = sentinel.getBoundingClientRect();
					if (!done && r.top < window.innerHeight + 300) { load(); }
				}, 400);
			}
		}, { rootMargin: '400px 0px' });
		lazyIO.observe(sentinel);
	});

	watch(document);
})();
