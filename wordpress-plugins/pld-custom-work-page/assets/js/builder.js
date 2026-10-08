/* Project component builder (admin). */
(function ($) {
	'use strict';
	var C = window.PLD_BUILDER;
	if (!C) { return; }

	var $root = $('#pld-builder');
	var $input = $('#pld-components-input');
	var thumbs = C.thumbs || {};
	var state = Array.isArray(C.components) ? C.components : [];

	function esc(s) { return $('<div>').text(s == null ? '' : s).html(); }

	function defaults(type) {
		var o = { type: type };
		C.schema[type].fields.forEach(function (f) {
			o[f.key] = f.type === 'gallery' ? [] : f.type === 'image' ? 0 :
				(f['default'] !== undefined ? f['default'] : '');
		});
		return o;
	}

	function sync() { $input.val(JSON.stringify(state)); }

	function thumbHtml(id) {
		return thumbs[id] ? '<img src="' + esc(thumbs[id]) + '" alt="">' : '';
	}

	function fieldHtml(f, val, i) {
		var h = '<div class="pld-f pld-f--' + f.type + '"><label>' + esc(f.label) + '</label>';
		if (f.type === 'text') {
			h += '<input type="text" class="widefat" data-k="' + f.key + '" value="' + esc(val) + '">';
		} else if (f.type === 'inline') {
			h += '<div class="pld-inline"><div class="pld-mini">' +
				'<button type="button" class="button button-small" data-tag="strong" title="Bold"><b>B</b></button>' +
				'<button type="button" class="button button-small" data-tag="em" title="Italic"><i>I</i></button></div>' +
				'<input type="text" class="widefat" data-k="' + f.key + '" value="' + esc(val) + '"></div>';
		} else if (f.type === 'rich') {
			h += '<textarea class="widefat pld-rte" rows="8" id="pld-rte-' + i + '-' + f.key + '" data-k="' + f.key + '">' + esc(val) + '</textarea>';
		} else if (f.type === 'textarea') {
			h += '<textarea class="widefat" rows="5" data-k="' + f.key + '">' + esc(val) + '</textarea>';
		} else if (f.type === 'select') {
			h += '<select data-k="' + f.key + '">';
			$.each(f.options, function (k, l) {
				h += '<option value="' + esc(k) + '"' + (String(val) === String(k) ? ' selected' : '') + '>' + esc(l) + '</option>';
			});
			h += '</select>';
		} else if (f.type === 'image') {
			h += '<div class="pld-media" data-k="' + f.key + '"><div class="pld-thumbs">' + thumbHtml(val) + '</div>' +
				'<button type="button" class="button pld-pick">' + esc(C.i18n.choose) + '</button> ' +
				'<button type="button" class="button-link pld-clear">' + esc(C.i18n.clear) + '</button></div>';
		} else if (f.type === 'gallery') {
			h += '<div class="pld-media pld-media--multi" data-k="' + f.key + '"><div class="pld-thumbs">' +
				(val || []).map(thumbHtml).join('') + '</div>' +
				'<button type="button" class="button pld-pick">' + esc(C.i18n.choosem) + '</button> ' +
				'<button type="button" class="button-link pld-clear">' + esc(C.i18n.clear) + '</button></div>';
		}
		return h + '</div>';
	}

	function destroyEditors() {
		if (!(window.wp && wp.editor)) { return; }
		$root.find('textarea.pld-rte').each(function () { try { wp.editor.remove(this.id); } catch (e) {} });
	}

	// Own mini toolbar (bold, italic, list, link, paragraph) used if the WordPress editor can't start.
	function fallbackBar($t) {
		if ($t.prev('.pld-bar').length) { return; }
		var tags = [['strong', '<b>B</b>', 'Bold'], ['em', '<i>I</i>', 'Italic'], ['a', 'Link', 'Link'], ['ul', '&bull; List', 'Bulleted list'], ['p', '&para;', 'Paragraph']];
		var $bar = $('<div class="pld-bar pld-mini"></div>');
		tags.forEach(function (t) { $bar.append('<button type="button" class="button button-small" data-t="' + t[0] + '" title="' + t[2] + '">' + t[1] + '</button>'); });
		$bar.insertBefore($t);
		$bar.on('click', 'button', function () {
			var el = $t[0], t = $(this).data('t'), a = el.selectionStart, b = el.selectionEnd, v = el.value, sel = v.slice(a, b), out;
			if (t === 'a') {
				var url = window.prompt('URL', 'https://');
				if (!url) { return; }
				out = '<a href="' + url + '">' + (sel || url) + '</a>';
			} else if (t === 'ul') {
				out = '<ul>\n' + (sel || 'Item').split('\n').map(function (l) { return '<li>' + l + '</li>'; }).join('\n') + '\n</ul>';
			} else {
				out = '<' + t + '>' + sel + '</' + t + '>';
			}
			el.value = v.slice(0, a) + out + v.slice(b);
			$t.trigger('input');
		});
	}

	function initEditors() {
		var can = window.wp && wp.editor && wp.editor.initialize && window.tinymce;
		if (!can) { $root.find('textarea.pld-rte').each(function () { fallbackBar($(this)); }); return; }
		$root.find('textarea.pld-rte').each(function () {
			var $t = $(this), id = this.id, ci = idx($t), key = $t.data('k');
			setTimeout(function () { // if TinyMCE did not take over the box, give it the fallback bar
				if (!(window.tinymce && tinymce.get(id)) && $t.is(':visible')) { fallbackBar($t); }
			}, 1500);
			var push = function (ed) { if (state[ci]) { state[ci][key] = ed.getContent(); sync(); } };
			wp.editor.initialize(id, {
				tinymce: {
					wpautop: false,
					forced_root_block: false, // Enter inserts <br> instead of a new <p>
					force_br_newlines: true,
					convert_newlines_to_brs: false,
					height: 240,
					toolbar1: 'formatselect,bold,italic,underline,blockquote,bullist,numlist,alignleft,aligncenter,alignright,link,unlink,removeformat,undo,redo',
					toolbar2: '',
					setup: function (ed) { ed.on('change keyup input undo redo', function () { push(ed); }); }
				},
				quicktags: { buttons: 'strong,em,link,block,ul,ol,li,close' },
				mediaButtons: false
			});
		});
	}

	function render() {
		destroyEditors();
		$root.empty();
		var $list = $('<div class="pld-list"></div>').appendTo($root);
		if (!state.length) { $list.append('<p class="pld-none">' + esc(C.i18n.empty) + '</p>'); }

		state.forEach(function (comp, i) {
			var def = C.schema[comp.type];
			var $c = $('<div class="pld-comp" data-i="' + i + '"></div>');
			var head = '<div class="pld-comp__head"><span class="pld-handle dashicons dashicons-move"></span>' +
				'<strong>' + esc(def.label) + '</strong><span class="pld-comp__actions">' +
				'<button type="button" class="button-link pld-up" title="' + esc(C.i18n.up) + '">&uarr;</button>' +
				'<button type="button" class="button-link pld-down" title="' + esc(C.i18n.down) + '">&darr;</button>' +
				'<button type="button" class="button-link button-link-delete pld-del">' + esc(C.i18n.remove) + '</button></span></div>';
			var body = '<div class="pld-comp__body">' +
				def.fields.map(function (f) { return fieldHtml(f, comp[f.key], i); }).join('') + '</div>';
			$c.html(head + body).appendTo($list);
		});

		var $add = $('<div class="pld-add"><select>' +
			Object.keys(C.schema).map(function (t) { return '<option value="' + t + '">' + esc(C.schema[t].label) + '</option>'; }).join('') +
			'</select> <button type="button" class="button button-primary">' + esc(C.i18n.add) + '</button></div>').appendTo($root);

		$add.find('button').on('click', function () {
			state.push(defaults($add.find('select').val()));
			render();
			$root.find('.pld-comp').last()[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
		});

		$list.sortable({
			handle: '.pld-handle',
			items: '.pld-comp',
			update: function () {
				var order = $list.children('.pld-comp').map(function () { return +$(this).data('i'); }).get();
				state = order.map(function (i) { return state[i]; });
				render();
			}
		});
		initEditors();
		sync();
	}

	function idx($el) { return +$el.closest('.pld-comp').data('i'); }

	function move(i, to) {
		if (to < 0 || to >= state.length) { return; }
		state.splice(to, 0, state.splice(i, 1)[0]);
		render();
	}

	$root.on('input change', '[data-k]', function () {
		var $t = $(this);
		if ($t.hasClass('pld-media')) { return; }
		state[idx($t)][$t.data('k')] = $t.val();
		sync();
	});

	$root.on('click', '.pld-mini button', function () {
		var $in = $(this).closest('.pld-inline').find('input'), el = $in[0], tag = $(this).data('tag');
		var a = el.selectionStart, b = el.selectionEnd, v = el.value;
		el.value = v.slice(0, a) + '<' + tag + '>' + v.slice(a, b) + '</' + tag + '>' + v.slice(b);
		$in.trigger('input');
	});

	$root.on('click', '.pld-up', function () { var i = idx($(this)); move(i, i - 1); });
	$root.on('click', '.pld-down', function () { var i = idx($(this)); move(i, i + 1); });
	$root.on('click', '.pld-del', function () {
		if (window.confirm(C.i18n.confirm)) { state.splice(idx($(this)), 1); render(); }
	});

	$root.on('click', '.pld-clear', function () {
		var $m = $(this).closest('.pld-media');
		state[idx($m)][$m.data('k')] = $m.hasClass('pld-media--multi') ? [] : 0;
		render();
	});

	$root.on('click', '.pld-pick', function () {
		var $m = $(this).closest('.pld-media');
		var i = idx($m), key = $m.data('k'), multi = $m.hasClass('pld-media--multi');
		var frame = wp.media({
			title: multi ? C.i18n.choosem : C.i18n.choose,
			library: { type: 'image' },
			multiple: multi ? 'add' : false
		});
		frame.on('open', function () {
			var ids = multi ? state[i][key] : [state[i][key]];
			var sel = frame.state().get('selection');
			(ids || []).forEach(function (id) { if (id) { sel.add(wp.media.attachment(id)); } });
		});
		frame.on('select', function () {
			var sel = frame.state().get('selection').toJSON();
			sel.forEach(function (a) {
				thumbs[a.id] = (a.sizes && a.sizes.thumbnail ? a.sizes.thumbnail.url : a.url);
			});
			state[i][key] = multi ? sel.map(function (a) { return a.id; }) : (sel[0] ? sel[0].id : 0);
			render();
		});
		frame.open();
	});

	// Make sure the latest state is submitted.
	$('#post').on('submit', sync);
	render();
})(jQuery);
