export function formatCurrency(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function formatCurrencyPrecise(value: number): string {
  return `₹${value.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}

export function formatMultiplier(value: number): string {
  return `${value.toFixed(1)}×`;
}

export function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}
