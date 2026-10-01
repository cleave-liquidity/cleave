# Robinhood Chain Yield Trading Experience
## FINAL V2 — Product, UX, Design, Frontend & Web3 Architecture Brief

> Status: Final pre-development brief  
> Product direction: Retail-first yield trading experience  
> Target network: Robinhood Chain  
> Primary inspiration: Pendle yield-tokenization mechanics  
> Implementation priority: Fast, premium, frontend-first, contract-ready  
> This file is the single source of truth for design and implementation.

---

# 0. Final Positioning

This project is **NOT a new Pendle protocol competing directly with Pendle on Robinhood Chain**.

Pendle already exists on Robinhood Chain.

Our product should instead be positioned as:

> **A retail-first yield trading experience for Robinhood Chain.**

The product simplifies the complex concepts behind yield trading into two clear strategies:

1. **Fixed Yield** — predictable yield exposure.
2. **Long Yield** — exposure to future yield.

PT and YT remain important protocol concepts, but they should **not dominate the first layer of the user experience**.

The user should understand the strategy first. Protocol terminology can appear later as advanced information.

---

# 1. Executive Summary

The application lets users discover yield markets on Robinhood Chain and choose how they want exposure to yield.

The core experience is:

```text
Yield Market
    ↓
Choose Strategy
    ↓
┌──────────────────┬──────────────────┐
│   Fixed Yield    │    Long Yield    │
│ Predictable Rate │  Future Exposure │
└──────────────────┴──────────────────┘
    ↓
Open Position
    ↓
Portfolio
    ↓
Exit / Claim / Redeem
```

The central idea is:

> **Yield can be separated and traded.**

The product is inspired by Pendle's PT/YT model, but the frontend should feel dramatically easier for retail users.

The application should not require first-time users to understand Principal Token, Yield Token, implied-yield mechanics, AMM mechanics, or tokenization internals before they can use the product.

Instead, the first interaction should simply be:

```text
Do you want predictable yield?

or

Do you want exposure to future yield?
```

---

# 2. What We Are Building

We are building a **yield trading interface on Robinhood Chain**.

The app aggregates or connects to yield markets through an adapter layer.

Potential market sources may include:

- Pendle markets
- future Robinhood Chain yield protocols
- vault-based yield sources
- lending-based yield sources
- staking-based yield-bearing assets
- other compatible yield markets

The frontend must remain **source-agnostic**.

The user should not need to know which underlying integration powers the market unless they open advanced market details.

---

# 3. What We Are NOT Building

The MVP is NOT:

- a new PT/YT protocol
- a new AMM
- a new liquidity protocol
- a staking platform
- a lending protocol
- a generic token swap
- a Robinhood clone
- a Pendle visual clone
- a generic Web3 dashboard
- a meme coin trading interface
- an official Robinhood product

Robinhood Chain is the network/infrastructure. Our product must have its own independent brand identity.

---

# 4. Core Mechanic

A valid market begins with a yield-bearing asset.

```text
Underlying Asset
       +
Yield Source
       ↓
Yield-Bearing Asset
       ↓
Yield Market
       ↓
┌───────────────────────┐
│                       │
PT                      YT
│                       │
Fixed Yield             Long Yield
```

For advanced users:

- **PT** represents principal exposure.
- **YT** represents exposure to future yield.

For normal users:

- **Fixed Yield** = lock in a more predictable yield outcome.
- **Long Yield** = take a position on future yield.

---

# 5. Important Asset Constraint

Do NOT treat every arbitrary ERC-20 token as automatically yield-bearing.

A token only becomes relevant to this product if a credible yield source exists.

```text
Asset
  +
Yield Source
  ↓
Yield-Bearing Asset
  ↓
Tradable Yield Market
```

Examples of plausible yield sources:

- lending vault
- staking wrapper
- protocol reward-bearing asset
- stablecoin yield vault
- existing yield-tokenization market

During the MVP, this data may be mocked. However, mocked data must still look financially plausible.

---

# 6. Main Product

There is only one main product:

# Yield Market

Each market offers two strategy modes:

```text
┌──────────────────────────────────────────┐
│               YIELD MARKET               │
│                                          │
│    FIXED YIELD          LONG YIELD       │
│                                          │
│   Predictable Rate      Future Yield     │
│                                          │
│       PT-backed          YT-backed       │
│                                          │
└──────────────────────────────────────────┘
```

Supporting features:

- Market Explorer
- Market Detail
- Fixed Yield
- Long Yield
- Portfolio
- Exit Position
- Claim Yield
- Redeem
- Wallet
- Network Handling

---

# 7. Primary User Flow

```text
LANDING
   ↓
EXPLORE MARKETS
   ↓
SELECT MARKET
   ↓
MARKET DETAIL
   ↓
┌───────────────────┬───────────────────┐
│    FIXED YIELD    │    LONG YIELD     │
│                   │                   │
│  Predictable Rate │ Future Exposure   │
└─────────┬─────────┴─────────┬─────────┘
          │                   │
          ▼                   ▼
       Buy PT              Buy YT
          │                   │
          └──────────┬────────┘
                     ▼
               OPEN POSITION
                     ↓
                 PORTFOLIO
                     ↓
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
      EXIT EARLY             MATURITY
          │                     │
          ▼                     ▼
        SELL              PT: REDEEM
                          YT: EXPIRES
                          + CLAIM YIELD
```

---

# 8. Strategy 01 — Fixed Yield

## User Intent

The user wants a more predictable yield outcome.

Plain-language explanation:

> Lock a predictable rate until maturity.

Advanced explanation:

> The user gains PT exposure. PT converges toward the underlying asset value at maturity.

## Fixed Yield Flow

```text
Select Market
    ↓
Fixed Yield
    ↓
Enter Amount
    ↓
Review Quote
    ↓
Approve Token
    ↓
Confirm Transaction
    ↓
Open PT Position
    ↓
Portfolio
    ↓
┌─────────────────────┬──────────────────────┐
│ Sell Before Maturity│ Redeem At Maturity   │
└─────────────────────┴──────────────────────┘
```

## Fixed Yield Panel

Required information:

- Input token
- Input amount
- Wallet balance
- Quoted fixed APY
- Implied APY
- PT received
- Maturity
- Time remaining
- Estimated maturity value
- Price impact
- Slippage
- Network fee
- Transaction state

Example:

```text
Fixed Yield

You Pay
1,000 USDG

You Receive
1,042.18 PT-USDG

Quoted Fixed APY
5.31%

Maturity
Mar 28, 2027

Estimated Value at Maturity
1,042.18 USDG

[ Open Fixed Position ]
```

---

# 9. Strategy 02 — Long Yield

## User Intent

The user believes future realized yield may outperform the market's implied yield.

Plain-language explanation:

> Take exposure to future yield.

Advanced explanation:

> The user buys YT and receives the underlying yield stream until maturity.

## Long Yield Flow

```text
Select Market
    ↓
Long Yield
    ↓
Enter Amount
    ↓
Review YT Exposure
    ↓
Review Risk
    ↓
Approve Token
    ↓
Confirm Transaction
    ↓
Open YT Position
    ↓
Portfolio
    ↓
┌──────────────────────┬──────────────────────┐
│ Sell Before Maturity │ Claim Accrued Yield  │
└──────────────────────┴──────────────────────┘
```

## Important YT Lifecycle

YT behaves differently from PT.

YT:

- receives underlying yield until maturity
- can accumulate claimable yield
- can be sold before maturity
- trends toward zero value at maturity
- does NOT redeem principal at maturity

There must be NO "Redeem Principal" action for YT.

## Long Yield Panel

Required information:

- Input token
- Input amount
- YT received
- Underlying APY
- Implied APY
- Estimated break-even information
- Estimated yield exposure
- Maturity
- Time remaining
- Price impact
- Network fee
- Claimable yield
- Risk warning
- Transaction state

Required plain-language risk message:

> If the underlying yield is lower than the implied yield you paid for, a large portion of the position value can be lost.

Required break-even explanation:

> This position benefits when average realized yield until maturity is higher than the implied yield priced by the market.

---

# 10. APY Model

The data model must avoid contradictory rates.

`impliedApy` is the primary market-implied rate.

Do NOT store an unrelated independent `fixedApy`.

Instead:

```text
Market Implied APY
        ↓
Trade Size
        ↓
Price Impact
        ↓
Quoted Fixed APY
```

Fixed APY shown to the user should be calculated from the trade quote.

Long Yield return must also be calculated. Do NOT hardcode an arbitrary `longYieldApy`.

Long Yield estimations should depend on assumptions such as:

- current underlying APY
- implied APY
- time to maturity
- trade size
- YT price
- assumed future yield

The UI must label estimates as estimates.

---

# 11. Recommended Market Model

```ts
export interface YieldMarket {
  id: string;
  symbol: string;
  name: string;
  underlyingAsset: string;
  quoteAsset: string;
  yieldSource: string;

  underlyingApy: number;
  impliedApy: number;

  maturity: string;
  liquidityUsd: number;

  status: "active" | "maturing" | "matured" | "paused";

  ptAddress?: `0x${string}`;
  ytAddress?: `0x${string}`;

  sourceProtocol?: string;
}
```

Derived values should be calculated separately.

```ts
export interface FixedYieldQuote {
  inputAmount: number;
  ptReceived: number;
  quotedFixedApy: number;
  priceImpact: number;
  estimatedMaturityValue: number;
}
```

```ts
export interface LongYieldQuote {
  inputAmount: number;
  ytReceived: number;
  underlyingApy: number;
  impliedApy: number;
  estimatedBreakEvenApy: number;
  priceImpact: number;
  estimatedYieldExposure: number;
}
```

---

# 12. Position Models

Fixed and Long positions should not share identical lifecycle logic.

## Fixed Position

```ts
export interface FixedYieldPosition {
  id: string;
  marketId: string;
  strategy: "fixed";
  depositedAmount: number;
  ptAmount: number;
  currentValue: number;
  pnl: number;
  quotedFixedApy: number;
  maturity: string;
  openedAt: string;
  status: "active" | "matured" | "redeemed" | "closed";
}
```

## Long Position

```ts
export interface LongYieldPosition {
  id: string;
  marketId: string;
  strategy: "long";
  depositedAmount: number;
  ytAmount: number;
  currentValue: number;
  pnl: number;
  claimableYield: number;
  underlyingApyAtOpen: number;
  impliedApyAtOpen: number;
  maturity: string;
  openedAt: string;
  status: "active" | "matured" | "closed";
}
```

---

# 13. MVP Pages

## `/`
Landing page.

Purpose:

- explain the product
- explain yield splitting
- introduce Fixed vs Long
- preview markets
- send users into Markets

## `/markets`
Yield Market Explorer.

Purpose:

- browse yield markets
- compare yield
- compare maturity
- compare liquidity
- filter markets

## `/markets/[marketId]`
Market Detail + Trading.

Purpose:

- inspect market
- inspect yield source
- inspect rates
- inspect maturity
- choose strategy
- open position

## `/portfolio`
Portfolio.

Purpose:

- view Fixed positions
- view Long positions
- view PnL
- view maturity
- sell
- claim yield
- redeem PT

---

# 14. Market Explorer

Required fields:

- Asset
- Yield Source
- Underlying APY
- Implied APY
- Maturity
- Liquidity
- Status

Do NOT display a fake independent Fixed APY directly in the table unless it represents a real quote.

Recommended hierarchy:

```text
Asset
Yield Source
Underlying APY
Implied APY
Maturity
Liquidity
Status
```

---

# 15. Market Detail

Desktop information hierarchy:

```text
┌─────────────────────────────────────────┬────────────────────────┐
│                                         │                        │
│ Market Identity                         │ Trade Panel            │
│ Yield Source                            │                        │
│                                         │ Fixed / Long           │
│ Underlying APY                          │                        │
│ Implied APY                             │ Amount                 │
│ Maturity                                │                        │
│ Liquidity                               │ Quote Preview          │
│                                         │                        │
│ Yield Chart                             │ Risk / Price Impact    │
│                                         │                        │
│ Market Information                      │ Primary Action         │
│                                         │                        │
└─────────────────────────────────────────┴────────────────────────┘
```

The trade panel may remain sticky on desktop.

Mobile:

```text
Market Identity
Metrics
Chart
Strategy Selector
Trade Panel
Market Information
```

---

# 16. Portfolio

Portfolio must understand strategy-specific actions.

## Overview

Display:

- Total portfolio value
- Fixed Yield value
- Long Yield value
- Unrealized PnL
- Claimable yield
- Active positions
- Matured positions

## Fixed Position Actions

```text
Active PT
→ Sell Early

Matured PT
→ Redeem
```

## Long Position Actions

```text
Active YT
→ Claim Yield
→ Sell Early

Matured YT
→ Claim Remaining Yield if applicable
→ No Principal Redemption
```

---

# 17. Robinhood Chain Role

Robinhood Chain is:

> **the network and financial ecosystem where the application operates.**

Robinhood Chain is NOT the product brand.

Do not make the product look like an official Robinhood interface.

Do not visually imitate Robinhood.

Preferred brand language:

> Built on Robinhood Chain

Avoid naming the product "Robinhood Yield" unless explicitly approved later.

---

# 18. Robinhood Chain Configuration

Centralize chain configuration.

```text
Robinhood Chain Mainnet
Chain ID: 4663

Robinhood Chain Testnet
Chain ID: 46630
```

Gas token:

```text
ETH
```

RPC URLs must come from environment configuration.

```text
NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL=
NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

Do not hardcode RPC URLs in UI components.

---

# 19. Default Stablecoin Examples

Use **USDG** as the default stablecoin example where appropriate.

Do not use USDC as the primary example unless a specific market actually uses USDC.

```text
You Pay
1,000 USDG
```

Mock markets should use plausible yield sources.

---

# 20. Real vs Mock Strategy

| Area | MVP |
|---|---|
| Next.js UI | Real |
| Responsive UI | Real |
| Wallet connection | Real |
| Network detection | Real |
| Network switch | Real |
| Chain config | Real |
| Market data | Mock first |
| Yield source | Mock first |
| Underlying APY | Mock first |
| Implied APY | Mock first |
| Liquidity | Mock first |
| Portfolio | Mock first |
| Quote engine | Mock adapter |
| PT/YT interaction | Adapter-ready |
| Smart contract writes | Later |
| Real AMM | Later |

Development UI should clearly distinguish mock data when necessary.

---

# 21. Product Architecture

```text
User Interface
      ↓
Feature Hooks
      ↓
Domain Services
      ↓
Yield Market Adapter
      ↓
┌──────────────┬──────────────┬──────────────┐
│ Mock Data    │ Pendle/API   │ Contracts    │
└──────────────┴──────────────┴──────────────┘
```

The UI should not care where the market came from.

---

# 22. Frontend Technology Stack

## Core

```text
Next.js App Router
React
TypeScript
Tailwind CSS
```

## Web3

```text
wagmi
viem
RainbowKit
TanStack Query
```

## UI Utilities

```text
Lucide React
Sonner
Recharts
clsx
tailwind-merge
```

## Deployment

```text
Vercel
```

---

# 23. Technology Philosophy

Keep the MVP fast.

Do NOT introduce unless required:

- Redux
- custom backend
- database
- GraphQL
- Subgraph
- custom indexer
- Three.js
- React Three Fiber
- heavy WebGL
- large animation framework
- complex global state

Prefer simple architecture.

---

# 24. Smart Contract Scope

Do NOT build Solidity during the initial frontend phase.

Assume future integrations may include:

- market contracts
- PT contracts
- YT contracts
- router
- quote contracts
- external protocol adapters

UI must interact through adapters.

```text
UI
 ↓
useFixedYield()
 ↓
YieldMarketAdapter
 ↓
Mock Adapter today
 ↓
Real Protocol Adapter later
```

Same for Long Yield.

---

# 25. Suggested Frontend Structure

```text
app/
├── page.tsx
├── markets/
│   ├── page.tsx
│   └── [marketId]/
│       └── page.tsx
├── portfolio/
│   └── page.tsx
├── layout.tsx
└── globals.css
```

```text
components/
├── layout/
├── landing/
├── markets/
├── trade/
├── portfolio/
└── wallet/
```

```text
hooks/
├── useMarkets.ts
├── useMarket.ts
├── usePositions.ts
├── useFixedYieldQuote.ts
├── useLongYieldQuote.ts
├── useOpenFixedPosition.ts
├── useOpenLongPosition.ts
├── useClaimYield.ts
├── useRedeemFixed.ts
└── useNetworkGuard.ts
```

```text
lib/
├── web3/
├── adapters/
├── markets/
├── contracts/
├── quotes/
└── utils/
```

```text
types/
├── market.ts
├── position.ts
├── quote.ts
└── transaction.ts
```

Adapt to the actual repository when necessary.

---

# 26. Web3 Error States

Required:

- Wallet unavailable
- Wallet disconnected
- Wrong network
- Network switch failed
- Invalid amount
- Insufficient token balance
- Insufficient ETH for gas
- Approval required
- Approval pending
- User rejected approval
- User rejected transaction
- Transaction pending
- Transaction confirmed
- Transaction reverted
- RPC unavailable
- Market expired
- Market paused
- Insufficient liquidity
- Position not redeemable
- No claimable yield
- Position already redeemed
- Quote expired

Error messages must be specific and actionable.

---

# 27. Product UX Principle

Hide complexity progressively.

First layer:

```text
Fixed Yield
Predictable yield exposure.

Long Yield
Exposure to future yield.
```

Second layer:

```text
Fixed Yield
Powered by PT.

Long Yield
Powered by YT.
```

Advanced layer:

```text
PT pricing
YT pricing
Implied APY
Price impact
Maturity mechanics
Source protocol
Contract addresses
```

---

# 28. Signature Visual

The signature visual remains:

# Yield Splitter

One yield-bearing asset enters the experience and separates into two financial paths.

```text
                         ┌──────── FIXED
                         │
ASSET ────────────────── ●
                         │
                         └──────── LONG
```

Advanced layer:

```text
                         ┌──────── PT
                         │
ASSET ────────────────── ●
                         │
                         └──────── YT
```

Both paths visually move toward maturity.

The visual should explain the product without requiring copy.

---

# 29. Visual Identity

The product should feel:

- premium
- institutional
- technical
- financial
- precise
- modern
- minimal
- experimental
- custom-made

Avoid:

- generic Web3 dashboard
- glowing random orb
- planet
- robot
- floating coin
- wireframe globe
- starfield copied from Pendle
- meaningless particles
- excessive glassmorphism
- neon everywhere
- Robinhood visual imitation
- Pendle visual imitation

---

# 30. Color Direction

Do NOT use Robinhood-like neon lime/green as the dominant identity.

The design agent should propose 2–3 accent directions before implementation.

Possible directions:

## Direction A — Electric Blue / Ice

Feel:

- institutional
- technical
- clean
- financial

## Direction B — Violet / Ultraviolet

Feel:

- differentiated
- premium
- modern
- speculative

## Direction C — Warm Gold / Amber

Feel:

- financial
- yield-oriented
- premium
- maturity-focused

PT and YT may use related but distinct accents.

Color must never be the only signal for state.

---

# 31. Typography

Use a high-quality modern sans-serif.

Requirements:

- strong readability
- financial credibility
- clear numeric hierarchy
- clean metric rendering

Avoid novelty futuristic body fonts.

Numbers should be easy to scan.

Use tabular numerals where appropriate.

---

# 32. Landing Page Journey

The landing should be short but immersive.

Do not build a long generic marketing page.

Recommended structure:

```text
1. Hero
2. Yield Split
3. Fixed vs Long
4. Market Preview
5. Trade Preview
6. Portfolio / Maturity
7. Final CTA
```

---

# 33. Hero

Purpose:

- explain the product immediately
- introduce Yield Splitter
- send users to Markets

Suggested copy direction:

```text
Trade Yield.
Not Complexity.

Choose predictable yield
or take exposure to future yield.

Built on Robinhood Chain.

[ Explore Markets ]
```

Visual:

```text
Yield-Bearing Asset
        ↓
        ●
      ↙   ↘
 Fixed     Long
 Yield     Yield
```

The hero visual should be built primarily with:

- CSS
- SVG
- transforms
- masks
- gradients
- minimal JavaScript

Avoid heavy 3D.

---

# 34. Landing Section 02 — Yield Split

Explain the concept visually.

```text
One Yield Asset
       ↓
Two Strategies
   ↙       ↘
Fixed     Long
```

PT and YT can appear when the user enters advanced mode or scrolls deeper.

---

# 35. Landing Section 03 — Two Strategies

## Fixed Yield

```text
Know Your Rate.

Lock a predictable yield outcome
until maturity.
```

## Long Yield

```text
Trade Future Yield.

Take exposure to changing yield
before maturity.
```

---

# 36. Landing Section 04 — Markets

Transition the visual story into a real application interface.

The abstract yield paths can visually transform into market rows.

---

# 37. Application UI

Landing can be expressive.

Application pages should be calmer.

Think:

```text
premium financial product
+
minimal trading terminal
+
modern DeFi usability
```

Prioritize:

- readability
- APY
- maturity
- yield source
- amount
- position status
- actions

---

# 38. Tailwind vs Custom CSS vs SVG

## Tailwind CSS

Use for:

- layout
- grid
- spacing
- typography
- responsive design
- buttons
- inputs
- tabs
- market rows
- cards
- portfolio
- trade panel
- badges

## Custom CSS

Use for:

- hero composition
- spatial environment
- yield splitter
- advanced transitions
- pseudo-depth
- masks
- custom gradients
- decorative financial layers

## SVG

Use for:

- yield paths
- PT/YT split
- maturity timeline
- technical diagrams
- chart-like decorative visuals
- animated path progression

## Minimal JavaScript

Use for:

- scroll progress
- pointer response
- visual interpolation
- section transitions

Do not use JavaScript where CSS is sufficient.

---

# 39. Motion System

Motion must explain product mechanics.

Good motion:

- yield asset enters
- path splits
- Fixed path stabilizes
- Long path remains dynamic
- maturity timeline advances
- market values interpolate
- abstract visual becomes real UI

Bad motion:

- random floating
- random particles
- decorative parallax
- animation with no financial meaning
- motion that delays interaction

---

# 40. Responsive Rules

Mobile must be designed intentionally.

Critical mobile interactions:

- Connect Wallet
- Browse Markets
- Market Filters
- Fixed / Long selector
- Amount Input
- Quote Preview
- Risk Message
- Confirm Action
- Portfolio Position
- Claim / Redeem

Do not simply shrink desktop.

---

# 41. Performance Rules

Prioritize:

- fast first load
- minimal client JavaScript
- server components where appropriate
- client components only when needed
- CSS/SVG over WebGL
- optimized fonts
- optimized images
- minimal dependencies

---

# 42. Accessibility

Required:

- keyboard navigation
- visible focus states
- semantic controls
- readable contrast
- disabled states
- loading states
- error states
- form validation
- no state communicated by color alone

---

# 43. Development Workflow

Recommended AI-assisted flow:

```text
Final Brief
   ↓
Design Architecture
   ↓
Human Review
   ↓
Design Lock
   ↓
Foundation
   ↓
Landing
   ↓
Markets
   ↓
Market Detail
   ↓
Fixed Yield
   ↓
Long Yield
   ↓
Portfolio
   ↓
Wallet + Network
   ↓
Mock Adapter
   ↓
Polish
```

Do not ask the coding agent to build everything in one pass.

---

# 44. Recommended Implementation Order

```text
01. Inspect / scaffold repository
02. Global design tokens
03. Navigation + layout shell
04. Landing hero
05. Yield Split visual
06. Landing sections
07. Market data model
08. Market Explorer
09. Market Detail
10. Quote adapter
11. Fixed Yield UI
12. Long Yield UI
13. Portfolio
14. Wallet connection
15. Robinhood Chain config
16. Mock transaction states
17. Error handling
18. Responsive polish
19. Accessibility
20. Performance
21. Contract adapter preparation
```

---

# 45. Out of Scope

Do NOT build in the initial MVP:

- Solidity PT/YT protocol
- custom AMM
- custom pricing engine
- custom oracle
- custom liquidity system
- protocol governance
- tokenomics
- bridge
- NFT
- referral system
- leaderboard
- points
- margin
- advanced LP
- custom backend
- custom indexer

---

# 46. Future Integration Path

## Phase 2

- real market source adapter
- live quotes
- real PT/YT balances
- token approvals
- trade execution
- redeem
- claim yield

## Phase 3

- multiple source protocols
- historical yield data
- advanced portfolio analytics
- notifications
- market discovery improvements

## Phase 4

- LP products
- advanced strategies
- limit-style execution
- more sophisticated yield analytics

---

# 47. Design Acceptance Criteria

Reject the design if:

- it looks like a generic crypto dashboard
- it looks like Robinhood
- it looks like Pendle
- it uses random Web3 imagery
- yield splitting is not visually clear
- Fixed and Long look identical
- PT/YT complexity appears too early
- APY hierarchy is confusing
- Long Yield risk is hidden
- mobile is just compressed desktop

Accept the design if:

- the user immediately understands two strategies
- Yield Splitter is memorable
- application UI feels financial and trustworthy
- Fixed feels stable
- Long feels dynamic
- market data is easy to scan
- risk is visible
- the design has a unique identity
- implementation remains lightweight

---

# 48. MVP Success Criteria

The MVP succeeds when:

- user understands Fixed vs Long in seconds
- user can browse markets quickly
- user understands maturity
- user understands current/implied yield
- user understands Long Yield risk
- user can simulate a Fixed position
- user can simulate a Long position
- user can see positions in Portfolio
- wallet connection works
- network detection works
- UI is premium on desktop
- mobile is genuinely usable
- architecture can later consume real markets

---

# 49. 30-Second PM Explanation

> Project ini kita arahkan sebagai retail-first yield trading experience di Robinhood Chain. Karena Pendle sudah ada di chain yang sama, kita bukan bikin Pendle kedua. Kita ambil mekanik yield trading-nya, tapi UX-nya dibuat jauh lebih simpel: user cukup pilih Fixed Yield untuk predictable return atau Long Yield untuk exposure ke future yield. PT/YT tetap ada di belakang sebagai mekanisme, tapi tidak kita jadikan kompleksitas utama di UI. MVP fokus ke Markets, Market Detail, Fixed/Long flow, Portfolio, wallet, dan Robinhood Chain integration.

---

# 50. 10-Minute PM Presentation Structure

## Minute 0–1
What we are building.

## Minute 1–2
Why we are NOT building another Pendle.

## Minute 2–4
Fixed Yield vs Long Yield.

## Minute 4–6
Main user flow.

## Minute 6–7
Markets + Portfolio.

## Minute 7–8
Robinhood Chain role.

## Minute 8–9
Visual direction.

## Minute 9–10
MVP architecture and development scope.

---

# 51. Final Product Scope

```text
PRODUCT
Retail-first Yield Trading Experience

NETWORK
Robinhood Chain

CORE PRODUCT
Yield Market

STRATEGIES
Fixed Yield
Long Yield

ADVANCED MECHANICS
PT
YT

PAGES
Landing
Markets
Market Detail
Portfolio

CORE STACK
Next.js
React
TypeScript
Tailwind CSS

WEB3
wagmi
viem
RainbowKit
TanStack Query

VISUAL
Custom CSS
SVG
Minimal JavaScript

DATA
Mock-first
Adapter-based

WALLET
Real

NETWORK
Real

SMART CONTRACT
Later / Adapter-ready
```

---

# 52. Final Principle

Every product, design, UX, and implementation decision should reinforce:

> **Yield can be separated and traded — without making the user learn DeFi complexity first.**

If a feature, visual, or technical decision does not support that principle, it probably does not belong in the MVP.
