"use client";

import { useEffect } from "react";

type RevealState = "in" | "above" | "below";

// The "in" band is the viewport inset from its top and bottom edges. That inset
// is what makes the exit visible: a block starts easing out while still partly
// on screen as it leaves upward, and eases in just before it reaches the bottom.
const BAND_TOP = 0.14;
const BAND_BOTTOM = 0.08;

/**
 * Drives the enter / exit animation of every `[data-reveal]` block on the page.
 * The look lives in globals.css; this only reports which side of the band each
 * block is on, and only when a block crosses it — nothing runs per frame.
 */
export function ScrollReveal() {
  useEffect(() => {
    const blocks = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!blocks.length || typeof IntersectionObserver === "undefined") return;

    const classify = (el: HTMLElement): RevealState => {
      const { top, bottom } = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (bottom < vh * BAND_TOP) return "above";
      if (top > vh * (1 - BAND_BOTTOM)) return "below";
      return "in";
    };

    // The observer only fires when a block *crosses* the band, so a fast jump
    // (anchor link, End key, scroll restore) would leave the blocks it skipped
    // on a stale side. Re-reading every block on each crossing keeps them right.
    const refresh = () => {
      for (const el of blocks) {
        const state = classify(el);
        if (el.dataset.revealState !== state) el.dataset.revealState = state;
      }
    };

    const io = new IntersectionObserver(refresh, {
      rootMargin: `-${BAND_TOP * 100}% 0px -${BAND_BOTTOM * 100}% 0px`,
      threshold: 0,
    });
    blocks.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      blocks.forEach((el) => delete el.dataset.revealState);
    };
  }, []);

  return null;
}
