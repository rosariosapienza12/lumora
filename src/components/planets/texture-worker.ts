/// <reference lib="webworker" />
import { generateTexture, type PlanetKind } from "./textures";

/** Generates planet textures off the main thread and transfers the buffers back. */
self.onmessage = (e: MessageEvent<{ id: number; kind: PlanetKind; width: number }>) => {
  const { id, kind, width } = e.data;
  const texture = generateTexture(kind, width);
  const transfer = [texture.rgba.buffer, texture.spec.buffer, ...(texture.clouds ? [texture.clouds.buffer] : [])];
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, texture }, transfer as ArrayBuffer[]);
};
