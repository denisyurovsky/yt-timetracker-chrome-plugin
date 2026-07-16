const MINUTES_PER_HOUR = 60;
// Рабочий день и неделя YouTrack по умолчанию: 8 часов и 5 дней.
const HOURS_PER_DAY = 8;
const DAYS_PER_WEEK = 5;
const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;
const MINUTES_PER_WEEK = MINUTES_PER_DAY * DAYS_PER_WEEK;

const UNIT_MINUTES: Record<string, number> = {
  w: MINUTES_PER_WEEK,
  d: MINUTES_PER_DAY,
  h: MINUTES_PER_HOUR,
  m: 1,
};

const UNIT_ALIAS: Record<string, keyof typeof UNIT_MINUTES> = {
  н: "w",
  w: "w",
  д: "d",
  d: "d",
  ч: "h",
  h: "h",
  м: "m",
  m: "m",
};

export type ParseDurationResult =
  | { ok: true; minutes: number }
  | { ok: false };

/**
 * Разбор строки длительности в формате YouTrack: н/д/ч/м (или w/d/h/m).
 * Каждая единица — не чаще одного раза; пробелы допустимы.
 */
export function tryParseDuration(text: string): ParseDurationResult {
  if (!text?.trim()) return { ok: false };

  const normalized = text.toLowerCase().replace(/\s+/g, "");
  const re = /(\d+)([ндчмwdhm])/g;
  const seen = new Set<keyof typeof UNIT_MINUTES>();
  let minutes = 0;
  let consumed = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(normalized)) !== null) {
    // Части должны идти подряд с начала строки — иначе мусор посередине.
    if (match.index !== consumed) {
      return { ok: false };
    }

    const rawValue = match[1];
    const rawUnit = match[2];
    if (rawValue === undefined || rawUnit === undefined) {
      return { ok: false };
    }

    const value = Number(rawValue);
    const alias = UNIT_ALIAS[rawUnit];
    if (alias === undefined || !Number.isFinite(value) || seen.has(alias)) {
      return { ok: false };
    }

    const unitMinutes = UNIT_MINUTES[alias];
    if (unitMinutes === undefined) {
      return { ok: false };
    }

    seen.add(alias);
    minutes += value * unitMinutes;
    consumed = match.index + match[0].length;
  }

  if (seen.size === 0 || consumed !== normalized.length) {
    return { ok: false };
  }

  return { ok: true, minutes };
}

export function parseDuration(text: string): number {
  const result = tryParseDuration(text);
  return result.ok ? result.minutes : 0;
}

export function formatMinutes(totalMinutes: number): string {
  const total = Math.max(0, Math.round(totalMinutes));

  const days = Math.floor(total / MINUTES_PER_DAY);
  const hours = Math.floor((total % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  const minutes = total % MINUTES_PER_HOUR;

  const parts: string[] = [];
  if (days) parts.push(`${days}Д`);
  if (hours) parts.push(`${hours}Ч`);
  if (minutes) parts.push(`${minutes}М`);

  return parts.length ? parts.join("") : "0М";
}

export function formatDuration(totalMinutes: number): string {
  let remaining = Math.max(0, Math.round(totalMinutes));

  const weeks = Math.floor(remaining / MINUTES_PER_WEEK);
  remaining %= MINUTES_PER_WEEK;
  const days = Math.floor(remaining / MINUTES_PER_DAY);
  remaining %= MINUTES_PER_DAY;
  const hours = Math.floor(remaining / MINUTES_PER_HOUR);
  const minutes = remaining % MINUTES_PER_HOUR;

  const parts: string[] = [];
  if (weeks) parts.push(`${weeks}н`);
  if (days) parts.push(`${days}д`);
  if (hours) parts.push(`${hours}ч`);
  if (minutes) parts.push(`${minutes}м`);

  return parts.length ? parts.join("") : "0м";
}

export function formatDate(ms: number): string {
  const date = new Date(ms);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getFullYear()}`;
}
