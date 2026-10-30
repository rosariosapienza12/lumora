/// <reference lib="webworker" />
import { ATMOSPHERE, generateTexture, type PlanetKind } from "./textures";

const WIDTHS = new Set([256, 512, 1024, 2048]);

/** Generates planet textures off the main thread and transfers the buffers back. */
self.onmessage = (e: MessageEvent<unknown>) => {
  // A dedicated worker only hears from the page that created it, but the input is still validated:
  // the kind picks a generator by name and the width sizes an allocation.
  const data = e.data as { id?: unknown; kind?: unknown; width?: unknown } | null;
  if (!data || typeof data.id !== "number" || typeof data.kind !== "string" || typeof data.width !== "number") return;
  if (!Object.hasOwn(ATMOSPHERE, data.kind) || !WIDTHS.has(data.width)) return;
  const texture = generateTexture(data.kind as PlanetKind, data.width);
  const transfer = [texture.rgba.buffer, texture.spec.buffer, ...(texture.clouds ? [texture.clouds.buffer] : [])];
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id: data.id, texture }, transfer as ArrayBuffer[]);
};
