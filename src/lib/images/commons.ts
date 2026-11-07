import "server-only";
import type { FreePhoto } from "@/lib/editor/photos";

/**
 * Search for free photos on Wikimedia Commons, the media library of Wikipedia:
 * every file there has a free licence. Only the parts that matter to Lumora
 * are kept, and every value coming back is checked before it reaches a page.
 *
 * Wikimedia asks automated clients to identify themselves with a User-Agent
 * that names the project and a way to reach it.
 */

const API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "Lumora/0.1 (https://github.com/rosariosapienza12/lumora; presentation editor)";
/** Hosts Wikimedia serves files and thumbnails from. */
const FILE_HOSTS = new Set(["upload.wikimedia.org", "thumb.wikimedia.org"]);

/** The URL without its tracking parameters, or null when it is not a Wikimedia file. */
function fileUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || !FILE_HOSTS.has(u.hostname)) return null;
    return `${u.origin}${u.pathname}`;
  } catch {
    return null;
  }
}
const THUMB = 500;
/** Sharp even full-screen on a large display. */
const LARGE = 1920;
/** Photos smaller than this look blurred on a slide: they are left out. */
const MIN_WIDTH = 1200;
const MIN_HEIGHT = 700;
/** Files that are rarely good slide photos: maps, logos, diagrams, scans, flags, stamps, text. */
const NOT_A_PHOTO = /\b(map|mappa|carta geografica|logo|diagram|diagramma|schema|chart|grafico|coat of arms|stemma|flag|bandiera|icon|icona|drawing|disegno|plan|pianta|planimetria|scan|page|pagina|stamp|francobollo|screenshot|cartina|infographic|poster|manifesto|text|testo|signature|firma)\b/i;

/** Licences Lumora does not use: non-commercial or no-derivatives terms, or no clear licence. */
const NOT_FREE = /\b(NC|ND)\b|non[- ]commercial|no deriv|fair use/i;

type ApiPage = {
  index?: number;
  title?: string;
  imageinfo?: {
    url?: string;
    thumburl?: string;
    width?: number;
    height?: number;
    mime?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: unknown } | undefined>;
  }[];
};

/** Plain text from the small bits of HTML Commons uses for authors ("<a href=...>Name</a>"). */
export function plainText(html: unknown, max = 80): string {
  if (typeof html !== "string") return "";
  const text = html
    .replace(/<[^>]*>/g, " ")
    // One pass over all entities, so "&amp;lt;" becomes "&lt;" and is never decoded twice.
    .replace(/&(nbsp|amp|quot|apos|lt|gt|#\d{1,7});/g, (_, name: string) => {
      if (name.startsWith("#")) {
        const code = Number(name.slice(1));
        return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : " ";
      }
      return ({ nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" } as Record<string, string>)[name];
    })
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** "File:Grande_Muraglia_2019.jpg" → "Grande Muraglia 2019". */
const describe = (title: string) => plainText(title.replace(/^File:/i, "").replace(/\.[a-z0-9]{2,5}$/i, "").replace(/_/g, " "), 120);

/** Turns the API answer into photos Lumora can use, in search order. Anything odd is dropped. */
export function parseCommons(json: unknown): FreePhoto[] {
  const pages = (json as { query?: { pages?: ApiPage[] } })?.query?.pages;
  if (!Array.isArray(pages)) return [];
  const photos: FreePhoto[] = [];
  for (const page of [...pages].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))) {
    const info = page.imageinfo?.[0];
    if (!info || typeof page.title !== "string") continue;
    const { width, height, mime, descriptionurl, extmetadata: meta = {} } = info;
    const url = fileUrl(info.url);
    const thumburl = fileUrl(info.thumburl);
    if (!url || !thumburl) continue;
    if (typeof descriptionurl !== "string" || !descriptionurl.startsWith("https://commons.wikimedia.org/")) continue;
    // Real photographs: JPEG (PNG files on Commons are mostly maps, diagrams and logos).
    if (!["image/jpeg", "image/webp"].includes(String(mime))) continue;
    if (typeof width !== "number" || typeof height !== "number" || width < MIN_WIDTH || height < MIN_HEIGHT) continue;
    if (NOT_A_PHOTO.test(page.title)) continue;
    // Panoramas and very tall strips crop badly on a slide.
    if (width / height > 2.6 || height / width > 1.8) continue;
    const license = plainText(meta.LicenseShortName?.value, 60);
    if (!license || NOT_FREE.test(license)) continue;
    // A large thumbnail when the original is bigger than needed; otherwise the original itself.
    const large = width > LARGE && thumburl.includes(`/${THUMB}px-`) ? thumburl.replace(`/${THUMB}px-`, `/${LARGE}px-`) : url;
    photos.push({
      src: large,
      thumb: thumburl,
      width,
      height,
      title: describe(page.title) || "Foto da Wikimedia Commons",
      author: plainText(meta.Artist?.value) || "Autore sconosciuto",
      license,
      pageUrl: descriptionurl,
    });
  }
  return photos;
}

const cache = new Map<string, { at: number; photos: FreePhoto[] }>();
const CACHE_MS = 60 * 60 * 1000;

/**
 * Up to `limit` free photos for a search. Results are kept for an hour, so the
 * same search (the preview, then the creation) hits Commons only once.
 * Throws when Commons cannot be reached.
 */
export async function searchCommons(query: string, limit = 24): Promise<FreePhoto[]> {
  const q = query.replace(/\s+/g, " ").trim().slice(0, 80);
  if (q.length < 2) return [];
  const key = `${q.toLowerCase()}|${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.photos;

  const run = async (search: string, max: number) => {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      generator: "search",
      gsrsearch: search,
      gsrnamespace: "6",
      gsrlimit: String(Math.min(50, max)),
      prop: "imageinfo",
      iiprop: "url|size|mime|extmetadata",
      iiurlwidth: String(THUMB),
      iiextmetadatafilter: "Artist|LicenseShortName",
      iiextmetadatalanguage: "it",
    });
    const res = await fetch(`${API}?${params}`, {
      headers: { "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Commons answered ${res.status}`);
    return parseCommons(await res.json());
  };
  // First the photos Commons reviewers selected for sharpness, exposure and composition
  // ("Quality images", "Featured pictures"), then the rest of the search.
  const [best, rest] = await Promise.all([
    run(`${q} filetype:bitmap incategory:Quality_images`, limit).catch(() => [] as FreePhoto[]),
    run(`${q} filetype:bitmap`, limit * 2),
  ]);
  const seen = new Set<string>();
  const photos = [...best, ...rest].filter((ph) => !seen.has(ph.src) && seen.add(ph.src)).slice(0, limit);

  if (cache.size > 300) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), photos });
  return photos;
}
