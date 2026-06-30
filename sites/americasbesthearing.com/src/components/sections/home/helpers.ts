export function textToParagraphs(value: unknown): string[] {
	if (typeof value !== "string") return [];
	return value
		.split(/\n{2,}/)
		.map((item) => item.trim())
		.filter(Boolean);
}

export function imageSrc(image: unknown, fallback = ""): string {
	if (typeof image === "string") return image;
	if (image && typeof image === "object" && "src" in image && typeof image.src === "string") {
		return image.src;
	}
	return fallback;
}

export function imageAlt(image: unknown, fallback = ""): string {
	if (image && typeof image === "object" && "alt" in image && typeof image.alt === "string") {
		return image.alt;
	}
	return fallback;
}

export function sortByOrder<T extends { data?: Record<string, unknown>; sortOrder?: number }>(items: T[]): T[] {
	return [...items].sort((a, b) => {
		const aOrder = Number(a.data?.sort_order ?? a.data?.sortOrder ?? a.sortOrder ?? 0);
		const bOrder = Number(b.data?.sort_order ?? b.data?.sortOrder ?? b.sortOrder ?? 0);
		return aOrder - bOrder;
	});
}

export function dataOf<T extends Record<string, unknown>>(item: { data?: T } | T): T {
	if ("data" in item && item.data && typeof item.data === "object") return item.data;
	return item as T;
}
