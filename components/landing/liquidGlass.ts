/**
 * Refraction map for the floating navbar's "liquid glass" (an SVG feDisplacementMap input).
 *
 * Each pixel encodes where to sample the backdrop from: R is the x shift, G the y shift, 128 = no shift.
 * Inside the pill the map is neutral; within `bezel` px of the edge it pulls samples inward along the
 * pill's own curvature, so the page behind appears to bend at the rim like a thick piece of glass.
 */
export function computeLensMap(width: number, height: number, bezel = Math.min(height / 2, 16)): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  const radius = height / 2;
  const coreStart = radius;
  const coreEnd = Math.max(radius, width - radius);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      // Nearest point on the pill's centre line; the direction to it is the inward edge normal.
      const nearestX = Math.min(Math.max(px, coreStart), coreEnd);
      const dx = nearestX - px;
      const dy = radius - py;
      const distance = Math.hypot(dx, dy);
      const depth = radius - distance; // 0 at the edge, growing inward

      let shiftX = 0;
      let shiftY = 0;
      if (depth < bezel && distance > 1e-6) {
        const falloff = 1 - Math.max(depth, 0) / bezel;
        const strength = falloff * falloff;
        shiftX = (dx / distance) * strength;
        shiftY = (dy / distance) * strength;
      }

      const i = (y * width + x) * 4;
      data[i] = 128 + 127 * shiftX;
      data[i + 1] = 128 + 127 * shiftY;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }

  return data;
}

/** Renders the refraction map to a PNG data URL (browser only). */
export function buildLensMapUrl(width: number, height: number): string | null {
  if (typeof document === "undefined" || width < 8 || height < 8) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const pixels = computeLensMap(width, height);
  context.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
  return canvas.toDataURL("image/png");
}

/** SVG filters inside `backdrop-filter` only work in Chromium; elsewhere the CSS blur fallback is used. */
export function supportsBackdropLens(userAgent: string): boolean {
  // "Chrome/" also matches HeadlessChrome and Chromium-based Edge/Opera; iOS Chrome ("CriOS") is WebKit and does not.
  return /Chrome\/\d+/.test(userAgent);
}
