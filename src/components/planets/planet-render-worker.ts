/// <reference lib="webworker" />
import { createSphere, type SphereOptions } from "./sphere";
import type { PlanetTexture } from "./textures";

/** Draws one large planet on an OffscreenCanvas, off the page's main thread. */
type Message =
  | { type: "init"; canvas: OffscreenCanvas; size: number; options: SphereOptions }
  | { type: "texture"; texture: PlanetTexture }
  | { type: "visible"; visible: boolean }
  | { type: "stop" };

let canvas: OffscreenCanvas | null = null;
let sphere: ReturnType<typeof createSphere> | null = null;

self.onmessage = (e: MessageEvent<Message>) => {
  const m = e.data;
  if (!m || typeof m !== "object") return;
  if (m.type === "init") {
    sphere?.stop();
    canvas ??= m.canvas;
    if (!canvas) return;
    canvas.width = m.size;
    canvas.height = m.size;
    const ctx = canvas.getContext("2d");
    sphere = ctx ? createSphere(ctx, m.options) : null;
  } else if (m.type === "texture") {
    sphere?.setTexture(m.texture);
  } else if (m.type === "visible") {
    sphere?.setVisible(Boolean(m.visible));
  } else if (m.type === "stop") {
    sphere?.stop();
    sphere = null;
  }
};
