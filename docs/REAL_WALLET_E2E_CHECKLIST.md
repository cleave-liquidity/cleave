# Real Wallet E2E Checklist

Use this checklist only with a wallet and account intended for a small, controlled canary. Never paste a seed phrase or private key into the app, terminal, issue tracker, or chat.

## Preconditions

- Use the smallest practical test amount supported by the selected live market. Do not assume a fixed dollar amount; check the live quote, balance, liquidity, and gas first.
- Confirm the app is in `Live Data` mode and the market is on Robinhood Chain Mainnet `4663`.
- Keep enough ETH for gas and leave a safety margin. Do not proceed if the wallet cannot comfortably pay the displayed fee.

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

Repeat the same wallet, chain, gas, smallest-practical-amount, quote, exact-approval, signature, receipt, and Portfolio checks with Long Yield. Confirm the YT amount, break-even APY, risk notice, and that the resulting position is a YT position.

## Sell

With a live active PT or YT position, choose Sell Early, review the live route and returned amount, approve only if the live route requires it, sign the transaction, verify the real receipt, and confirm the Portfolio position and token balance refresh automatically.

## Claim

With a live YT position reporting claimable yield, choose Claim Yield, verify the amount comes from the live position source, sign the real claim request, verify the receipt, and confirm claimable yield and underlying balance refresh.

## Redeem

Only after a PT market has reached verified maturity, choose Redeem at Maturity, confirm the PT balance and eligibility, sign the real redeem request, verify the receipt, and confirm the underlying balance refresh. YT must not expose principal redemption.

## Record

- Record only real transaction hashes, chain IDs, receipts, and observed balances.
- If any step fails, preserve the typed error and do not retry a wallet-confirmed transaction blindly.
