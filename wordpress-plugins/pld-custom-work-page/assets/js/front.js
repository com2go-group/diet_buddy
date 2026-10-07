/* Front-end: entrance animations, hero slideshow, lazy loaded works grid. */
(function () {
	'use strict';
	if (!('IntersectionObserver' in window)) { return; } // Without IO everything stays visible.
	document.documentElement.classList.add('pld-js');

	/* ---------- entrance animations (trigger once, when ~10% is on screen) ---------- */
	var revealIO = new IntersectionObserver(function (entries) {
		entries.forEach(function (e) {
			if (e.isIntersecting) {
				e.target.classList.add('is-in');
				revealIO.unobserve(e.target);
			}
		});
	}, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });

	function watch(scope) {
		(scope || document).querySelectorAll('[data-pld-anim]:not(.is-in), .pld-card:not(.is-in)').forEach(function (el) {
			revealIO.observe(el);
		});
	}

	/* ---------- hero slideshow: cross-fade, loops ---------- */
	document.querySelectorAll('[data-pld-slideshow]').forEach(function (hero) {
		var slides = hero.querySelectorAll('.pld-slide');
		if (slides.length < 2) { return; }
		var i = 0, ms = parseInt(hero.getAttribute('data-duration'), 10) || 5000, timer;
		var next = function () {
			slides[i].classList.remove('is-active');
			i = (i + 1) % slides.length;
			slides[i].classList.add('is-active');
		};
		var start = function () { timer = setInterval(next, ms); };
		start();
		document.addEventListener('visibilitychange', function () {
			clearInterval(timer);
			if (!document.hidden) { start(); }
		});
	});

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
				setTimeout(function () { // keep filling if the sentinel is still visible
					var r = sentinel.getBoundingClientRect();
					if (!done && r.top < window.innerHeight + 300) { load(); }
				}, 400);
			}
		}, { rootMargin: '400px 0px' });
		lazyIO.observe(sentinel);
	});

	watch(document);
})();
