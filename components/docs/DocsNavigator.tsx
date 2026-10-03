"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export const DOCS_SECTIONS = [
  ["start", "00", "Start here"],
  ["fixed", "01", "Fixed Yield"],
  ["long", "02", "Trading Yield"],
  ["rates", "03", "Understanding rates"],
  ["maturity", "04", "Maturity"],
  ["risk", "05", "Risk"],
  ["wallet", "06", "Wallet & network"],
  ["preview-live", "07", "Preview vs live"],
  ["transparency", "08", "Transparency"],
  ["glossary", "09", "Glossary"],
] as const;

const DOCS_HEADER_OFFSET = 120;

function scrollToSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;

  section.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `/docs#${id}`);
}

export function DocsNavigator() {
  // Must match the server render ("start"); the URL hash is applied after hydration, in the effect below.
  const [activeId, setActiveId] = useState<string>("start");

  useEffect(() => {
    const sectionElements = DOCS_SECTIONS.map(([id]) => document.getElementById(id)).filter(
      (section): section is HTMLElement => section !== null,
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        const nextId = visible.target.id;
        setActiveId(nextId);
        window.history.replaceState(null, "", `/docs#${nextId}`);
      },
      {
        rootMargin: `-${DOCS_HEADER_OFFSET}px 0px -55% 0px`,
        threshold: [0, 0.2, 0.5, 1],
      },
    );

    sectionElements.forEach((section) => observer.observe(section));

    const initialHash = window.location.hash.slice(1);
    if (DOCS_SECTIONS.some(([id]) => id === initialHash)) {
      window.requestAnimationFrame(() => {
        setActiveId(initialHash);
        document.getElementById(initialHash)?.scrollIntoView({ block: "start" });
      });
    }

    return () => observer.disconnect();
  }, []);

  const handleNavigate = (id: string) => {
    setActiveId(id);
    scrollToSection(id);
  };

  return (
    <>
      {/* Desktop Sticky Pinned Sidebar */}
      <aside className="hidden w-[250px] shrink-0 lg:block">
        <div className="sticky top-28 pt-1">
          {/* Header Title */}
          <div className="mono mb-4 text-[11px] uppercase tracking-[0.2em] text-muted-dark flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ice/60 shrink-0" />
            CLEAVE / GUIDE
          </div>

          {/* Nav Items List */}
          <nav aria-label="Guide sections" className="relative flex flex-col border-l border-white/10">
            {DOCS_SECTIONS.map(([id, num, title]) => {
              const isActive = activeId === id;
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    handleNavigate(id);
                  }}
                  className={`group relative flex items-center justify-between border-l-2 py-2.5 pl-4 pr-3 text-[13px] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ice ${
                    isActive
                      ? "-ml-[2px] border-ice bg-gradient-to-r from-ice/15 via-ice/5 to-transparent text-white font-medium"
                      : "-ml-[2px] border-transparent text-muted hover:border-white/30 hover:bg-white/[0.025] hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className={`mono text-[11px] shrink-0 transition-colors ${
                        isActive ? "text-ice font-semibold" : "text-muted-dark group-hover:text-muted"
                      }`}
                    >
                      {num} /
                    </span>
                    <span className="truncate">{title}</span>
                  </span>

                  {/* Active glowing indicator pill */}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-ice shadow-[0_0_8px_#3B86FF] shrink-0" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Bottom Card Summary */}
          <div className="mt-8 pt-5 border-t border-white/10 text-[12px] leading-relaxed text-muted-dark flex flex-col gap-3">
            <p className="m-0">
              How to choose, read, and manage Fixed Yield and Trading Yield.
            </p>
            <Link
              href="/markets"
              className="mono text-[11px] tracking-[0.1em] text-ice hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              Explore markets &rarr;
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Dropdown Section Selector */}
      <div className="mb-8 lg:hidden">
        <label htmlFor="docs-section" className="mono mb-2 block text-[10px] uppercase tracking-[0.14em] text-muted-dark">
          On this page
        </label>
        <div className="relative">
          <select
            id="docs-section"
            value={activeId}
            onChange={(event) => handleNavigate(event.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-white/16 bg-surface px-4 text-[13px] text-foreground focus:border-ice/50 focus:outline-none appearance-none"
          >
            {DOCS_SECTIONS.map(([id, num, title]) => (
              <option key={id} value={id}>
                {num} / {title}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
