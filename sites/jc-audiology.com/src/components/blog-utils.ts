export type EmDashImage = {
  src?: string;
  id?: string;
  alt?: string;
  width?: number;
  height?: number;
  meta?: Record<string, unknown>;
} | null | undefined;

export function mediaSrc(image: EmDashImage) {
  if (!image) return "";
  if (image.src) return image.src;
  const storageKey = typeof image.meta?.storageKey === "string" ? image.meta.storageKey : image.id;
  return storageKey ? `/_emdash/api/media/file/${storageKey}` : "";
}

export function normalizeRoute(route: string | null | undefined) {
  const clean = String(route ?? "").replace(/^\/+|\/+$/g, "");
  return clean ? `/${clean}/` : "/";
}

export function plainTextFromPortableText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  const parts: string[] = [];
  for (const block of value) {
    if (!block || typeof block !== "object") continue;
    const children = (block as { children?: unknown }).children;
    if (!Array.isArray(children)) continue;
    for (const child of children) {
      if (child && typeof child === "object" && typeof (child as { text?: unknown }).text === "string") {
        parts.push((child as { text: string }).text);
      }
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function excerptFromPortableText(value: unknown, maxWords = 13): string {
  const words = plainTextFromPortableText(value).split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const excerpt = words.slice(0, maxWords).join(" ");
  return words.length > maxWords ? `${excerpt.replace(/[.,;:!?]+$/, "")}...` : excerpt;
}

export function parseDateForSort(value: unknown) {
  const time = Date.parse(String(value ?? ""));
  return Number.isNaN(time) ? 0 : time;
}

export function systemCreatedAt(entry: unknown): string {
  if (!entry || typeof entry !== "object") return "";
  const record = entry as Record<string, unknown>;
  const data = record.data && typeof record.data === "object" ? record.data as Record<string, unknown> : {};
  return String(record.createdAt ?? record.created_at ?? data.createdAt ?? data.created_at ?? "").trim();
}

export function formatDisplayDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
