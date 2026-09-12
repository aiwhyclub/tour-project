import 'server-only';
import { z } from 'zod';

/**
 * 서버 전용 환경변수 파싱.
 *
 * R2: 이 모듈과 lib/gemini/client.ts 만이 API 키에 닿는다.
 *     'server-only' 를 import 하므로 클라이언트 컴포넌트가 실수로 가져오면
 *     런타임이 아니라 빌드 단계에서 실패한다.
 *
 * 키 없이도 전체 화면을 볼 수 있어야 하므로 GEMINI_API_KEY 는 선택값이며,
 * 없으면 PLAN_SOURCE 가 자동으로 'mock' 이 된다.
 */
const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.8-flash'),
  // gemini-2.5-flash 는 신규 사용자에게 폐지되었다(404). 구글 안내에 따라 3.6 을 쓴다.
  GEMINI_FALLBACK_MODEL: z.string().min(1).default('gemini-3.6-flash'),
  PLAN_SOURCE: z.enum(['auto', 'gemini', 'mock']).default('auto'),
});

const parsed = EnvSchema.safeParse({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
  GEMINI_MODEL: process.env.GEMINI_MODEL || undefined,
  GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL || undefined,
  PLAN_SOURCE: process.env.PLAN_SOURCE || undefined,
});

if (!parsed.success) {
  // 요청 시점이 아니라 서버 기동 시점에 실패시킨다.
  const issues = parsed.error.issues
    .map((i) => i.path.join('.') + ': ' + i.message)
    .join('\n  ');
  throw new Error('환경변수 설정이 올바르지 않습니다.\n  ' + issues);
}

const raw = parsed.data;

/** PLAN_SOURCE=auto 이면 키 유무로 결정한다. */
const effectiveSource: 'gemini' | 'mock' =
  raw.PLAN_SOURCE === 'mock'
    ? 'mock'
    : raw.PLAN_SOURCE === 'gemini'
      ? 'gemini'
      : raw.GEMINI_API_KEY
        ? 'gemini'
        : 'mock';

if (raw.PLAN_SOURCE === 'gemini' && !raw.GEMINI_API_KEY) {
  throw new Error('PLAN_SOURCE=gemini 인데 GEMINI_API_KEY 가 비어 있습니다.');
}

export const env = {
  geminiApiKey: raw.GEMINI_API_KEY,
  geminiModel: raw.GEMINI_MODEL,
  geminiFallbackModel: raw.GEMINI_FALLBACK_MODEL,
  planSource: effectiveSource,
} as const;

/** 로그·오류 메시지에 키가 섞이지 않도록 한 번 더 거르는 안전망 (R2) */
export function redact(text: string): string {
  if (!raw.GEMINI_API_KEY) return text;
  return text.split(raw.GEMINI_API_KEY).join('[REDACTED]');
}
