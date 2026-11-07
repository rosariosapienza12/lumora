import "server-only";
import type { PresentationDoc } from "@/lib/editor/schema";
import { countPhotoSlots, fillPhotoSlots } from "@/lib/editor/photos";
import { searchCommons } from "./commons";

/**
 * Fills the photo spaces of a new presentation with free photos about `query`.
 * If Commons is slow or down the presentation is still created, just without
 * photos: the spaces stay ready for the user to fill from the editor.
 */
export async function addFreePhotos(doc: PresentationDoc, query: string, pageQueries: Map<string, string> = new Map()): Promise<{ doc: PresentationDoc; added: number }> {
  const slots = countPhotoSlots(doc);
  if (!slots) return { doc, added: 0 };
  try {
    // A search per page that has its own words (what that page is about), plus one for the topic.
    const perPage = new Map<string, Awaited<ReturnType<typeof searchCommons>>>();
    await Promise.all(
      [...pageQueries].slice(0, 6).map(async ([pageId, q]) => {
        try {
          perPage.set(pageId, await searchCommons(q, 8));
        } catch {
          // That page falls back to the topic's photos.
        }
      }),
    );
    const photos = await searchCommons(query, Math.max(16, slots * 3));
    return { doc: fillPhotoSlots(doc, photos, perPage), added: Math.min(slots, photos.length) };
  } catch (err) {
    console.error("free photos unavailable", err instanceof Error ? err.message : err);
    return { doc, added: 0 };
  }
}
