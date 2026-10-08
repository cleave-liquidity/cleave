import type { DividendAccrual } from "./dividend-types";

function powerOfTen(decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error("Invalid decimal precision");
  return BigInt(10) ** BigInt(decimals);
}

function decimalToUnits(value: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error(`Invalid decimal value: ${value}`);
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) throw new Error(`Too many decimal places: ${value}`);
  return BigInt(whole) * powerOfTen(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals) || "0");
}

function unitsToDecimal(value: bigint, decimals: number): string {
  const scale = powerOfTen(decimals);
  const whole = value / scale;
  const fraction = value % scale;
  return `${whole}.${fraction.toString().padStart(decimals, "0")}`;
}

export function calculateCashDividendAccrual(input: {
  positionUnits: bigint;
  positionDecimals: number;
  rate: string;
  rateDecimals: number;
  elapsedSeconds: bigint;
  accrualPeriodSeconds: bigint;
  outputDecimals: number;
}): DividendAccrual {
  if (input.positionUnits < BigInt(0)) throw new Error("Position units cannot be negative");
  if (input.accrualPeriodSeconds <= BigInt(0)) throw new Error("Accrual period must be positive");
  const rateUnits = decimalToUnits(input.rate, input.rateDecimals);
  const grossBaseUnits = input.positionUnits * rateUnits * powerOfTen(input.outputDecimals) /
    (powerOfTen(input.positionDecimals) * powerOfTen(input.rateDecimals));
  const elapsed = input.elapsedSeconds < BigInt(0) ? BigInt(0) : input.elapsedSeconds > input.accrualPeriodSeconds
    ? input.accrualPeriodSeconds
    : input.elapsedSeconds;
  const accruedBaseUnits = grossBaseUnits * elapsed / input.accrualPeriodSeconds;
  return {
    grossBaseUnits,
    accruedBaseUnits,
    gross: unitsToDecimal(grossBaseUnits, input.outputDecimals),
    accrued: unitsToDecimal(accruedBaseUnits, input.outputDecimals),
  };
}

export function parseBaseUnits(value: string, decimals: number): bigint {
  return decimalToUnits(value, decimals);
}
