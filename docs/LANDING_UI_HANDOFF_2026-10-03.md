# Landing UI handoff — 3 Oct 2026

Written for the engineer / agent working on **live integration and logic** (Codex), so UI and logic stay in sync.
Author: Claude Code (UI pass). Sits next to `ROBINHOOD_YIELD_TRADING_MASTER_BRIEF_FINAL_V2.md`; it does not replace or restate it.

## 1. Boundaries

- This pass is **presentation only**. No Web3, adapter, hook, quote, valuation or contract logic was changed.
- One pure relocation touches the adapter file: `MOCK_MARKETS` moved from `lib/adapters/mock-adapter.ts` to `lib/markets/mock-markets.ts` and is re-exported from the adapter (same import path, tests unchanged). Nothing in UI imports it any more — safe to revert or keep.
- Rule from the live-integration note: **UI must not hardcode market data or token icons.** New UI reads normalized data through `useMarkets` / `useMarket` / `useFixedYieldQuote` / `useLongYieldQuote` and renders icons with `AssetIcon` (`assetMetadata.iconUrl`).
- Files owned by logic work and left alone: `lib/adapters/*`, `hooks/*`, `lib/web3/*`, `lib/contracts/*`, `lib/quotes/*`, `lib/demo/*`, `lib/metadata/*`, `types/*`.

## 2. What changed (by area)

### Hero (`components/landing/Hero.tsx`, `HeroVisual.tsx`, `heroStars.ts`)
- `HeroVisual` is now a single **canvas 2D** renderer (was ~1000 mutated SVG nodes + ~100 CSS animations). Same props (`activeStage`, `onSelectStage`, `isSplitLayout`, `stagePosRef`), no new dependency.
- Planet, ring system and lattice share one frame (axial tilt + roll). Back ring halves are drawn before the body, front halves after, so rings wrap the planet. Inner ice ring = Fixed, outer amber ring = Long, dark gap = the split. Dashes are fitted to the ring perimeter so the pattern has no seam at the tips.
- Camera keyframes are expressed as screen fractions (`CAM_DESKTOP` / `CAM_COMPACT` at the top of `HeroVisual.tsx`): zoom multiplier, focus point on the planet, anchor on screen. Tune framing there.
- Interaction: hover tilt/parallax, drag with inertia, click a mini-planet to select a stage, reset button (appears after a drag). Adaptive resolution lowers the pixel ratio if the device cannot hold ~40 fps. Honors `prefers-reduced-motion`; pauses off-screen / hidden tab.
- Copy panel (left): old copy eases out, then the new copy rises in (staggered). `COPY_OUT_MS` in `Hero.tsx` must stay slightly longer than the 170 ms fade in `globals.css` (`.hero-copy`).
- Removed: decorative orbit SVG layer, `backdrop-blur` on the stage bar, dead `.orbit-*`/`.pin-*`/`.hero-svg` CSS.
- Measured (headless Chrome, same frame rate, two rounds): CPU 65–79 % → 19–30 %; worst frame during stage travel 185 ms → ~30 ms. Not a real-device number; use it only to compare old vs new.

### "Open a position" (`components/landing/TradePreview.tsx`)
- Scroll-pinned walkthrough on roomy desktops (`.trade-runway` / `.trade-pin` in `globals.css`, media query mirrored by `PIN_QUERY` in the component — keep both in sync). Below `lg` or below 700 px height it is a normal stack and steps are tapped.
- Three steps (Strategy → Amount → Review) following the brief's Fixed / Long flows; PT/YT only as "powered by"; the Long risk sentence is the brief's wording.
- Review step has a lending-rate scenario switch to show *why* Fixed does not move (locked at purchase) while Long does.

### Links and market page
- `/trade` does not exist. Landing CTAs now go to `/markets/<id>?strategy=fixed|long&amount=<n>`. `app/markets/[marketId]/page.tsx` parses `strategy` / `amount` (Promise `searchParams`, validated; bad values fall back) and passes `initialStrategy` / `initialAmount` through `MarketDetailClient` to `TradePanel`.
- "Explore Contract Specs" → `/contracts`.

### Contracts (`components/contracts/*`, `components/layout/Navbar.tsx`)
- Navbar has a **Contracts** item. Network picker is a keyboard-accessible listbox (`NetworkSelect.tsx`) instead of a native `<select>`.

### Scroll reveal (`components/landing/ScrollReveal.tsx`, `globals.css`)
- Blocks tagged `data-reveal` ease in / out as they cross a viewport band. Never put `data-reveal` on an element that has its own `transition` (the reveal rules own `transition`).

## 3. Open items for the logic side

1. **Hardcoded landing data that should move to hooks** (UI is not yet fed by normalized data here): Hero stage stats and CTA hrefs (`usdg-morpho-26mar27`), `MarketsPreview` sample rows, `StrategySection` constants (16.9x, 6.23 %, 0.941/0.059), `FinalCTA` href. A single `useFeaturedMarket()` selector would remove most of it.
2. **Two number models on the landing.** The educational demo in `lib/demo/yield-split-demo.ts` (PT 0.941 → 16.9x) differs from the quote engine (PT ≈ 0.970, YT ≈ 0.030, ≈ 33x, break-even 6.23 %). Hero stage 1/2 and `StrategySection` still follow the demo; the market page and the walkthrough follow the engine. Decide one model.
3. `StrategySection` Long card shows −42.5 % at a 7.1 % rate while labelling break-even 6.23 % — a symptom of (2).

## 4. Gotchas

- Tailwind opacity steps **8, 12, 14, 16, 18 generate no CSS** (`border-white/12` renders as bright `#e5e7eb`). Use 10 / 15 / 20 / 25 / 35. Still used by many older components (markets, portfolio, strategy…); untouched.
- Hero canvas text uses the `Geist Mono` face loaded from `globals.css`; it repaints once the font is ready.
- Re-read files before editing: commits and parallel edits land continuously in this repo.

## 5. Verification run

`tsc --noEmit`, `eslint .`, `bun test` (23 pass) and `next build --webpack` all passed at the end of the pass. Behaviour checked in headless Chrome at 1920×1080, 1470×800, 1280×720, 1024×768, 768×1024 and 390×844.

---

## Update — polish round (same day)

UI only again; no logic file was touched. Everything below reads market data through the existing hooks.

### Data wiring (answers the live-integration note)
- New `components/landing/featuredMarket.ts`: `pickFeaturedMarket(markets)` = first tradable market **in the adapter's own order** (so the data side controls what leads), `marketHref(id, strategy?, amount?)`, and `DEFAULT_TICKET` (1,000) — the one reference ticket shared by the walkthrough and the split section so both hit the same cached quote key. The old `sampleMarket.ts` (hardcoded id) is deleted.
- `TradePreview.tsx` now uses `useMarkets`, `useFixedYieldQuote`, `useLongYieldQuote`, `useNetworkGuard`, `useTokenBalance`; icon via `AssetIcon`; data-mode label via `DataModeBadge`. Loading and "no market / error" states are real UI. Amount typing is debounced (350 ms) before it reaches the quote hooks, and the last good quote stays on screen (dimmed) while the next loads.
- No hardcoded wallet balance any more: shortcuts are 25 / 50 / MAX of the real balance when connected, fixed 100 / 500 / 1,000 otherwise. The preview does not block on balance (the market page does).
- `estimatedReturns` became optional on `LongYieldQuote`; when an adapter omits it the three lending-rate cases are derived from the quote's own fields (`rateScenarios()` in `TradePreview.tsx`). Worth keeping in mind if live quotes change shape.

### Open a position — Review step
- The "Rate drops / now / rises" tabs were always clickable; for Fixed nothing visibly changed because the payout is locked, which read as "disabled". Fixed now compares its locked payout with simply holding the vault at the chosen rate (`Fixed · stays` vs `Floating at x%`, plus a one-line verdict), so every click is visible. Long was already reactive.

### The Split Engine (`components/landing/YieldSplitSection.tsx`) — one frame
- Exactly one viewport on screens ≥ 1024 × 700 (`.zs-frame` in `globals.css`); flows normally elsewhere. The three summary cards were folded into the diagram (end-of-branch chips, branch captions, footer legend), so no content below the diagram.
- New diagram: vault module with token icon, soft-halo branches, shaded "locked" and "floating" areas, parity line, date chip that rides the handle, elapsed-time fill on the axis, a pulse on the handle until first use.
- Entrance (`.zs-*` CSS, driven by `data-zs` on the section): vault → asset line draws in → split node pops → Fixed and Long branch out → captions → flow dots. Replays whenever the frame re-enters view; shows everything at once with `prefers-reduced-motion` or before JS.
- Handle is a real slider (`role="slider"`, ←/→ ±5 %, Home/End); pointer mapping uses `getScreenCTM()` so it is exact at any scale.
- The top "light" is a radial gradient that falls to zero before every edge (it used to be a 384×12 px box with a hard edge).
- Data: symbol, name, icon, protocol, underlying/implied APY, maturity and `daysRemaining` come from the featured market; PT price from the shared fixed quote. `lib/demo/yield-split-demo.ts` is **unchanged** — the section builds a `YieldSplitDemoMarket` from live data and only the simulation parameters (offsets, thresholds, unit amount) remain the demo's. Offsets are scaled to the market's length so short/long markets keep the same timeline shape.
- Visible consequence: PT VALUE now reads ≈ $0.970 and exposure ≈ 33.5x (the quote engine) instead of the demo's $0.941 / 16.9x, so this section now agrees with the walkthrough and the market page. Hero stage 1/2 stats and `StrategySection` still show the demo model (see §3).

### Verification (end of day)
`tsc --noEmit`, `eslint .`, `bun test` (28 pass) and `next build --webpack` pass. Checked in headless Chrome: drag, keyboard slider, zipped state, reduced motion, 1920 / 1470 / 1280 / 1024 / 390 widths. Working-tree changes under `hooks/` and `lib/adapters/` at the time of writing belong to the logic work, not this pass.

---

## Update — live-data wiring audit (same day)

Verified against the real Pendle list on chain 4663 and the Alchemy RPCs (`eth_chainId` OK on both; both builds, mock and live, render with no console errors).

**Landing now reads normalized data everywhere it shows a market** (via `useMarkets` / quote hooks; nothing hardcoded): Hero stage stats / copy / CTA links (`heroStages.ts`), Markets table (`MarketsPreview.tsx`, icons through `AssetIcon`, `DataModeBadge`), strategy simulator (`StrategySection.tsx`), split engine, walkthrough, final CTA. Shared selection lives in `featuredMarket.ts`:
- `isFeaturable`: tradable, `daysRemaining > 0`, implied / underlying APY within 0–100 %, liquidity > 0 (the live list contains matured markets and raw values such as an implied APY of 3,916 %).
- `pickFeaturedMarket`: active + yielding first, then adapter order. `pickPreviewMarkets`: most liquid featurable.
- `DEFAULT_TICKET`: 1,000 in mock, **100 in live** — quotes are in token units and a thin book rejects 1,000 of a ~$100 token (`Multi-routing: No routes available`).
- Landing prices are shown in the market's own asset (`0.984 USDG`), not `$`.

**For the logic side (not changed here):**
1. Live `getMarkets()` returns matured and absurd markets; filtering is done in the UI only. Consider flagging/filtering in the adapter.
2. Long quotes fail on some markets even at small tickets (NVDA: `No routes available` for YT); the UI shows `—`.
3. The live adapter is mainnet-only: `NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV=testnet` + `live` yields no markets.
4. The Alchemy RPC key is a `NEXT_PUBLIC_*` variable, so it ships to the browser. Restrict it by allowed domains in the Alchemy dashboard. Vercel needs both RPC URLs, `…_CHAIN_ENV` and `…_DATA_MODE` set, then a redeploy.
5. Still static by design: `MaturityPreview` (illustrative portfolio simulation) and the Hero headline "10x Yield Exposure." (live leverage differs by market).
