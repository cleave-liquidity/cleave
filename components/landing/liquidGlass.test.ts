import { describe, expect, it } from "bun:test";
import { computeLensMap, supportsBackdropLens } from "./liquidGlass";

const W = 200;
const H = 56;
const map = computeLensMap(W, H);
const at = (x: number, y: number) => {
  const i = (y * W + x) * 4;
  return { r: map[i], g: map[i + 1] };
};

describe("liquid glass lens map", () => {
  it("leaves the middle of the pill undistorted", () => {
    expect(at(100, 28)).toEqual({ r: 128, g: 128 });
  });

  it("pulls samples inward from every edge", () => {
    expect(at(0, 28).r).toBeGreaterThan(200); // left end samples from the right
    expect(at(W - 1, 28).r).toBeLessThan(60); // right end samples from the left
    expect(at(100, 0).g).toBeGreaterThan(200); // top edge samples from below
    expect(at(100, H - 1).g).toBeLessThan(60); // bottom edge samples from above
  });

  it("fades out smoothly instead of stepping at the bezel", () => {
    const edge = at(100, 0).g - 128;
    const mid = at(100, 8).g - 128;
    const inner = at(100, 14).g - 128;
    expect(edge).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(inner);
  });

  it("is symmetric left to right", () => {
    expect(at(10, 28).r - 128).toBe(128 - at(W - 11, 28).r);
  });
});

describe("backdrop lens support", () => {
  it("is on for Chromium browsers only", () => {
    expect(supportsBackdropLens("Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/152.0.0.0 Safari/537.36")).toBe(true);
    expect(supportsBackdropLens("Mozilla/5.0 (Windows) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0")).toBe(true);
    expect(supportsBackdropLens("Mozilla/5.0 (Macintosh) AppleWebKit/537.36 HeadlessChrome/152.0.0.0 Safari/537.36")).toBe(true);
    expect(supportsBackdropLens("Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15")).toBe(false);
    expect(supportsBackdropLens("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/150.0 Mobile Safari/604.1")).toBe(false);
    expect(supportsBackdropLens("Mozilla/5.0 (Macintosh) Gecko/20100101 Firefox/150.0")).toBe(false);
  });
});
