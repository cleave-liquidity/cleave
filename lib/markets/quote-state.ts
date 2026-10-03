export type QuoteUiState = "idle" | "quoting" | "ready" | "unavailable" | "error";

export const QUOTE_UNAVAILABLE_TITLE = "Quote unavailable";
export const QUOTE_UNAVAILABLE_MESSAGE =
  "No executable route is currently available for this amount. Try another amount or try again later.";
export const QUOTE_ERROR_MESSAGE =
  "We couldn’t fetch a live quote. Try another amount or try again later.";

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
  return /multi[- ]routing|no routes? available|no executable route|route unavailable|no route/.test(message);
}

export function getQuoteUserMessage(error: unknown): string {
  return isQuoteRouteUnavailableError(error) ? QUOTE_UNAVAILABLE_MESSAGE : QUOTE_ERROR_MESSAGE;
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
  if (error) return isQuoteRouteUnavailableError(error) ? "unavailable" : "error";
  if (isExpired) return "error";
  if (quote) return "ready";
  return "idle";
}

export function isQuoteExecutionReady(state: QuoteUiState): boolean {
  return state === "ready";
}
