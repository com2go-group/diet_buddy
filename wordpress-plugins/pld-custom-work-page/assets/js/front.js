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

	/* ---------- works grid: paging without a reload (links still work without JS) ---------- */
	document.querySelectorAll('.pld-works').forEach(function (wrap) {
		var grid = wrap.querySelector('.pld-grid');
		var prev = wrap.querySelector('.pld-btn--prev');
		var next = wrap.querySelector('.pld-btn--next');
		if (!grid) { return; }
		imgs(grid);
		if (!prev || !next || !window.PLD_FRONT) { return; }
		var info = wrap.querySelector('.pld-pager-works__info');
		var busy = false;

		function setBtn(btn, page, url) {
			btn.setAttribute('data-page', page || 0);
			btn.classList.toggle('is-off', !page);
			btn.setAttribute('aria-hidden', page ? 'false' : 'true');
			btn.tabIndex = page ? 0 : -1;
			if (page) { btn.href = url(page); }
		}
		function urlFor(page) {
			var u = new URL(window.location.href);
			if (page > 1) { u.searchParams.set('works_page', page); } else { u.searchParams.delete('works_page'); }
			return u.toString();
		}

		function load(page) {
			if (busy) { return; }
			busy = true;
			wrap.classList.add('is-loading');
			fetch(window.PLD_FRONT.rest + (window.PLD_FRONT.rest.indexOf('?') < 0 ? '?' : '&') + 'page=' + page, { credentials: 'same-origin' })
				.then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
				.then(function (d) {
					grid.innerHTML = d.html;
					imgs(grid);
					watch(grid); // new cards animate in on scroll
					setBtn(prev, d.page > 1 ? d.page - 1 : 0, urlFor);
					setBtn(next, d.page < d.pages ? d.page + 1 : 0, urlFor);
					if (info) { info.textContent = d.page + ' / ' + d.pages; }
					window.history.pushState({ pld: d.page }, '', urlFor(d.page));
					var top = wrap.getBoundingClientRect().top + window.pageYOffset - 20;
					window.scrollTo({ top: top, behavior: 'smooth' });
				})
				.catch(function () { window.location.href = urlFor(page); }) // fall back to a normal page load
				.then(function () { busy = false; wrap.classList.remove('is-loading'); });
		}

		wrap.addEventListener('click', function (e) {
			var a = e.target.closest ? e.target.closest('.pld-btn') : null;
			if (!a || !wrap.contains(a)) { return; }
			var page = parseInt(a.getAttribute('data-page'), 10);
			e.preventDefault();
			if (page) { load(page); }
		});
	});

	watch(document);
})();
