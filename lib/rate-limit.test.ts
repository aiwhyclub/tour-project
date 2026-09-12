import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';

/**
 * 주의: buckets 는 모듈 레벨 Map 이라 같은 파일의 테스트끼리 상태가 이어진다.
 * 테스트마다 고유 키를 쓴다. 그래야 실행 순서가 바뀌어도 결과가 같다.
 */
let seq = 0;
const freshKey = () => 'test-key-' + ++seq;

afterEach(() => {
  vi.useRealTimers();
});

describe('checkRateLimit', () => {
  it('윈도 안에서 5번까지 허용하고 6번째를 막는다', () => {
    const key = freshKey();
    const results = Array.from({ length: 6 }, () => checkRateLimit(key));

    expect(results.slice(0, 5).map((r) => r.allowed)).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(results[5]?.allowed).toBe(false);
  });

  it('남은 횟수를 5에서 0까지 줄여 알려 준다', () => {
    const key = freshKey();
    expect(Array.from({ length: 5 }, () => checkRateLimit(key).remaining)).toEqual([
      4, 3, 2, 1, 0,
    ]);
  });

  it('차단 시 Retry-After 에 쓸 초가 1 이상이다 (0 이면 즉시 재시도해 무의미)', () => {
    const key = freshKey();
    for (let i = 0; i < 5; i++) checkRateLimit(key);
    const blocked = checkRateLimit(key);

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(600);
  });

  it('허용될 때는 retryAfterSeconds 가 0 이다', () => {
    expect(checkRateLimit(freshKey()).retryAfterSeconds).toBe(0);
  });

  it('10분 윈도가 지나면 다시 허용한다', () => {
    vi.useFakeTimers();
    const key = freshKey();

    for (let i = 0; i < 5; i++) checkRateLimit(key);
    expect(checkRateLimit(key).allowed).toBe(false);

    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    expect(checkRateLimit(key).allowed).toBe(true);
  });

  it('윈도가 아직 안 지났으면 여전히 막는다', () => {
    vi.useFakeTimers();
    const key = freshKey();

    for (let i = 0; i < 5; i++) checkRateLimit(key);
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(checkRateLimit(key).allowed).toBe(false);
  });

  it('키가 다르면 서로 영향을 주지 않는다', () => {
    const a = freshKey();
    const b = freshKey();
    for (let i = 0; i < 5; i++) checkRateLimit(a);

    expect(checkRateLimit(a).allowed).toBe(false);
    expect(checkRateLimit(b).allowed).toBe(true);
  });
});

describe('clientKey', () => {
  it('x-forwarded-for 의 첫 항목을 쓴다 (뒤쪽은 프록시 체인이다)', () => {
    const h = new Headers({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' });
    expect(clientKey(h)).toBe('203.0.113.7');
  });

  it('첫 항목의 공백을 제거한다', () => {
    expect(clientKey(new Headers({ 'x-forwarded-for': '  203.0.113.7  ' }))).toBe(
      '203.0.113.7',
    );
  });

  it('x-forwarded-for 가 비면 x-real-ip 로 내려간다', () => {
    const h = new Headers({ 'x-forwarded-for': '', 'x-real-ip': '198.51.100.9' });
    expect(clientKey(h)).toBe('198.51.100.9');
  });

  it('x-forwarded-for 첫 항목이 공백뿐이어도 x-real-ip 로 내려간다', () => {
    const h = new Headers({ 'x-forwarded-for': ' , 70.41.3.18', 'x-real-ip': '198.51.100.9' });
    expect(clientKey(h)).toBe('198.51.100.9');
  });

  it('둘 다 없으면 unknown 단일 버킷으로 묶는다', () => {
    expect(clientKey(new Headers())).toBe('unknown');
  });
});
