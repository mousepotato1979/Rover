export function impliedProbability(moneyline: number): number {
  if (moneyline > 0) {
    return 100 / (moneyline + 100);
  } else {
    return Math.abs(moneyline) / (Math.abs(moneyline) + 100);
  }
}
