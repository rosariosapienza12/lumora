import "server-only";
import type { PresentationDoc } from "@/lib/editor/schema";
import { countPhotoSlots, fillPhotoSlots } from "@/lib/editor/photos";
import { searchCommons } from "./commons";

/**
 * Fills the photo spaces of a new presentation with free photos about `query`.
 * If Commons is slow or down the presentation is still created, just without
 * photos: the spaces stay ready for the user to fill from the editor.
 */
export async function addFreePhotos(doc: PresentationDoc, query: string): Promise<{ doc: PresentationDoc; added: number }> {
  const slots = countPhotoSlots(doc);
  if (!slots) return { doc, added: 0 };
  try {
    const photos = await searchCommons(query, Math.max(12, slots));
    return { doc: fillPhotoSlots(doc, photos), added: Math.min(slots, photos.length) };
  } catch (err) {
    console.error("free photos unavailable", err instanceof Error ? err.message : err);
    return { doc, added: 0 };
  }
}
