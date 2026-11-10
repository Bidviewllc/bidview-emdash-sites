/* Pager for .sold-grid[data-paged] on /sold-by-grant/ and /sold/.
   Moved out of sold.astro so both pages share it. */
// Pages each .sold-grid (Liz, 2026-11-09: "not one long page"). Every card
// stays in the HTML, so search engines still see them all and the page
// works without JS; this only hides the cards off the current page (their
// lazy photos don't load until shown). The page per grid lives in the
// hash (#grant=3&market=2), not the query string: the edge cache ignores
// query strings, and the hash keeps Back and shared links on the page.
(function () {
	var grids = [].slice.call(document.querySelectorAll(".sold-grid[data-paged]"));
	if (!grids.length) return;
	function readHash() {
		var out = {};
		location.hash.replace(/^#/, "").split("&").forEach(function (kv) {
			var p = kv.split("=");
			if (p[0] && /^\d+$/.test(p[1] || "")) out[p[0]] = parseInt(p[1], 10);
		});
		return out;
	}
	function writeHash(key, page) {
		var h = readHash();
		if (page > 1) h[key] = page; else delete h[key];
		var str = Object.keys(h).map(function (k) { return k + "=" + h[k]; }).join("&");
		history.pushState(null, "", str ? "#" + str : location.pathname);
	}
	// 1 … 4 5 [6] 7 8 … 18: first, last, and two either side of the current
	// page (one either side on a phone, so the row fits on one line).
	function pageList(cur, total) {
		var out = [], last = 0, span = window.innerWidth < 640 ? 1 : 2;
		for (var i = 1; i <= total; i++) {
			if (i === 1 || i === total || Math.abs(i - cur) <= span) {
				if (last && i - last > 1) out.push(0);
				out.push(i); last = i;
			}
		}
		return out;
	}
	grids.forEach(function (grid) {
		var key = grid.getAttribute("data-paged");
		var per = parseInt(grid.getAttribute("data-per"), 10) || 12;
		var cards = [].slice.call(grid.children);
		var total = Math.ceil(cards.length / per);
		if (total <= 1) return;
		var nav = document.createElement("nav");
		nav.className = "sold-pager";
		nav.setAttribute("aria-label", "Pages");
		grid.insertAdjacentElement("afterend", nav);
		var section = grid.closest(".sold-section") || grid;
		function show(page, scroll) {
			page = Math.min(Math.max(1, page || 1), total);
			// Remember where the visitor is, so "Back to …" on a home's page
			// returns to this page number (the referrer never carries the hash).
			try { sessionStorage.setItem("gcm:soldUrl", location.pathname + location.hash); } catch (e) {}
			var from = (page - 1) * per, to = from + per;
			cards.forEach(function (c, i) { c.hidden = i < from || i >= to; });
			var html = '<span class="sold-pager__count">' + (from + 1) + "–" + Math.min(to, cards.length) + " of " + cards.length + "</span>";
			html += '<div class="sold-pager__btns">';
			html += '<button type="button" class="sold-pager__btn sold-pager__arrow" data-go="' + (page - 1) + '"' + (page === 1 ? " disabled" : "") + ' aria-label="Previous page">&larr;</button>';
			pageList(page, total).forEach(function (n) {
				html += n === 0
					? '<span class="sold-pager__gap">…</span>'
					: '<button type="button" class="sold-pager__btn' + (n === page ? " is-current" : "") + '" data-go="' + n + '"' + (n === page ? ' aria-current="page"' : "") + ">" + n + "</button>";
			});
			html += '<button type="button" class="sold-pager__btn sold-pager__arrow" data-go="' + (page + 1) + '"' + (page === total ? " disabled" : "") + ' aria-label="Next page">&rarr;</button>';
			html += "</div>";
			nav.innerHTML = html;
			if (scroll) {
				var y = section.getBoundingClientRect().top + window.scrollY - 130;
				window.scrollTo({ top: y, behavior: "smooth" });
			}
		}
		nav.addEventListener("click", function (e) {
			var b = e.target.closest("button[data-go]");
			if (!b || b.disabled) return;
			var n = parseInt(b.getAttribute("data-go"), 10);
			writeHash(key, n);
			show(n, true);
		});
		window.addEventListener("popstate", function () { show(readHash()[key] || 1, false); });
		show(readHash()[key] || 1, false);
	});
})();
	
