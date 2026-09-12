/**
 * 인메모리 고정 윈도 레이트 리밋.
 *
 * 인스턴스마다 상태가 분리되므로 이것은 최선 노력(best-effort)이다. Fluid Compute
 * 는 인스턴스를 재사용하므로 고전적 서버리스보다는 잘 맞지만, 전역 한도는 아니다.
 *
 * 전역 한도를 걸려면 둘 중 하나가 필요하다.
 *   (a) Vercel Firewall 의 레이트 리밋 규칙 — 유료 플랜 기능이다.
 *       이 프로젝트는 현재 Hobby 플랜이라 쓸 수 없다 (2026-09-12 확인).
 *   (b) 외부 저장소(Redis 등) 기반 카운터 — 의존성과 운영 대상이 하나 늘고,
 *       SEC13("개인정보 미수집 · 저장소 의존성 0개")과 정면으로 부딪힌다.
 *
 * 그래서 지금은 이 모듈이 실질적인 유일한 방어선이다. 위 사실을 감춘 채
 * "진짜 방어선은 Firewall"이라고 적어 두면, 없는 방어를 있다고 믿게 된다.
 * 남용이 실제 문제가 되면 (a) 로 올리는 것이 (b) 보다 먼저다.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_TRACKED_KEYS = 5000;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function sweep(now: number): void {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS - existing.count,
    retryAfterSeconds: 0,
  };
}

/** 프록시 뒤에서 클라이언트 IP 를 추정한다. 없으면 단일 버킷으로 묶는다. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip') ?? 'unknown';
}
