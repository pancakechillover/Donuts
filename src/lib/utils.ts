import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind merge
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting
export function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function nowYMD(): string {
  return ymd(new Date());
}

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function timeToMin(t?: string | null): number | null {
  if (!t) return null;
  const [hh, mm] = t.split(":").map(Number);
  if (isNaN(hh) || isNaN(mm)) return null;
  return hh * 60 + mm;
}

export function minToTime(min: number): string {
  min = ((min % 1440) + 1440) % 1440;
  const hh = String(Math.floor(min / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function fmtMinRange(a: number, b: number): string {
  return `${minToTime(a)}–${minToTime(b)}`;
}

export function minutesBetween(bedMin: number | null, wakeMin: number | null): number | null {
  if (bedMin == null || wakeMin == null) return null;
  if (wakeMin >= bedMin) return wakeMin - bedMin;
  return (1440 - bedMin) + wakeMin;
}

export function fmtDuration(mins: number | null): string {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} 分钟`;
  if (m === 0) return `${h} 小时`;
  return `${h} 小时 ${m} 分钟`;
}

// Canvas helpers
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: boolean,
  stroke: boolean
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

export function setCanvasFont(ctx: CanvasRenderingContext2D, sizePx: number, weight: number = 400) {
  const fam = 'ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  ctx.font = `${weight} ${sizePx}px ${fam}`;
}
