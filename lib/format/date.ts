const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 2026-10-11 -> 10월 11일 (일) */
export function koreanDate(iso: string): string {
  const ms = Date.parse(iso + 'T00:00:00Z');
  if (Number.isNaN(ms)) return iso;
  const d = new Date(ms);
  const weekday = WEEKDAYS[d.getUTCDay()] ?? '';
  return d.getUTCMonth() + 1 + '월 ' + d.getUTCDate() + '일 (' + weekday + ')';
}

/** 2026-10-11 ~ 2026-10-13 -> 10.11 ~ 10.13 */
export function koreanRange(startIso: string, endIso: string): string {
  const fmt = (iso: string) => {
    const ms = Date.parse(iso + 'T00:00:00Z');
    if (Number.isNaN(ms)) return iso;
    const d = new Date(ms);
    return d.getUTCMonth() + 1 + '.' + d.getUTCDate();
  };
  return fmt(startIso) + ' ~ ' + fmt(endIso);
}

/** 분을 사람이 읽는 시간으로. 90 -> 1시간 30분 */
export function minutesToKorean(minutes: number): string {
  if (minutes < 60) return minutes + '분';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? h + '시간' : h + '시간 ' + m + '분';
}

/** 오늘로부터 n일 뒤의 ISO 날짜 */
export function isoAfterDays(days: number): string {
  const now = new Date();
  const base = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}
