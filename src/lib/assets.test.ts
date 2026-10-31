import { describe, expect, it } from "vitest";
import { sniffImage } from "./assets";

// Real images drawn by a browser (3x2 canvas) plus the classic 1x1 GIF.
const SAMPLES = {
  "image/png": "iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAHklEQVR4AWKKtv36//9W9/8gmokBCGI61gFJBgYAAAAA///gzUzSAAAABklEQVQDAKYGCamkJ/EAAAAAAElFTkSuQmCC",
  "image/jpeg":
    "/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAACAAMDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAaEAEBAQEBAQEAAAAAAAAAAAABAgMABEEh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAwj/xAAdEQABAgcAAAAAAAAAAAAAAAAAAQMCBDI0cXKx/9oADAMBAAIRAxEAPwCQb+nX1WXtre1kTBWlNJMyTJ+/CQA+AHOc625G1a1h4gjla5P/2Q==",
  "image/webp":
    "UklGRjoCAABXRUJQVlA4WAoAAAAgAAAAAgAAAQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZWUDggTAAAANABAJ0BKgMAAgAAwBIlqAJ0APSzsQwAAP730HONu/evrdhYar/n/sz1gr/+yob2L7//Jv//7sL//7KhvYvv/8m//uwpK+yMFfYAAAA=",
  "image/gif": "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
} as const;

const bytes = (b64: string) => new Uint8Array(Buffer.from(b64, "base64"));
const text = (s: string) => new Uint8Array(Buffer.from(s, "latin1"));
const join = (a: Uint8Array, b: Uint8Array) => {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
};

describe("sniffImage", () => {
  it.each(Object.entries(SAMPLES))("accepts a real %s", (mime, b64) => {
    expect(sniffImage(bytes(b64))).toBe(mime);
  });

  it("rejects files that only start like an image", () => {
    const fakes = [
      "GIF89a;alert(1)//",
      "GIF89a\u0001\u0000\u0001\u0000\u0000\u0000\u0000<script>alert(1)</script>",
      "\u0089PNG\r\n\u001a\n<script>alert(1)</script>",
      "ÿØÿà<html><script>alert(1)</script></html>",
      "RIFF\u0010\u0000\u0000\u0000WEBPalert(1)//",
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
      "<html><script>alert(1)</script></html>",
    ];
    for (const fake of fakes) expect(sniffImage(text(fake)), JSON.stringify(fake)).toBeNull();
  });

  it("rejects a real PNG with a script appended after its end", () => {
    expect(sniffImage(join(bytes(SAMPLES["image/png"]), text("<script>alert(1)</script>")))).toBeNull();
  });

  it("rejects a real GIF with a script appended after the trailer", () => {
    expect(sniffImage(join(bytes(SAMPLES["image/gif"]), text("alert(1)")))).toBeNull();
  });

  it("rejects a real JPEG or WebP with a script appended after its end", () => {
    expect(sniffImage(join(bytes(SAMPLES["image/jpeg"]), text("<script>alert(1)</script>")))).toBeNull();
    expect(sniffImage(join(bytes(SAMPLES["image/webp"]), text("<script>alert(1)</script>")))).toBeNull();
  });

  it("accepts a JPEG with zero padding after its end", () => {
    expect(sniffImage(join(bytes(SAMPLES["image/jpeg"]), new Uint8Array(16)))).toBe("image/jpeg");
  });

  it("rejects truncated images", () => {
    for (const b64 of Object.values(SAMPLES)) {
      const b = bytes(b64);
      expect(sniffImage(b.slice(0, Math.floor(b.length / 2)))).toBeNull();
    }
  });
});
