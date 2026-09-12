import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * SEC5 의 안전망 검증.
 *
 * 실연동 실패 경로에서 키가 로그에 남지 않는다는 것은 실측으로 확인했지만
 * (센티넬 키로 기동 후 400 유발 — 응답·로그 모두 0건), 그것은 상류가 키를
 * 되돌려주지 않았다는 뜻이기도 하다. redact() 는 상류가 키를 echo 했을 때를
 * 대비한 마지막 방어선이므로 따로 고정해 둔다.
 *
 * lib/env.ts 는 'server-only' 를 import 하고 모듈 로드 시점에 환경변수를 파싱한다.
 * 그래서 env 를 먼저 세우고 동적 import 해야 한다.
 */
vi.mock('server-only', () => ({}));

const KEY = 'AIzaSyTEST_SENTINEL_0123456789abcdefghij';

async function loadEnv(overrides: Record<string, string | undefined> = {}) {
  vi.resetModules();
  vi.stubEnv('GEMINI_API_KEY', KEY);
  vi.stubEnv('PLAN_SOURCE', 'gemini');
  for (const [k, v] of Object.entries(overrides)) vi.stubEnv(k, v as string);
  return import('@/lib/env');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('redact — 키가 문자열 어디에 있든 지운다', () => {
  it('단독으로 있으면 지운다', async () => {
    const { redact } = await loadEnv();
    expect(redact(KEY)).toBe('[REDACTED]');
  });

  it('문장 가운데 섞여 있어도 지운다', async () => {
    const { redact } = await loadEnv();
    const out = redact('400 API error: key=' + KEY + ' is invalid');
    expect(out).not.toContain(KEY);
    expect(out).toContain('[REDACTED]');
  });

  it('여러 번 나와도 모두 지운다 (한 번만 바꾸지 않는다)', async () => {
    const { redact } = await loadEnv();
    const out = redact(KEY + ' then ' + KEY + ' again ' + KEY);
    expect(out).not.toContain(KEY);
    expect(out.split('[REDACTED]').length - 1).toBe(3);
  });

  it('JSON 으로 직렬화된 로그 payload 안에서도 지운다', async () => {
    const { redact } = await loadEnv();
    const payload = JSON.stringify({ event: 'model_call_failed', message: 'auth failed for ' + KEY });
    expect(redact(payload)).not.toContain(KEY);
  });

  it('키가 없는 문자열은 그대로 둔다', async () => {
    const { redact } = await loadEnv();
    expect(redact('평범한 오류 메시지입니다')).toBe('평범한 오류 메시지입니다');
  });
});

describe('PLAN_SOURCE 결정', () => {
  it('키가 있으면 auto 는 gemini 로 해석된다', async () => {
    const { env } = await loadEnv({ PLAN_SOURCE: 'auto' });
    expect(env.planSource).toBe('gemini');
  });

  it('mock 은 키가 있어도 mock 이다 (데모 탈출구)', async () => {
    const { env } = await loadEnv({ PLAN_SOURCE: 'mock' });
    expect(env.planSource).toBe('mock');
  });

  it('키가 없으면 redact 는 원문을 그대로 돌려준다', async () => {
    vi.resetModules();
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('PLAN_SOURCE', 'mock');
    const { redact, env } = await import('@/lib/env');
    expect(env.planSource).toBe('mock');
    expect(redact('아무 문자열')).toBe('아무 문자열');
  });
});
