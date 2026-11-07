import type { PlanetKind, PlanetTexture } from "./textures";

/**
 * Planet textures kept in the browser (IndexedDB) after they are generated
 * once: from the second visit the planets are sharp at once instead of being
 * computed again for seconds. Only moderate sizes are stored (up to 1024 px
 * wide, a few MB each); anything missing or failing just means "generate".
 */

const DB = "lumora-planets";
const STORE = "textures";
/** Bump when the texture generator changes, so old pictures are not reused. */
const VERSION = "v1";
export const CACHEABLE_WIDTH = 1024;

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

let db: Promise<IDBDatabase | null> | null = null;
const database = () => (db ??= open());
const key = (kind: PlanetKind, width: number) => `${VERSION}:${kind}:${width}`;

export async function readTexture(kind: PlanetKind, width: number): Promise<PlanetTexture | null> {
  if (width > CACHEABLE_WIDTH) return null;
  const d = await database();
  if (!d) return null;
  return new Promise((resolve) => {
    try {
      const req = d.transaction(STORE, "readonly").objectStore(STORE).get(key(kind, width));
      req.onsuccess = () => {
        const t = req.result as PlanetTexture | undefined;
        resolve(t && t.w === width && t.rgba?.length === t.w * t.h * 4 ? t : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function writeTexture(kind: PlanetKind, t: PlanetTexture): Promise<void> {
  if (t.w > CACHEABLE_WIDTH) return;
  const d = await database();
  if (!d) return;
  try {
    d.transaction(STORE, "readwrite").objectStore(STORE).put(t, key(kind, t.w));
  } catch {
    // Storage full or private mode: the texture is simply generated next time.
  }
}
