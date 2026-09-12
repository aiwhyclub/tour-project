import { describe, expect, it } from 'vitest';
import { krw, krwRange, krwShort } from '@/lib/format/krw';

describe('krw', () => {
  it('천단위 구분과 원 단위를 붙인다', () => {
    expect(krw(1_234_000)).toBe('1,234,000원');
    expect(krw(0)).toBe('0원');
  });

  it('소수는 반올림한다', () => {
    expect(krw(1234.4)).toBe('1,234원');
    expect(krw(1234.5)).toBe('1,235원');
  });
});

describe('krwShort', () => {
  // 1만원이 만 단위 표기로 넘어가는 경계. 여기서 어긋나면 예산표와
  // 요약 카드가 같은 금액을 다르게 보여 준다.
  it('1만원 미만은 원 단위 그대로', () => {
    expect(krwShort(9_999)).toBe('9,999원');
    expect(krwShort(0)).toBe('0원');
  });

  it('1만원부터 만 단위로 바뀐다', () => {
    expect(krwShort(10_000)).toBe('1만원');
  });

  it('만 단위는 반올림한다', () => {
    expect(krwShort(124_000)).toBe('12만원');
    expect(krwShort(125_000)).toBe('13만원');
    expect(krwShort(12_340_000)).toBe('1,234만원');
  });
});

describe('krwRange', () => {
  it('상하한이 같으면 범위가 아니라 단일 값으로 적는다', () => {
    expect(krwRange(120_000, 120_000)).toBe('약 12만원');
  });

  it('다르면 범위로 적는다', () => {
    expect(krwRange(120_000, 160_000)).toBe('약 12만원 ~ 16만원');
  });
});
