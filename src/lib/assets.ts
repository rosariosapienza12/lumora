import "server-only";

export const MAX_ASSET_BYTES = 4 * 1024 * 1024;
/** Larger than any real photo; anything bigger is a crafted header. */
const MAX_SIDE = 20_000;

type ImageMime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const u32le = (b: Uint8Array, i: number) => b[i] + (b[i + 1] << 8) + (b[i + 2] << 16) + ((b[i + 3] << 24) >>> 0);
const sizeOk = (w: number, h: number) => w > 0 && h > 0 && w <= MAX_SIDE && h <= MAX_SIDE;
const ascii = (b: Uint8Array, i: number, s: string) => [...s].every((c, k) => b[i + k] === c.charCodeAt(0));

/** PNG: signature, IHDR first, every chunk inside the file, IEND last. */
function isPng(b: Uint8Array) {
  if (!(b[0] === 0x89 && ascii(b, 1, "PNG") && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a)) return false;
  let i = 8;
  let first = true;
  while (i + 12 <= b.length) {
    const len = u32be(b, i);
    const end = i + 12 + len;
    if (len > b.length || end > b.length) return false;
    if (first) {
      if (!ascii(b, i + 4, "IHDR") || len !== 13 || !sizeOk(u32be(b, i + 8), u32be(b, i + 12))) return false;
      first = false;
    }
    if (ascii(b, i + 4, "IEND")) return end === b.length;
    i = end;
  }
  return false;
}

/** JPEG: segments walk from SOI to SOS with a frame header (SOF) giving the size, then an EOI marker. */
function isJpeg(b: Uint8Array) {
  if (!(b[0] === 0xff && b[1] === 0xd8)) return false;
  let i = 2;
  let sized = false;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return false;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i++; // fill byte
      continue;
    }
    const len = u16be(b, i + 2);
    if (len < 2 || i + 2 + len > b.length) return false;
    // SOF0-3, 5-7, 9-11, 13-15 carry height and width.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      if (len < 7 || !sizeOk(u16be(b, i + 7), u16be(b, i + 5))) return false;
      sized = true;
    }
    if (marker === 0xda) {
      // Start of scan: compressed data follows; the file must end with EOI (zero padding allowed),
      // so nothing can hide after the image.
      if (!sized) return false;
      let end = b.length;
      while (end > 0 && b[end - 1] === 0x00) end--;
      return end - 2 > i + 2 + len && b[end - 2] === 0xff && b[end - 1] === 0xd9;
    }
    i += 2 + len;
  }
  return false;
}

/** WebP: RIFF size matches the file, a VP8 / VP8L / VP8X chunk with a sane canvas. */
function isWebp(b: Uint8Array) {
  if (!(ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP")) || b.length < 30) return false;
  const riff = u32le(b, 4) + 8;
  if (riff !== b.length && riff + 1 !== b.length) return false;
  if (ascii(b, 12, "VP8X")) return sizeOk(1 + (b[24] | (b[25] << 8) | (b[26] << 16)), 1 + (b[27] | (b[28] << 8) | (b[29] << 16)));
  if (ascii(b, 12, "VP8 ")) return b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a && sizeOk(u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff);
  if (ascii(b, 12, "VP8L")) {
    if (b[20] !== 0x2f) return false;
    const bits = u32le(b, 21);
    return sizeOk((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
  }
  return false;
}

/** GIF: header, logical screen, then extension and image blocks up to the trailer, with at least one image. */
function isGif(b: Uint8Array) {
  if (!(ascii(b, 0, "GIF8") && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61)) return false;
  if (!sizeOk(u16le(b, 6), u16le(b, 8))) return false;
  let i = 13 + (b[10] & 0x80 ? 3 * 2 ** ((b[10] & 0x07) + 1) : 0);
  let images = 0;
  const skipSubBlocks = () => {
    while (i < b.length && b[i] !== 0) i += b[i] + 1;
    i++; // block terminator
  };
  while (i < b.length) {
    const block = b[i];
    // The trailer must be the last byte: nothing may hide after the image.
    if (block === 0x3b) return images > 0 && i === b.length - 1;
    if (block === 0x21) {
      i += 2;
      skipSubBlocks();
    } else if (block === 0x2c) {
      if (i + 10 > b.length) return false;
      const packed = b[i + 9];
      i += 10 + (packed & 0x80 ? 3 * 2 ** ((packed & 0x07) + 1) : 0);
      i++; // LZW minimum code size
      skipSubBlocks();
      images++;
    } else {
      return false;
    }
  }
  return false;
}

/**
 * Detects the real image type and checks the whole file structure. The
 * browser-sent type and the file name are ignored; anything that is not a
 * complete PNG, JPEG, WebP or GIF (SVG included, which can carry scripts, and
 * "polyglot" files that only start like an image) is rejected.
 */
export function sniffImage(bytes: Uint8Array): ImageMime | null {
  if (bytes.length < 12) return null;
  if (isPng(bytes)) return "image/png";
  if (isJpeg(bytes)) return "image/jpeg";
  if (isWebp(bytes)) return "image/webp";
  if (isGif(bytes)) return "image/gif";
  return null;
}
