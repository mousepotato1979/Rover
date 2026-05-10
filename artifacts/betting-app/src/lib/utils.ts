import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoneyline(ml: number): string {
  return ml > 0 ? `+${ml}` : `${ml}`;
}

export function impliedProbability(ml: number): number {
  return ml < 0
    ? Math.abs(ml) / (Math.abs(ml) + 100)
    : 100 / (ml + 100);
}

export function calcEdge(confidencePct: number, ml: number): number {
  return Math.round((confidencePct - impliedProbability(ml) * 100) * 10) / 10;
}

export function evPer100(odds: number, hitRate: number): number {
  if (odds > 0) return Math.round(((odds / 100) * hitRate - (1 - hitRate)) * 100 * 10) / 10;
  return Math.round(((100 / Math.abs(odds)) * hitRate - (1 - hitRate)) * 100 * 10) / 10;
}
