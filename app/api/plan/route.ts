import { NextResponse } from 'next/server';
import { PlanRequestSchema, toFieldErrors } from '@/lib/validation/plan-request';
import { LIMITS } from '@/lib/constants/options';
import { ERROR_SPECS, PlanError, type ApiErrorCode } from '@/lib/errors';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import { buildMockPlan } from '@/lib/mock/sample-itinerary';
import { generatePlan } from '@/lib/gemini/generate-plan';
import { env } from '@/lib/env';
import { logError, logInfo } from '@/lib/log';
import type { PlanErrorResponse, PlanSuccessResponse } from '@/types/api';

/**
 * 일정 생성 엔드포인트.
 *
 * R2: API 키에 닿는 유일한 요청 경로다. 키는 lib/env.ts -> lib/gemini/client.ts
 *     안에서만 읽히고, 응답·오류 메시지·로그 어디에도 노출되지 않는다.
 * R3: 클라이언트가 무엇을 보내든 여기서 다시 검증하며,
 *     원본 body 가 아니라 파싱 결과(parsed.data)만 하위로 전달한다.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function requestId(): string {
  return 'req_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fail(
  code: ApiErrorCode,
  id: string,
  startedAt: number,
  fields: Record<string, string> | null = null,
  extraHeaders?: Record<string, string>,
): NextResponse<PlanErrorResponse> {
  const spec = ERROR_SPECS[code];
  return NextResponse.json(
    {
      ok: false as const,
      error: {
        code,
        message: spec.message,
        retryable: spec.retryable,
        fields,
      },
      meta: {
        requestId: id,
        latencyMs: Date.now() - startedAt,
        source: env.planSource,
      },
    },
    { status: spec.status, headers: extraHeaders },
  );
}

export async function POST(request: Request) {
  const id = requestId();
  const startedAt = Date.now();

  try {
    /* --- 1. 본문 크기 제한: 모델을 부르기 전에 막는다 --- */
    const declared = Number(request.headers.get('content-length') ?? '0');
    if (declared > LIMITS.bodyBytesMax) {
      return fail('PAYLOAD_TOO_LARGE', id, startedAt);
    }

    const raw = await request.text();
    if (raw.length > LIMITS.bodyBytesMax) {
      return fail('PAYLOAD_TOO_LARGE', id, startedAt);
    }

    /* --- 2. 레이트 리밋 --- */
    const limit = checkRateLimit(clientKey(request.headers));
    if (!limit.allowed) {
      return fail('RATE_LIMITED', id, startedAt, null, {
        'Retry-After': String(limit.retryAfterSeconds),
      });
    }

    /* --- 3. 서버 검증. 이 결과만 아래로 흘려보낸다 (R3) --- */

    // Content-Type 검사 (docs/03_FRD.md 2-4). JSON.parse 가 우연히 통과하는 본문이
    // 들어와도 계약을 어긴 요청은 받지 않는다. charset 파라미터는 허용한다.
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().trim().startsWith('application/json')) {
      return fail('VALIDATION_FAILED', id, startedAt, {
        _: '요청 형식이 올바르지 않습니다. Content-Type 은 application/json 이어야 합니다.',
      });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return fail('VALIDATION_FAILED', id, startedAt, {
        _: '요청 형식이 올바르지 않습니다.',
      });
    }

    const parsed = PlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION_FAILED', id, startedAt, toFieldErrors(parsed.error));
    }
    const input = parsed.data;

    /* --- 4. 생성 --- */
    const useMock =
      env.planSource === 'mock' ||
      new URL(request.url).searchParams.get('source') === 'mock';

    const plan = useMock ? buildMockPlan(input) : await generatePlan(input, id);

    // 목업 경로는 처리 중 화면을 실제로 보여주기 위해 약간 지연시킨다.
    if (useMock) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    logInfo('plan_generated', {
      requestId: id,
      source: useMock ? 'mock' : 'gemini',
      days: plan.days.length,
      degraded: plan.generation.degraded,
      latencyMs: Date.now() - startedAt,
    });

    const response: PlanSuccessResponse = {
      ok: true,
      data: plan,
      meta: {
        requestId: id,
        latencyMs: Date.now() - startedAt,
        source: useMock ? 'mock' : 'gemini',
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PlanError) {
      logError('plan_failed', { requestId: id, code: error.code });
      return fail(error.code, id, startedAt, error.fields);
    }
    // 내부 오류의 원문은 절대 클라이언트로 내보내지 않는다 (R2)
    logError('plan_unhandled', {
      requestId: id,
      message: error instanceof Error ? error.message : String(error),
    });
    return fail('INTERNAL', id, startedAt);
  }
}
