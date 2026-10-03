# Real Wallet E2E Checklist

Use this checklist only with a wallet and account intended for a small, controlled canary. Never paste a seed phrase or private key into the app, terminal, issue tracker, or chat.

## Preconditions

- Use the smallest practical test amount supported by the selected live market. Do not assume a fixed dollar amount; check the live quote, balance, liquidity, and gas first.
- Confirm the app is in `Live Data` mode and the market is on Robinhood Chain Mainnet `4663`.
- Keep enough ETH for gas and leave a safety margin. Do not proceed if the wallet cannot comfortably pay the displayed fee.

## Wallet and network preflight

1. While disconnected, browse `/markets`, open a market detail page, and preview both Fixed and Long quotes. Browsing and quote preview must not require a wallet signature.
2. Connect the intended canary wallet through RainbowKit and verify the displayed address is the account being tested.
3. Confirm the wallet is on Robinhood Chain Mainnet `4663`. If it is on another supported chain, use the app's network switch action and verify the wallet reports Mainnet afterward.
4. If the wallet is on an unsupported chain or the switch is rejected, stop and record the typed error; do not attempt a write.
5. Verify the wallet's ETH gas balance and the selected market's underlying ERC-20 balance. Confirm the displayed token, decimals, and selected market match the intended test.
6. Disconnect and reconnect once before the write flow. Confirm portfolio access is wallet-scoped and that no previous account's positions or balances are shown.

## Fixed Yield

1. Connect the wallet.
2. Confirm the wallet is on Robinhood Chain Mainnet `4663`.
3. Check the wallet's ETH gas balance.
4. Open a live market from `/markets` and continue to its Trade Yield workspace.
5. Select Fixed Yield and enter the smallest practical test amount.
6. Confirm the quote, maturity, PT amount, price impact, and network fee.
7. Approve the exact quoted token amount when prompted.
8. Confirm the approval in the wallet and wait for its receipt.
9. Confirm the Fixed Yield transaction in the wallet.
10. Record the real transaction hash and verify its successful receipt on the Robinhood Chain explorer.
11. Refresh the Portfolio view through the app and verify the PT balance is discovered without a browser reload.

## Long Yield

Repeat the same wallet, chain, gas, smallest-practical-amount, quote, exact-approval, signature, receipt, and Portfolio checks with Long Yield. Confirm the YT amount, break-even APY, risk notice, and that the resulting position is a YT position with no PT or principal-redemption state.

## Sell

With a live active PT or YT position, choose Sell Early, review the live route and returned amount, approve only if the live route requires it, sign the transaction, verify the real receipt, and confirm the Portfolio position and token balance refresh automatically.

## Claim

With a live YT position reporting claimable yield, choose Claim Yield, verify the amount comes from the live position source, sign the real claim request, verify the receipt, and confirm claimable yield and underlying balance refresh.

## Redeem

Only after a PT market has reached verified maturity, choose Redeem at Maturity, confirm the PT balance and eligibility, sign the real redeem request, verify the receipt, and confirm the underlying balance refresh. YT must not expose principal redemption.

## Record

- Record only real transaction hashes, chain IDs, receipts, and observed balances.
- If any step fails, preserve the typed error and do not retry a wallet-confirmed transaction blindly.

## Canary limits

- A disconnected browser session can prove browsing, market discovery, routing, quote states, and user-facing validation only; it cannot prove a balance-dependent approval or transaction.
- A funded token balance is required to prove Fixed/Long opening and sell flows.
- ETH is required to prove approval, claim, redeem, sell, and open-position gas behavior.
- A human wallet signature is required to prove approval and transaction submission. Do not mark any write as successful from a mock response, UI toast, or locally fabricated hash.
