export type SellFlowStep =
  | "idle"
  | "quoting"
  | "review"
  | "ready"
  | "approving"
  | "confirming"
  | "pending"
  | "success"
  | "error";

export function isSellFlowBusy(step: SellFlowStep): boolean {
  return step === "quoting" || step === "approving" || step === "confirming" || step === "pending";
}

export function getSellFlowActionLabel(step: SellFlowStep): string {
  switch (step) {
    case "quoting":
      return "Fetching Exit Quote…";
    case "approving":
      return "Approving PT…";
    case "confirming":
      return "Confirm Sell Early…";
    case "pending":
      return "Transaction Pending…";
    case "success":
      return "Position Sold";
    case "ready":
      return "Sell Early";
    case "error":
      return "Continue";
    default:
      return "Continue";
  }
}
