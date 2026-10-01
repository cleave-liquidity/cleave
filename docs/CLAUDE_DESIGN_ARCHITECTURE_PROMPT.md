# Claude / Coding Agent — Design & Architecture First Prompt

You are acting as a **Senior Web3 Product Designer, Senior Frontend Engineer, and UI Systems Architect**.

We are starting a new Web3 application for **Robinhood Chain**.

Your current task is **NOT to build the application yet**.

You must first inspect the repository, understand the product deeply, and produce a strong **UI/UX + frontend architecture plan**.

Do not write production pages until this design and architecture pass is complete.

---

# PRODUCT

We are building a **yield trading protocol on Robinhood Chain**.

The product is inspired by the core yield-tokenization mechanic of Pendle, but:

- this is NOT a visual clone of Pendle
- this is NOT a full Pendle clone
- we are NOT rebuilding every Pendle module
- we are NOT building a generic DeFi dashboard

The core concept is:

A yield-bearing asset can be separated into two different exposures:

1. Principal / Fixed Yield
2. Future Yield / Long Yield

Conceptually:

```text
Yield-Bearing Asset
        ↓
Yield Tokenization
        ↓
┌───────────────┐
│               │
PT              YT
│               │
Fixed Yield     Long Yield
```

PT represents principal exposure and allows the user to obtain a more predictable fixed-yield position.

YT represents future-yield exposure and allows the user to take a long position on the future yield of the underlying asset.

The application must therefore feel like a real **YIELD TRADING PRODUCT**, not simply an "Earn APY" or staking page.

The central product idea is:

> YIELD CAN BE SEPARATED AND TRADED.

Every major design decision should reinforce this.

---

# IMPORTANT ASSET CONSTRAINT

Do not treat every arbitrary ERC-20 token as automatically yield-bearing.

A market conceptually requires:

```text
Underlying Asset
       +
Yield Source
       ↓
Yield-Bearing Asset
       ↓
PT / YT Market
```

For the first frontend MVP:

- market data may be mocked
- yield sources may be mocked
- APY may be mocked
- liquidity may be mocked
- positions may be mocked
- PT/YT addresses may be placeholders

However:

Do NOT tightly couple the UI to mock data.

The architecture must allow mock data to later be replaced by:

- API data
- RPC data
- smart contract reads
- smart contract writes

without redesigning the UI.

---

# CORE USER FLOW

```text
Landing
→ Explore Markets
→ Select Yield Market
→ View Market Data
→ Choose Fixed Yield or Long Yield
→ Enter Position
→ Monitor Position
→ Exit Early or Redeem at Maturity
```

There are two primary strategies.

---

# FIXED YIELD

User wants a more predictable return.

Flow:

```text
Select Market
→ Fixed Yield
→ Enter Amount
→ Review Fixed APY
→ Review Maturity
→ Preview PT Position
→ Approve
→ Open Position
→ Portfolio
→ Redeem at Maturity
```

Important information:

- input token
- input amount
- PT received
- fixed APY
- maturity
- estimated maturity value
- price impact
- slippage
- network fee
- wallet balance

---

# LONG YIELD

User wants exposure to future yield.

Flow:

```text
Select Market
→ Long Yield
→ Enter Amount
→ Review Underlying APY
→ Review Implied APY
→ Preview YT Exposure
→ Approve
→ Open Position
→ Portfolio
→ Monitor Position
→ Sell or Hold
```

Important information:

- input token
- input amount
- YT received
- underlying APY
- implied APY
- maturity
- price impact
- position value
- PnL
- network fee

---

# MVP PAGES

Required:

```text
/
Landing

/markets
Yield Market Explorer

/markets/[marketId]
Market Detail + Fixed Yield / Long Yield trading

/portfolio
Connected wallet positions
```

Do NOT add unnecessary modules unless explicitly requested.

Do not add:

- governance
- DAO
- NFT
- bridge
- points
- leaderboard
- referrals
- admin dashboard
- margin
- advanced LP
- limit orders
- complex analytics

---

# CORE FEATURES

## 1. Market Explorer

Display:

- Asset
- Yield Source
- Underlying APY
- Implied APY
- Fixed APY
- Maturity
- Liquidity
- Market Status

## 2. Market Detail

Display:

- Asset Identity
- Yield Source
- Underlying APY
- Implied APY
- Fixed APY
- Maturity
- Time Remaining
- Liquidity
- Yield Chart
- PT / YT explanation
- Trading interface

## 3. Fixed Yield

Provide a clean trade panel showing:

- amount paid
- PT received
- fixed APY
- maturity
- estimated maturity value
- price impact
- transaction state

## 4. Long Yield

Provide a clean trade panel showing:

- amount paid
- YT received
- underlying APY
- implied APY
- maturity
- yield exposure
- price impact
- transaction state

## 5. Portfolio

Display:

- total portfolio value
- fixed-yield value
- long-yield value
- unrealized PnL
- active positions
- matured positions
- redeemable positions

Per position:

- asset
- strategy
- deposited amount
- current value
- PnL
- APY
- maturity
- time remaining
- status
- exit / redeem action

## 6. Wallet + Network

Support:

- Connect Wallet
- Disconnect Wallet
- Wallet balance
- Wrong network handling
- Network switching
- Transaction states

---

# TECH STACK

The base stack MUST remain:

```text
Next.js App Router
React
TypeScript
Tailwind CSS
```

Web3:

```text
wagmi
viem
RainbowKit
TanStack Query
```

UI utilities:

```text
Lucide React
Sonner
Recharts
clsx
tailwind-merge
```

Deployment target:

```text
Vercel
```

Do not introduce:

- Redux
- backend
- database
- GraphQL
- Subgraph
- custom indexer
- Three.js
- React Three Fiber
- heavy WebGL

unless there is a real architectural requirement.

---

# SMART CONTRACT SCOPE

Do NOT implement Solidity contracts during this first phase.

Assume the future application may interact with:

- Market Contract
- PT Contract
- YT Contract
- Router / Trading Contract

But keep contract integration behind adapters/hooks.

Concept:

```text
UI
 ↓
Feature Hook
 ↓
Yield Trading Adapter
 ↓
Mock implementation now
Real contract implementation later
```

For the initial MVP:

- wallet connection should be real
- Robinhood Chain network configuration should be real
- market data may be mocked
- position data may be mocked
- trade execution may be simulated
- frontend architecture must be contract-ready

---

# DATA MODEL DIRECTION

Use clean domain models.

Example:

```ts
export interface YieldMarket {
  id: string;
  symbol: string;
  name: string;
  underlyingAsset: string;
  yieldSource: string;
  underlyingApy: number;
  impliedApy: number;
  fixedApy: number;
  longYieldApy?: number;
  maturity: string;
  liquidityUsd: number;
  status: "active" | "maturing" | "matured" | "paused";
  ptAddress?: `0x${string}`;
  ytAddress?: `0x${string}`;
}
```

```ts
export interface YieldPosition {
  id: string;
  marketId: string;
  strategy: "fixed" | "long";
  depositedAmount: number;
  currentValue: number;
  pnl: number;
  maturity: string;
  openedAt: string;
  status: "active" | "matured" | "redeemed" | "closed";
}
```

Do not hardcode market values directly inside UI components.

---

# FRONTEND ARCHITECTURE DIRECTION

Prefer a feature-oriented structure similar to:

```text
app/
components/
hooks/
lib/
types/
```

Possible grouping:

```text
components/
  landing/
  markets/
  trade/
  portfolio/
  wallet/
  layout/

hooks/
  useMarkets
  useMarket
  usePositions
  useFixedYield
  useLongYield

lib/
  web3/
  contracts/
  markets/
```

This is guidance.

Inspect the actual repository first.

Do not force this architecture if the repository already has a better working structure.

---

# WEB3 ERROR STATES

The UI must explicitly account for:

- wallet unavailable
- wallet disconnected
- wrong network
- network switching failure
- invalid amount
- insufficient token balance
- insufficient gas
- approval required
- approval pending
- user rejected approval
- user rejected transaction
- transaction pending
- transaction confirmed
- transaction reverted
- RPC unavailable
- market expired
- market paused
- insufficient liquidity
- position not redeemable
- position already redeemed

Do not reduce every error to:

"Something went wrong."

---

# VISUAL DIRECTION

Do NOT create a generic Web3 dashboard.

Do NOT default to:

- random glowing orbs
- planets
- robots
- crypto coins floating in space
- network globes
- excessive glassmorphism
- neon gradients everywhere
- meaningless particle fields
- generic card grids
- overused crypto visual clichés

The website should feel:

- premium
- financial
- technical
- precise
- modern
- experimental
- institutional
- immersive
- custom-made

The visual system must communicate the actual product.

---

# SIGNATURE VISUAL

The core visual concept should be:

# YIELD SPLITTING

Imagine one yield-bearing asset entering a financial system and visually separating into two trajectories.

```text
                        ┌──────── PT
                        │
ASSET ───────────────── ●
                        │
                        └──────── YT
```

PT becomes:

```text
FIXED YIELD
Predictable Return
```

YT becomes:

```text
LONG YIELD
Future Yield Exposure
```

Both trajectories progress toward:

```text
MATURITY
```

This visual language should influence:

- Hero
- Scroll storytelling
- PT/YT explanation
- Strategy cards
- Market interaction
- Maturity timeline
- Application micro-interactions

---

# LANDING PAGE EXPERIENCE

Do not make the landing page feel like:

```text
Hero
↓
Random Cards
↓
Feature Grid
↓
Testimonials
↓
Footer
```

It should feel like one continuous visual journey.

Suggested narrative:

## 1. Hero

Introduce:

- yield trading
- asset
- split
- PT / YT
- main CTA

## 2. Yield Tokenization

Asset visually splits.

```text
Yield-Bearing Asset
       ↓
       ●
     ↙   ↘
   PT     YT
```

## 3. Two Strategies

Explain:

```text
Fixed Yield
Predictable exposure.

Long Yield
Trade future yield.
```

## 4. Market Transition

The abstract yield system transforms into actual market data.

## 5. Trade Experience

Show how a user opens a Fixed or Long position.

## 6. Portfolio / Maturity

Show the position progressing toward maturity.

## 7. Final CTA

Drive user into Markets.

---

# APPLICATION UI DIRECTION

The application itself should be much calmer than the landing page.

Think:

```text
modern institutional trading product
+
premium DeFi application
+
minimal financial terminal
```

Do not overdecorate application pages.

Prioritize:

- APY readability
- maturity readability
- liquidity
- amount input
- trade preview
- wallet state
- position state
- clear primary action

---

# MARKET DETAIL INFORMATION HIERARCHY

Desktop concept:

```text
┌──────────────────────────────────────────┬──────────────────────┐
│                                          │                      │
│ Market Identity                          │ Trading Panel        │
│                                          │                      │
│ Underlying APY                           │ Fixed / Long         │
│ Implied APY                              │                      │
│ Fixed APY                                │ Amount               │
│ Maturity                                 │                      │
│                                          │ Preview              │
│ Yield Chart                              │                      │
│                                          │ Primary Action       │
│ Market Information                       │                      │
│                                          │                      │
└──────────────────────────────────────────┴──────────────────────┘
```

Trading panel can be sticky on desktop if useful.

Mobile should become a deliberate single-column flow.

---

# FIXED VS LONG VISUAL LANGUAGE

Fixed Yield should visually communicate:

- stability
- certainty
- locked trajectory
- maturity

Long Yield should visually communicate:

- movement
- variable exposure
- market thesis
- future potential

They must remain part of one coherent design system.

Do not make them look like two unrelated products.

---

# CSS IMPLEMENTATION RULE

"Custom CSS" or "vanilla CSS" DOES NOT mean replacing Next.js with vanilla HTML/CSS/JavaScript.

The architecture remains:

```text
Next.js + React + TypeScript
        ↓
Tailwind CSS for application UI
        +
Custom CSS / SVG / minimal JavaScript
        ↓
Signature visual experience
```

Use Tailwind CSS for:

- layout
- spacing
- responsive behavior
- typography
- buttons
- inputs
- market table
- portfolio
- trade panel
- state badges
- standard application components

Use custom CSS for:

- hero composition
- spatial environment
- yield-flow visualization
- PT/YT splitting
- pseudo-depth
- masks
- custom gradients
- scroll transformations
- technical decorative layers

Use SVG for:

- yield paths
- split diagrams
- maturity timeline
- technical diagrams
- line animations
- data trajectories

Use minimal JavaScript only where necessary for:

- scroll progress
- pointer interaction
- visual interpolation
- section transition

Prefer CSS/SVG over heavy WebGL.

---

# MOTION

Motion must explain the product.

Good:

- asset moves through the yield system
- path splits
- PT/YT diverge
- maturity timeline progresses
- market metrics interpolate
- landing visual transforms into application data

Bad:

- random particles
- meaningless floating
- excessive parallax
- animation for decoration only
- motion that slows down interaction

---

# RESPONSIVE REQUIREMENT

Do not simply shrink desktop.

Design mobile intentionally.

Important mobile UX:

- wallet connection
- market filters
- market rows/cards
- strategy selector
- amount input
- transaction preview
- position status
- portfolio actions

---

# PERFORMANCE

Prioritize:

- fast load
- minimal JavaScript
- CSS/SVG over WebGL
- optimized fonts
- optimized assets
- server components where useful
- client components only when required

Do not add dependencies merely for small effects.

---

# ACCESSIBILITY

Account for:

- keyboard navigation
- focus states
- contrast
- semantic controls
- disabled states
- loading states
- input validation
- error messaging
- information not conveyed only by color

---

# YOUR FIRST TASK

DO NOT BUILD THE APP YET.

First inspect the repository.

You must inspect:

1. package.json
2. current Next.js version
3. App Router structure
4. existing components
5. global CSS
6. Tailwind configuration
7. fonts
8. current dependencies
9. reusable utilities
10. existing Web3 configuration if any

Do not delete or replace working code unnecessarily.

Then produce a **Design + Architecture Report**.

Your output must include:

## A. Product Understanding

Explain the product back in your own words.

Make sure you understand why this is yield trading rather than simple yield earning.

## B. Core Differentiator

Explain the role of:

- Yield-Bearing Asset
- PT
- YT
- Fixed Yield
- Long Yield
- Maturity

## C. Information Architecture

Recommend the final page hierarchy.

## D. Landing Page Flow

Provide a detailed section-by-section narrative.

For every section include:

- purpose
- content
- composition
- interaction
- connection to previous section
- connection to next section

## E. Hero Design

Propose a strong signature hero.

Explain:

- layout
- spatial composition
- yield splitter
- PT path
- YT path
- maturity destination
- typography
- interaction
- responsive behavior

Do not use a generic orb or 3D globe.

## F. Visual Design System

Recommend:

- color direction
- typography direction
- surfaces
- borders
- spacing
- corner radius
- shadows
- glow usage
- data colors
- interaction states

## G. Market Explorer UX

Explain:

- desktop layout
- mobile layout
- filters
- sorting
- row/card design
- hover states
- market status

## H. Market Detail UX

Explain:

- information hierarchy
- metric placement
- chart
- maturity
- trading panel
- sticky behavior
- mobile behavior

## I. Fixed Yield UX

Explain the full UI from amount input to transaction confirmation.

## J. Long Yield UX

Explain the full UI from amount input to position monitoring.

## K. Portfolio UX

Explain:

- overview metrics
- Fixed positions
- Long positions
- PnL
- maturity
- exit
- redeem

## L. Motion System

Describe meaningful animations only.

## M. Responsive System

Explain mobile-specific decisions.

## N. Component Architecture

Map the recommended React component tree.

## O. Data Architecture

Explain:

```text
UI
→ hooks
→ service / adapter
→ mock now
→ API / contracts later
```

## P. Web3 Architecture

Explain:

- wagmi
- viem
- RainbowKit
- chain config
- network guard
- contract adapter
- transaction state

## Q. Tailwind vs Custom CSS vs SVG

Explicitly identify which visual areas should use each implementation method.

## R. Dependency Review

Based on the actual repository:

- identify what already exists
- identify what must be installed
- identify dependencies that should NOT be installed

## S. Risks

Identify:

- UX risks
- architecture risks
- Web3 risks
- scope risks
- performance risks

## T. Recommended Implementation Order

Give a practical implementation sequence designed for fast AI-assisted coding.

---

# OUTPUT QUALITY RULES

Do not give vague advice such as:

- "make it modern"
- "use good spacing"
- "add animations"
- "use a dark theme"

Be specific.

Every major visual decision should support:

> YIELD CAN BE SEPARATED AND TRADED.

Do not start implementation yet.

After presenting the Design + Architecture Report, STOP and wait for approval.

Do not generate application code until the design direction has been reviewed.
