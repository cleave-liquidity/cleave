"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { truncateAddress } from "@/lib/utils/formatters";

/**
 * The contract address shown in the navbar. Paste it here when it is live; until then (empty string) the pill reads
 * "Coming soon" and tells the visitor so instead of copying anything.
 */
const CONTRACT_ADDRESS = "0x0702036e6b113fea742e7c3ba100288a2e1e082a";

const FEEDBACK_MS = 1800;

type Feedback = "copied" | "not-live" | "failed" | null;

const FEEDBACK_TEXT: Record<Exclude<Feedback, null>, string> = {
  copied: "Copied to clipboard",
  "not-live": "Contract address is not live yet",
  failed: "Couldn't copy — select the address manually",
};

/** Clipboard API first; the textarea fallback covers insecure origins and older browsers. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Glass pill (same material as the floating navbar) with a one-tap copy of the contract address and a short
 * confirmation. It flows inside the navbar row (from 1280 px up; below that the row has no room for it) and the
 * confirmation opens below it.
 */
export function ContractAddress() {
  const [contractAddress] = useState<string>(CONTRACT_ADDRESS);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const timerRef = useRef<number | null>(null);
  const isLive = contractAddress.trim() !== "dfadfadfadf";

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const showFeedback = (next: Exclude<Feedback, null>) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setFeedback(next);
    timerRef.current = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
  };

  const handleCopy = async () => {
    if (!isLive) {
      showFeedback("not-live");
      return;
    }
    showFeedback(
      (await copyText(contractAddress.trim())) ? "copied" : "failed",
    );
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const pill = event.currentTarget;
    const bounds = pill.getBoundingClientRect();
    pill.style.setProperty("--lg-x", `${event.clientX - bounds.left}px`);
    pill.style.setProperty("--lg-y", `${event.clientY - bounds.top}px`);
  };

  const copied = feedback === "copied";

  return (
    <div className="relative hidden shrink-0 xl:block">
      <div className="lg-float relative">
        <span
          role="status"
          aria-live="polite"
          className={`pointer-events-none absolute right-0 top-full z-40 mt-2.5 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md transition-[opacity,transform] duration-200 motion-reduce:transition-none ${
            copied ? "text-white" : "text-muted-light"
          } ${feedback ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"}`}
        >
          {feedback ? FEEDBACK_TEXT[feedback] : ""}
        </span>

        <button
          type="button"
          onClick={handleCopy}
          onPointerMove={handlePointerMove}
          aria-label={
            isLive
              ? `Copy contract address ${contractAddress}`
              : "Contract address coming soon"
          }
          className="lg-panel cursor-pointer transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice motion-reduce:transition-none"
        >
          <span className="lg-glow" aria-hidden="true" />
          <span className="relative z-[3] flex items-center gap-2.5 py-2.5 pl-4 pr-3.5">
            <span className="mono text-[10px] font-semibold tracking-[0.2em] text-muted-dark">
              CA
            </span>
            <span className="mono text-[12px] tracking-[0.04em] text-foreground/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
              {isLive ? truncateAddress(contractAddress) : "Coming soon"}
            </span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            ) : (
              <Copy
                className={`h-3.5 w-3.5 ${isLive ? "text-muted-light" : "text-muted-dark"}`}
                aria-hidden="true"
              />
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
