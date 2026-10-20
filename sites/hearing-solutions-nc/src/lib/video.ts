// YouTube and Vimeo links as embedded players.

/** A YouTube or Vimeo link as an embed address, else undefined. */
export function embedUrl(url: string | undefined): string | undefined {
	const u = url ?? "";
	const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
	if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
	const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
	return vm ? `https://player.vimeo.com/video/${vm[1]}` : undefined;
}

const ITEM = /^\s*<li>\s*<a href="([^"]+)"[^>]*>(.*?)<\/a>\s*<\/li>\s*$/;

/**
 * Rich text HTML with every list made only of video links (one link per item,
 * nothing else) turned into a grid of players, each captioned with its link
 * text. Any other list is left alone, so editors embed videos by listing them.
 */
export function embedVideoLists(html: string): string {
	return html.replace(/<ul>((?:\s*<li>.*?<\/li>)+)\s*<\/ul>/g, (whole, inner: string) => {
		const items = inner.match(/<li>.*?<\/li>/g) ?? [];
		const vids = items.map((li) => {
			const m = li.match(ITEM);
			const src = m ? embedUrl(m[1].replace(/&amp;/g, "&")) : undefined;
			return m && src ? { src, label: m[2] } : undefined;
		});
		if (!vids.length || vids.some((v) => !v)) return whole;
		const figs = vids.map((v) => {
			const title = v!.label.replace(/<[^>]*>/g, "").replace(/"/g, "&quot;");
			return `<figure class="rt-video"><div class="vplayer"><iframe src="${v!.src}" title="${title}" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div><figcaption>${v!.label}</figcaption></figure>`;
		});
		return `<div class="rt-videos">${figs.join("")}</div>`;
	});
}
