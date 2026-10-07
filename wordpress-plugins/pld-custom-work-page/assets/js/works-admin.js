/* Master Works page arranger (admin). */
(function ($) {
	'use strict';
	var W = window.PLD_WORKS;
	if (!W) { return; }

	var COLS = 3;
	var projects = W.projects || {};
	var order = (W.order || []).map(Number).filter(function (id) { return projects[id]; });

	var $grid = $('#pld-grid');
	var $avail = $('#pld-avail-list');
	var $input = $('#pld-order-input');

	function esc(s) { return $('<div>').text(s == null ? '' : s).html(); }

	function card(id, i) {
		var p = projects[id];
		var img = p.thumb ? '<img src="' + esc(p.thumb) + '" alt="">' : '<span class="pld-noimg">' + esc(W.i18n.none) + '</span>';
		function b(cls, label, glyph, disabled) {
			return '<button type="button" class="button pld-mv ' + cls + '" title="' + esc(label) + '" aria-label="' + esc(label) + '"' +
				(disabled ? ' disabled' : '') + '>' + glyph + '</button>';
		}
		var n = order.length;
		return '<div class="pld-acard" data-id="' + id + '">' +
			'<div class="pld-acard__img">' + img + '</div>' +
			'<div class="pld-acard__title">' + esc(p.title) + '</div>' +
			'<div class="pld-acard__ctl">' +
			b('pld-l', W.i18n.left, '&larr;', i === 0) +
			b('pld-u', W.i18n.up, '&uarr;', i - COLS < 0) +
			b('pld-d', W.i18n.down, '&darr;', i + COLS >= n) +
			b('pld-r', W.i18n.right, '&rarr;', i === n - 1) +
			b('pld-x', W.i18n.remove, '&times;', false) +
			'</div></div>';
	}

	function render() {
		$grid.html(order.length ? order.map(card).join('') : '<p class="pld-none">' + esc(W.i18n.empty) + '</p>');

		var rest = Object.keys(projects).map(Number).filter(function (id) { return order.indexOf(id) < 0; });
		$avail.html(rest.length ? rest.map(function (id) {
			var p = projects[id];
			return '<li data-id="' + id + '">' +
				(p.thumb ? '<img src="' + esc(p.thumb) + '" alt="">' : '<span class="pld-noimg"></span>') +
				'<span>' + esc(p.title) + '</span>' +
				'<button type="button" class="button pld-add">' + esc(W.i18n.add) + '</button></li>';
		}).join('') : '<li class="pld-none">' + esc(W.i18n.all) + '</li>');

		$input.val(order.join(','));
	}

	function move(i, to) {
		if (to < 0 || to >= order.length) { return; }
		order.splice(to, 0, order.splice(i, 1)[0]);
		render();
	}

	$grid.on('click', '.pld-mv', function () {
		var $b = $(this);
		var i = order.indexOf(+$b.closest('.pld-acard').data('id'));
		if ($b.hasClass('pld-l')) { move(i, i - 1); }
		else if ($b.hasClass('pld-r')) { move(i, i + 1); }
		else if ($b.hasClass('pld-u')) { move(i, i - COLS); }
		else if ($b.hasClass('pld-d')) { move(i, i + COLS); }
		else if ($b.hasClass('pld-x')) { order.splice(i, 1); render(); }
	});

	$avail.on('click', '.pld-add', function () {
		order.push(+$(this).closest('li').data('id'));
		render();
	});

	$grid.sortable({
		items: '.pld-acard',
		tolerance: 'pointer',
		cancel: 'button',
		placeholder: 'pld-acard pld-placeholder',
		update: function () {
			order = $grid.children('.pld-acard').map(function () { return +$(this).data('id'); }).get();
			render();
		}
	});

	render();
})(jQuery);
