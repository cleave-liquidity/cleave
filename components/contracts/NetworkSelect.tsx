"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { RobinhoodNetwork } from "@/types/market";

export interface NetworkOption {
  value: RobinhoodNetwork;
  label: string;
  chainId: number;
  /** One-line context shown under the name. */
  hint: string;
}

/**
 * Network picker for the contract registry. A listbox (not a native <select>) so the
 * trigger, the options and the chain ids line up with the rest of the app — with
 * full keyboard support: ↑/↓/Home/End to move, Enter/Space to pick, Esc to close.
 */
export function NetworkSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: RobinhoodNetwork;
  options: readonly NetworkOption[];
  onChange: (value: RobinhoodNetwork) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const [active, setActive] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const listId = `${baseId}-list`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const choose = (i: number) => {
    onChange(options[i].value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!open) return openList();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActive((i) => (i + step + options.length) % options.length);
        return;
      }
      case "Home":
      case "End":
        if (!open) return;
        e.preventDefault();
        setActive(e.key === "Home" ? 0 : options.length - 1);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) choose(active);
        else openList();
        return;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        return;
      case "Tab":
        setOpen(false);
        return;
    }
  };

  return (
    <div ref={rootRef} className="relative flex flex-col gap-2">
      <span id={labelId} className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">
        {label}
      </span>

      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelId}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`flex min-h-[48px] w-full min-w-[300px] items-center justify-between gap-4 border bg-surface px-4 text-left transition-colors sm:w-[360px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice ${
          open ? "border-ice/60" : "border-white/15 hover:border-white/30"
        }`}
      >
        <span className="flex min-w-0 flex-col py-1.5">
          <span className="truncate text-[14px] text-foreground">{selected.label}</span>
          <span className="mono text-[10px] tracking-[0.1em] text-muted-dark">CHAIN ID {selected.chainId}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          className="absolute left-0 top-full z-30 mt-2 w-full min-w-[300px] border border-white/15 bg-surface-raised py-1 shadow-[0_18px_50px_rgba(0,0,0,0.6)] sm:w-[360px]"
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={optionId(i)}
                role="option"
                aria-selected={isSelected}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-colors ${
                  active === i ? "bg-white/[0.06]" : ""
                }`}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={`text-[14px] ${isSelected ? "text-foreground" : "text-muted-light"}`}>{option.label}</span>
                  <span className="mono text-[10px] tracking-[0.1em] text-muted-dark">
                    CHAIN ID {option.chainId} · {option.hint}
                  </span>
                </span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-ice" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
