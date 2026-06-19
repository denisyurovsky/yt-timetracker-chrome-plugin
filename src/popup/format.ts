const MINUTES_PER_HOUR = 60;
// Длина рабочего дня в YouTrack по умолчанию — 8 часов.
const HOURS_PER_DAY = 8;
const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;

/**
 * Форматирует минуты в строку вида `XДYЧZZМ`. Нулевые единицы опускаются:
 * 80 → `1Ч20М`, 480 → `1Д`, 20 → `20М`, 0 → `0М`.
 */
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

/** Форматирует минуты в строку 'XчYм' (часы+минуты, без дней): 90 → '1ч30м', 45 → '45м', 0 → '0м'. */
export function formatDuration(totalMinutes: number): string {
  const total = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  const parts: string[] = [];
  if (hours) parts.push(`${hours}ч`);
  if (minutes) parts.push(`${minutes}м`);

  return parts.length ? parts.join("") : "0м";
}

/** Парсит строку длительности ('1ч30м', '30м', '90') в минуты. */
export function parseDuration(text: string): number {
  if (!text) return 0;

  const normalized = text.toLowerCase().replace(/\s+/g, "");
  const hoursMatch = normalized.match(/(\d+)(?:ч|час|h)/);
  const minutesMatch = normalized.match(/(\d+)(?:м|мин|m|min)/);

  if (hoursMatch || minutesMatch) {
    const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
    return hours * 60 + minutes;
  }

  // Просто число — трактуем как минуты.
  const bare = Number(normalized);
  return Number.isFinite(bare) ? Math.max(0, Math.round(bare)) : 0;
}

/** Форматирует метку времени (мс) в дату вида ДД.ММ.ГГГГ. */
export function formatDate(ms: number): string {
  const date = new Date(ms);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getFullYear()}`;
}
