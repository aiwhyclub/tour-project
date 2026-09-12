/** 금액을 한국어 표기로. 1,234,000원 */
export function krw(amount: number): string {
  return Math.round(amount).toLocaleString('ko-KR') + '원';
}

/** 큰 금액을 읽기 쉽게. 87만원 / 1,234만원 */
export function krwShort(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded < 10_000) return rounded.toLocaleString('ko-KR') + '원';
  const man = Math.round(rounded / 10_000);
  return man.toLocaleString('ko-KR') + '만원';
}

/** 추정 범위 표기. 약 12만 ~ 16만원 */
export function krwRange(low: number, high: number): string {
  if (low === high) return '약 ' + krwShort(low);
  return '약 ' + krwShort(low) + ' ~ ' + krwShort(high);
}
