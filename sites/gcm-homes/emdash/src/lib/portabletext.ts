// Minimal Portable Text helpers for the listing description (emdash's WYSIWYG field
// type is `portableText`, stored as JSON). We build PT from the plain MLS remarks
// (so the admin editor opens pre-filled) and serialize PT -> HTML for the site.
// Deterministic keys (b0/s0…) matter: the sync compares description vs the MLS
// snapshot as JSON strings for "track until edited", so identical text must yield
// identical JSON.

function esc(s: any): string {
	return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

// Plain text -> Portable Text JSON string (blank lines split paragraphs).
export function plainToPortableText(plain: string | null | undefined): string {
	const text = (plain ?? "").toString();
	const paras = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
	const list = paras.length ? paras : (text.trim() ? [text.trim()] : []);
	const blocks = list.map((p, i) => ({
		_type: "block", _key: "b" + i, style: "normal", markDefs: [],
		children: [{ _type: "span", _key: "s" + i, text: p, marks: [] }],
	}));
	return JSON.stringify(blocks);
}

function renderSpan(span: any, markDefs: any[]): string {
	if (!span || span._type !== "span") return "";
	let t = esc(span.text || "");
	for (const m of (span.marks || [])) {
		if (m === "strong") t = `<strong>${t}</strong>`;
		else if (m === "em") t = `<em>${t}</em>`;
		else if (m === "underline") t = `<u>${t}</u>`;
		else if (m === "code") t = `<code>${t}</code>`;
		else {
			const def = (markDefs || []).find((d) => d && d._key === m);
			if (def && def._type === "link" && def.href) t = `<a href="${esc(def.href)}" rel="noopener">${t}</a>`;
		}
	}
	return t;
}

// Portable Text (JSON string or array) -> HTML. Falls back to treating a non-JSON
// string as plain text, so legacy/plain values still render.
export function portableTextToHtml(json: string | any[] | null | undefined): string {
	if (json == null || json === "") return "";
	let blocks: any;
	if (typeof json === "string") {
		const s = json.trim();
		if (!(s.startsWith("[") || s.startsWith("{"))) return `<p>${esc(json).replace(/\n/g, "<br>")}</p>`;
		try { blocks = JSON.parse(s); } catch { return `<p>${esc(json).replace(/\n/g, "<br>")}</p>`; }
	} else { blocks = json; }
	if (!Array.isArray(blocks)) return "";
	let html = "", listType: string | null = null, listBuf: string[] = [];
	const flushList = () => { if (listBuf.length) { html += `<${listType}>${listBuf.join("")}</${listType}>`; listBuf = []; listType = null; } };
	for (const b of blocks) {
		if (!b || b._type !== "block") { flushList(); continue; }
		const inner = (b.children || []).map((sp: any) => renderSpan(sp, b.markDefs || [])).join("");
		if (b.listItem) {
			const lt = b.listItem === "number" ? "ol" : "ul";
			if (listType && listType !== lt) flushList();
			listType = lt; listBuf.push(`<li>${inner}</li>`);
		} else {
			flushList();
			const style = b.style || "normal";
			if (style === "blockquote") html += `<blockquote>${inner}</blockquote>`;
			else if (/^h[1-6]$/.test(style)) html += `<${style}>${inner}</${style}>`;
			else html += `<p>${inner}</p>`;
		}
	}
	flushList();
	return html;
}
