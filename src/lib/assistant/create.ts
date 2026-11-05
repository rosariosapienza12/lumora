import "server-only";
import { buildDeck, planDeck, type DeckSpec } from "@/lib/editor/deck";
import { documentSchema, type PresentationDoc } from "@/lib/editor/schema";
import { addFreePhotos } from "@/lib/images/fill";
import { rateLimit } from "@/lib/rate-limit";
import { canGenerate, docFromGenerated, generateDeck } from "./generate";

/**
 * One way to make a presentation from a topic, used by Zib's "Crea" button and
 * by "Nuova presentazione → Da un argomento": Zib writes it with AI when it
 * can, otherwise Lumora builds the outline with placeholders. Photos are added
 * on request. The result is always a validated document.
 */
export async function createDeckDocument(userId: string, request: { topic: string; outline?: DeckSpec; photos: boolean }): Promise<{ title: string; doc: PresentationDoc; written: boolean }> {
  const fallback = request.outline ?? planDeck(request.topic, { photos: request.photos });
  let title = fallback.title;
  let doc = buildDeck(fallback);
  let photoQuery = fallback.photos;
  let written = false;

  if (await canGenerate(userId)) {
    const generated = await generateDeck(request);
    const built = generated && docFromGenerated(generated, request.outline?.theme);
    if (built) {
      ({ title, doc } = built);
      photoQuery = request.photos ? built.photoQuery || request.topic : undefined;
      written = true;
    }
  }
  if (photoQuery && (await rateLimit(`images:${userId}`, 60, 60 * 60))) doc = (await addFreePhotos(doc, photoQuery)).doc;
  if (!documentSchema.safeParse(doc).success) doc = buildDeck(fallback);
  return { title, doc, written };
}
