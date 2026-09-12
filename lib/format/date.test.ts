import { describe, expect, it } from 'vitest';
import { isoAfterDays, koreanDate, koreanRange, minutesToKorean } from '@/lib/format/date';

describe('koreanDate', () => {
  it('요일까지 붙인다', () => {
    expect(koreanDate('2026-10-11')).toBe('10월 11일 (일)');
    expect(koreanDate('2026-10-03')).toBe('10월 3일 (토)');
  });

  it('월·일에 0 을 채우지 않는다', () => {
    expect(koreanDate('2026-01-01')).toBe('1월 1일 (목)');
  });

  it('파싱할 수 없는 값은 그대로 돌려준다 (화면이 깨지는 대신)', () => {
    expect(koreanDate('없는날짜')).toBe('없는날짜');
    expect(koreanDate('')).toBe('');
  });
});

describe('koreanRange', () => {
  it('월.일 ~ 월.일 로 줄인다', () => {
    expect(koreanRange('2026-10-03', '2026-10-05')).toBe('10.3 ~ 10.5');
  });

  it('한쪽이 파싱 불가여도 다른 쪽은 포맷한다', () => {
    expect(koreanRange('2026-10-03', 'xx')).toBe('10.3 ~ xx');
  });
});

describe('minutesToKorean', () => {
  it('60분 미만은 분만', () => {
    expect(minutesToKorean(59)).toBe('59분');
    expect(minutesToKorean(0)).toBe('0분');
  });

  it('정각이면 시간만', () => {
    expect(minutesToKorean(60)).toBe('1시간');
    expect(minutesToKorean(120)).toBe('2시간');
  });

  it('나머지가 있으면 시간과 분을 모두', () => {
    expect(minutesToKorean(90)).toBe('1시간 30분');
  });
});

describe('isoAfterDays', () => {
  it('YYYY-MM-DD 형태다', () => {
    expect(isoAfterDays(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(isoAfterDays(30)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('n 일 뒤가 정확히 n 일 뒤다', () => {
    const a = Date.parse(isoAfterDays(0) + 'T00:00:00Z');
    const b = Date.parse(isoAfterDays(7) + 'T00:00:00Z');
    expect(b - a).toBe(7 * 86_400_000);
  });

  it('폼 기본값으로 쓰이므로 오늘(로컬 기준)을 가리킨다', () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const localToday =
      now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    expect(isoAfterDays(0)).toBe(localToday);
  });
});
