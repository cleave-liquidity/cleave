export type QuoteUiState = "idle" | "quoting" | "ready" | "unavailable" | "minimum-amount" | "error";

export const QUOTE_UNAVAILABLE_TITLE = "Quote unavailable";
export const QUOTE_UNAVAILABLE_MESSAGE =
  "No executable route is currently available for this amount. Try another amount or try again later.";
export const QUOTE_ERROR_MESSAGE =
  "The quote request could not be completed. Check the live quote service and Mainnet RPC, then retry.";
export const QUOTE_MINIMUM_AMOUNT_MESSAGE =
  "This amount is below the route minimum. Increase the amount and request a fresh quote.";
export const QUOTE_RATE_LIMITED_MESSAGE =
  "The quote service is rate-limiting requests. Wait briefly, then retry.";
export const QUOTE_SERVICE_UNAVAILABLE_MESSAGE =
  "The quote service is temporarily unavailable. Retry when it responds again.";
export const QUOTE_REJECTED_MESSAGE =
  "The quote service rejected this request. Try a supported market input and refresh the quote.";

type QuoteStateInput = {
  hasValidAmount: boolean;
  isLoading: boolean;
  quote: unknown;
  error?: unknown;
  isExpired?: boolean;
};

type ErrorLike = {
  message?: unknown;
  shortMessage?: unknown;
  cause?: unknown;
};

function errorMessages(error: unknown): string[] {
  const messages: string[] = [];
  let current: unknown = error;

  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const record = current as ErrorLike;
    for (const value of [record.message, record.shortMessage]) {
      if (typeof value === "string" && value.trim() !== "") messages.push(value);
    }
    current = record.cause;
  }

  return messages;
}

export function getQuoteTechnicalMessage(error: unknown): string {
  return errorMessages(error)[0] || "No technical quote error was provided.";
}

export function isQuoteRouteUnavailableError(error: unknown): boolean {
  const message = errorMessages(error).join(" ").toLowerCase();
  return /multi[- ]routing|no routes? available|no executable route|route unavailable|no route|token cannot be swapped|must be in the sy token|insufficient liquidity/.test(message);
}

export function isQuoteMinimumAmountError(error: unknown): boolean {
  const message = errorMessages(error).join(" ").toLowerCase();
  return /minimum amount|amount too small|below (the )?(route )?minimum|min(?:imum)? trade|input valuation is too low|minimum valuation/.test(message);
}

export function getQuoteUserMessage(error: unknown): string {
  const message = errorMessages(error).join(" ").toLowerCase();
  if (isQuoteMinimumAmountError(error)) {
    return QUOTE_MINIMUM_AMOUNT_MESSAGE;
  }
  if (/http 429|rate limit/.test(message)) return QUOTE_RATE_LIMITED_MESSAGE;
  if (/pendle api http 5\d\d|temporarily unavailable/.test(message)) {
    return QUOTE_SERVICE_UNAVAILABLE_MESSAGE;
  }
  if (isQuoteRouteUnavailableError(error)) return QUOTE_UNAVAILABLE_MESSAGE;
  if (/pendle api http 4\d\d/.test(message)) return QUOTE_REJECTED_MESSAGE;
  return QUOTE_ERROR_MESSAGE;
}

export function getQuoteUiState({
  hasValidAmount,
  isLoading,
  quote,
  error,
  isExpired = false,
}: QuoteStateInput): QuoteUiState {
  if (!hasValidAmount) return "idle";
  if (isLoading) return "quoting";
  if (error && isQuoteMinimumAmountError(error)) return "minimum-amount";
  if (error) return isQuoteRouteUnavailableError(error) ? "unavailable" : "error";
  if (isExpired) return "error";
  if (quote) return "ready";
  return "idle";
}

export function isQuoteExecutionReady(state: QuoteUiState): boolean {
  return state === "ready";
}
