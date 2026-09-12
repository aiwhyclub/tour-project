import 'server-only';
import { getGeminiClient } from '@/lib/gemini/client';
import { ITINERARY_JSON_SCHEMA } from '@/lib/gemini/response-schema';
import { SYSTEM_INSTRUCTION, buildUserContent } from '@/lib/gemini/prompt';
import { normalizePlan } from '@/lib/gemini/normalize';
import {
  ItineraryDraftRepairSchema,
  ItineraryDraftSchema,
} from '@/lib/validation/itinerary-schema';
import type { ItineraryDraft } from '@/lib/validation/itinerary-schema';
import type { PlanRequest } from '@/lib/validation/plan-request';
import type { ItineraryPlan } from '@/types/itinerary';
import { PlanError } from '@/lib/errors';
import { env, redact } from '@/lib/env';
import { logError, logInfo } from '@/lib/log';

const GENERATION_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_TOKENS = 24_576;

/** 모델 응답에서 JSON 본문만 떼어낸다. 코드펜스와 앞뒤 잡소리를 견딘다. */
function extractJsonText(raw: string): string {
  let text = raw.trim();

  // ```json ... ``` 펜스 제거
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) text = fence[1].trim();

  // 앞뒤에 설명이 붙었으면 첫 { 부터 마지막 } 까지만 취한다.
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first > 0 || (last >= 0 && last < text.length - 1)) {
    if (first >= 0 && last > first) text = text.slice(first, last + 1);
  }
  return text;
}

interface RawCall {
  text: string;
  truncated: boolean;
  model: string;
}

const OUTPUT_TOKEN_CAP = 32_768;

/**
 * Gemini 호출.
 *
 * interactions.create 를 쓴다. models.generateContent 가 아니다 — 이건 취향이 아니라
 * 실측 결과다 (2026-09-12 기준):
 *   - gemini-3.8-flash 는 generateContent 로는 응답하지 않고 interactions 로만 응답했다
 *   - gemini-2.5-flash 는 신규 사용자에게 폐지되었고, 구글의 안내 메시지 자체가
 *     "gemini-3.6-flash 로 바꾸고 Interactions API 를 쓰라"고 지시한다
 *
 * 파라미터는 snake_case 이며 생성 옵션은 generation_config 아래로 중첩된다.
 * temperature / max_output_tokens 를 최상위에 두면 400 Unknown parameter 가 난다.
 */
/**
 * 스키마 없이 호출할 때 프롬프트에 붙이는 형태 지시.
 * 구조화 출력이 거부될 때의 대비책이므로 간결해야 한다.
 */
const SHAPE_HINT = [
  '',
  '# 출력 형태 (JSON 만, 설명 문장 없이)',
  '{',
  '  "summary": { "title", "destination", "startDate", "endDate", "days"(정수), "nights"(정수),',
  '               "partySummary", "styleTags"[문자열], "headline", "highlights"[문자열 3~5개] },',
  '  "days": [ { "dayIndex"(1부터), "date"("YYYY-MM-DD"), "theme", "summary",',
  '              "pace"("relaxed"|"balanced"|"packed"),',
  '              "items": [ { "id", "order"(1부터),',
  '                           "kind"("sight"|"meal"|"move"|"rest"|"activity"|"stay"),',
  '                           "title", "areaName", "description",',
  '                           "startTime"("HH:MM"), "durationMinutes"(정수),',
  '                           "costAmount"(정수 또는 null), "costBasis",',
  '                           "tips"[문자열], "respectsAvoid"[문자열], "indoor"(true/false) } ] } ],',
  '  "budget": { "lines": [ { "category"("transport"|"stay"|"food"|"activity"|"shopping"|"etc"),',
  '                           "label", "amount"(정수), "basis", "assumptions"[문자열] } ],',
  '              "excluded"[문자열] },',
  '  "checklist": { "items": [ { "id", "label",',
  '                              "category"("document"|"clothing"|"gear"|"health"|"etc"),',
  '                              "priority"("must"|"recommended"|"optional"), "reason" } ],',
  '                 "seasonNote" },',
  '  "rainyDay": { "alternatives": [ { "id", "dayIndex"(정수), "replacesActivityId"(문자열 또는 null),',
  '                                    "title", "areaName", "description",',
  '                                    "costAmount"(정수 또는 null), "costBasis" } ],',
  '                "generalAdvice"[문자열] }',
  '}',
].join('\n');

const INVALID_ARGUMENT = /invalid[ _]argument/i;
const TRANSIENT = /429|quota|rate limit|503|unavailable|high demand|timeout/i;

/**
 * 구조화 출력 스키마가 거부됐는지 판별한다.
 *
 * 메시지 정규식만 믿으면 안 된다. SDK 는 오류 메시지를
 * `${httpStatus} ${payload.error.message}` 로만 조립하고 payload 의
 * status 필드('INVALID_ARGUMENT')는 메시지에 넣지 않는다
 * (@google/genai 2.21.0, APIError.makeMessage). 즉 메시지에서
 * INVALID_ARGUMENT 를 찾는 검사는 구글이 그 문자열을 message 본문에도
 * 넣어 줄 때만 우연히 동작한다. 그래서 구조화된 필드를 먼저 본다.
 *
 * 판별 순서:
 *   1. 쿼터·레이트·가용성 오류는 스키마와 무관하므로 즉시 제외
 *   2. HTTP 400 이 아니면 요청 형태 문제가 아니므로 제외
 *   3. payload.status / body / message 중 어디서든 INVALID_ARGUMENT 확인
 *   4. 그래도 확증이 없으면, 400 자체가 요청 형태 문제이고 이 코드가 만드는
 *      400 의 가변 요소는 스키마뿐이므로 스키마를 빼고 한 번 더 시도한다.
 *      400 은 일시적 오류가 아니라 재시도해도 같은 결과이므로 손해가 없다.
 */
function isSchemaRejection(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (TRANSIENT.test(message)) return false;

  const err = error as {
    status?: unknown;
    statusCode?: unknown;
    error?: unknown;
    body?: unknown;
  } | null;

  const httpStatus =
    typeof err?.statusCode === 'number'
      ? err.statusCode
      : typeof err?.status === 'number'
        ? err.status
        : null;

  // 상태 코드를 알 수 있는데 400 이 아니면 스키마 문제가 아니다.
  if (httpStatus !== null && httpStatus !== 400) return false;

  const payloadStatus =
    err?.error && typeof err.error === 'object'
      ? String((err.error as { status?: unknown }).status ?? '')
      : '';
  if (INVALID_ARGUMENT.test(payloadStatus)) return true;
  if (typeof err?.body === 'string' && INVALID_ARGUMENT.test(err.body)) return true;
  if (INVALID_ARGUMENT.test(message)) return true;

  return httpStatus === 400;
}

/**
 * Gemini 호출.
 *
 * interactions.create 를 쓴다. models.generateContent 가 아니다 — 취향이 아니라
 * 실측 결과다 (2026-09-12 기준):
 *   - gemini-3.8-flash 는 generateContent 로는 응답하지 않고 interactions 로만 응답했다
 *   - gemini-2.5-flash 는 신규 사용자에게 폐지되었고, 구글의 안내 메시지 자체가
 *     "gemini-3.6-flash 로 바꾸고 Interactions API 를 쓰라"고 지시한다
 *
 * 파라미터는 snake_case 이며 생성 옵션은 generation_config 아래로 중첩된다.
 * temperature 를 최상위에 두면 400 Unknown parameter 가 난다.
 *
 * useSchema=false 는 구조화 출력이 거부됐을 때의 폴백이다. Gemini 의 스키마
 * 복잡도 한계는 문서화되어 있지 않고 조용히 바뀌므로, 거부되면 스키마를 빼고
 * 프롬프트로 형태를 지시한 뒤 Zod 검증과 복구 사다리로 흡수한다.
 */
async function callModel(
  model: string,
  userContent: string,
  maxOutputTokens: number,
  signal: AbortSignal,
  useSchema: boolean,
): Promise<RawCall> {
  const ai = getGeminiClient();

  const interaction = await ai.interactions.create(
    {
      model,
      input: useSchema ? userContent : userContent + SHAPE_HINT,
      system_instruction: SYSTEM_INSTRUCTION,
      generation_config: {
        // temperature 는 이 API 표면에 존재하지 않는다 (SDK 타입에도 없고
        // 최상위에 두면 400 Unknown parameter 가 난다). 출력 형태는
        // 스키마 또는 SHAPE_HINT 가 이미 제약한다.
        max_output_tokens: maxOutputTokens,
        // Gemini 3 계열은 기본적으로 깊게 추론하며, 그 시간이 Vercel 함수
        // 실행 상한(60s)을 넘겨 타임아웃을 만든다. 이 작업은 형태가 이미
        // 강제되므로 깊은 추론이 필요 없다.
        thinking_level: 'low',
        thinking_summaries: 'none',
      },
      // 스키마 없이 호출할 때도 response_format 자체는 있어야 한다.
      // response_mime_type 만 단독으로 보내면 400 이 난다:
      //   "responseFormat must be set when responseMimeType is set."
      // schema 키만 빼는 것이 올바른 'JSON 모드, 스키마 없음' 형태다.
      response_format: useSchema
        ? {
            type: 'text' as const,
            mime_type: 'application/json',
            schema: ITINERARY_JSON_SCHEMA as Record<string, unknown>,
          }
        : {
            type: 'text' as const,
            mime_type: 'application/json',
          },
    },
    { signal },
  );

  const text = interaction.output_text ?? '';
  if (!text) {
    // 안전 필터 등으로 출력이 비어 있는 경우
    throw new PlanError('MODEL_REFUSED');
  }

  const usage = interaction.usage as { total_output_tokens?: number } | undefined;
  const produced = usage?.total_output_tokens ?? 0;
  const truncated = produced > 0 && produced >= maxOutputTokens - 16;

  return { text, truncated, model };
}

/**
 * 이 모델이 우리 스키마를 거부한 적이 있는지 기억한다.
 * Gemini 의 스키마 복잡도 한계는 문서화되어 있지 않고 조용히 바뀌므로
 * 시도 자체는 유지하되, 한 번 거부당했으면 프로세스가 사는 동안은
 * 매 요청마다 실패할 호출을 반복하지 않는다 (지연과 쿼터를 아낀다).
 */
const schemaRejectedModels = new Set<string>();

/** 스키마로 한 번, 거부되면 스키마 없이 한 번. */
async function callWithSchemaFallback(
  model: string,
  userContent: string,
  maxOutputTokens: number,
  signal: AbortSignal,
  requestId: string,
): Promise<RawCall> {
  if (schemaRejectedModels.has(model)) {
    return callModel(model, userContent, maxOutputTokens, signal, false);
  }

  try {
    return await callModel(model, userContent, maxOutputTokens, signal, true);
  } catch (error) {
    if (error instanceof PlanError) throw error;
    if (signal.aborted) throw error;
    if (!isSchemaRejection(error)) throw error;

    logInfo('schema_rejected_fallback', { requestId, model });
    const call = await callModel(model, userContent, maxOutputTokens, signal, false);
    // 스키마를 빼니 통과했다는 것이 스키마가 원인이었다는 유일한 확증이다.
    // 그때만 기억한다 — 스키마와 무관한 400 으로 구조화 출력을 영구히
    // 포기해 버리는 일이 없게 한다.
    schemaRejectedModels.add(model);
    return call;
  }
}

interface RepairOutcome {
  draft: ItineraryDraft;
  degraded: boolean;
  reasons: string[];
}

/**
 * 스키마 검증에 실패한 payload 를 살릴 수 있으면 살린다.
 *
 * 두 가지를 지킨다.
 *  1. 깨진 원소만 골라낸다 — 하루의 일정 항목 하나가 어긋났다고 그날 전체를,
 *     나아가 전체 응답을 버리지 않는다.
 *  2. 복구 판정은 관대 스키마로 한다. 원래 최소 개수(일정 3개·예산 3행·준비물
 *     6개·우천 2건)는 모델에게 요구하는 목표치이지, 이미 받은 응답을 살릴지
 *     가르는 기준이 아니다. 엄격 스키마로 판정하면 가지치기 후 개수가 모자라
 *     전부 탈락하고, 복구 사다리가 정상 응답만 통과시키는 죽은 코드가 된다.
 *
 * 네 블록이 모두 비지 않게 남으면 degraded 로 표시하고 200 을 돌려준다 —
 * 완전한 실패보다 "조금 부족한 결과 + 경고"가 사용자에게 낫다.
 */
function repairPartial(value: unknown): RepairOutcome | null {
  if (!value || typeof value !== 'object') return null;
  const reasons: string[] = [];
  const obj = value as Record<string, unknown>;

  const pruneArray = <T>(
    input: unknown,
    itemSchema: { safeParse: (v: unknown) => { success: boolean; data?: unknown } },
    label: string,
  ): T[] => {
    if (!Array.isArray(input)) return [];
    const kept: T[] = [];
    let dropped = 0;
    for (const el of input) {
      const r = itemSchema.safeParse(el);
      if (r.success) kept.push(r.data as T);
      else dropped += 1;
    }
    if (dropped > 0) reasons.push(label + ' ' + dropped + '건 제외');
    return kept;
  };

  const shape = ItineraryDraftSchema.shape;
  const dayShape = shape.days.element.shape;

  /* --- 일자: 항목을 먼저 정리하고, 항목이 하나도 남지 않은 날만 버린다 --- */
  const rawDays = Array.isArray(obj.days) ? obj.days : [];
  let droppedDays = 0;
  let droppedItems = 0;
  const days: unknown[] = [];

  for (const rawDay of rawDays) {
    if (!rawDay || typeof rawDay !== 'object') {
      droppedDays += 1;
      continue;
    }
    const day = rawDay as Record<string, unknown>;
    const items = Array.isArray(day.items) ? day.items : [];
    const keptItems: unknown[] = [];
    for (const item of items) {
      const r = dayShape.items.element.safeParse(item);
      if (r.success) keptItems.push(r.data);
      else droppedItems += 1;
    }
    if (keptItems.length === 0) {
      droppedDays += 1;
      continue;
    }
    days.push({ ...day, items: keptItems });
  }
  if (droppedItems > 0) reasons.push('일정 항목 ' + droppedItems + '건 제외');
  if (droppedDays > 0) reasons.push('일자 ' + droppedDays + '일 제외');

  const budgetRaw = obj.budget as Record<string, unknown> | undefined;
  const lines = pruneArray(budgetRaw?.lines, shape.budget.shape.lines.element, '예산 항목');
  const checklistRaw = obj.checklist as Record<string, unknown> | undefined;
  const items = pruneArray(
    checklistRaw?.items,
    shape.checklist.shape.items.element,
    '준비물',
  );
  const rainyRaw = obj.rainyDay as Record<string, unknown> | undefined;
  const alternatives = pruneArray(
    rainyRaw?.alternatives,
    shape.rainyDay.shape.alternatives.element,
    '우천 대안',
  );

  // 네 블록 중 하나라도 비면 복구 실패로 본다.
  if (!days.length || !lines.length || !items.length || !alternatives.length) {
    return null;
  }

  const patched = {
    ...obj,
    days,
    budget: { ...(budgetRaw ?? {}), lines },
    checklist: { ...(checklistRaw ?? {}), items },
    rainyDay: { ...(rainyRaw ?? {}), alternatives },
  };

  const result = ItineraryDraftRepairSchema.safeParse(patched);
  if (!result.success) return null;

  /*
   * 가지치기로 버린 것이 없는데도 여기까지 왔다면, 엄격 스키마와 관대 스키마의
   * 차이는 최소 개수뿐이다. 그것을 말해 주지 않으면 사용자는 사유가 비어 있는
   * "생성 결과 일부가 온전하지 않아 보정했습니다" 경고만 보게 된다.
   *
   * 실제로 그랬다. 실연동 첫 호출에서 준비물이 5개(최소 6개)로 왔고, 나머지
   * 블록은 전부 최소치를 넘겼는데도 사유 없는 경고가 붙었다. 멀쩡한 일정에
   * 설명 없는 경고를 붙이면 경고 자체가 신뢰를 잃는다 (F-25).
   */
  const d = result.data;
  const thinDays = d.days.filter((day) => day.items.length < 3).length;
  if (thinDays > 0) reasons.push('일정이 3개 미만인 날 ' + thinDays + '일');
  if (d.budget.lines.length < 3) {
    reasons.push('예산 항목 ' + d.budget.lines.length + '개 (권장 3개 이상)');
  }
  if (d.checklist.items.length < 6) {
    reasons.push('준비물 ' + d.checklist.items.length + '개 (권장 6개 이상)');
  }
  if (d.rainyDay.alternatives.length < 2) {
    reasons.push('우천 대안 ' + d.rainyDay.alternatives.length + '건 (권장 2건 이상)');
  }
  if (d.summary.highlights.length < 3) {
    reasons.push('핵심 포인트 ' + d.summary.highlights.length + '개 (권장 3개 이상)');
  }

  // 그래도 짚이는 게 없으면 최소한 형식 문제였다는 사실은 밝힌다.
  // 내부 검증 메시지는 넣지 않는다 (R2).
  if (reasons.length === 0) {
    reasons.push('응답 일부가 형식에 맞지 않아 보정');
  }

  return { draft: d, degraded: true, reasons };
}

function parseDraft(text: string): { draft: ItineraryDraft } | { issues: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(text));
  } catch {
    return { issues: 'JSON 파싱 실패' };
  }
  const result = ItineraryDraftSchema.safeParse(parsed);
  if (result.success) return { draft: result.data };

  const issues = result.error.issues
    .slice(0, 20)
    .map((i) => i.path.join('.') + ': ' + i.message)
    .join('\n');
  return { issues };
}

/**
 * 실패 사다리:
 *   0. MAX_TOKENS      -> 토큰 상한을 올려 1회 재시도
 *   1. JSON 파싱 실패   -> 펜스 제거 후 재파싱 (extractJsonText 가 처리)
 *   2. 스키마 실패      -> 부분 복구. 4블록이 살면 degraded 200
 *   3. 그래도 실패      -> 이슈 목록을 붙여 1회 수정 왕복
 *   4. 그래도 실패      -> 폴백 모델로 전체 재시도
 *   5. 그래도 실패      -> 502 MODEL_SCHEMA_INVALID
 */
export async function generatePlan(
  request: PlanRequest,
  requestId: string,
): Promise<ItineraryPlan> {
  const userContent = buildUserContent(request);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

  try {
    const models = [env.geminiModel, env.geminiFallbackModel];

    for (let attempt = 0; attempt < models.length; attempt += 1) {
      const model = models[attempt];
      if (!model) continue;

      try {
        let call = await callWithSchemaFallback(
          model,
          userContent,
          MAX_OUTPUT_TOKENS,
          controller.signal,
          requestId,
        );

        // 0. 잘린 응답은 성공이 아니다. 짧게 쓰라는 지시와 함께 한 번 더 시도한다.
        if (call.truncated) {
          logInfo('max_tokens_retry', { requestId, model });
          call = await callWithSchemaFallback(
            model,
            userContent +
              '\n\n# 추가 지시\n- 설명 문장을 짧게 써서 전체 응답 길이를 줄여라.',
            OUTPUT_TOKEN_CAP,
            controller.signal,
            requestId,
          );
        }

        // 1~2. 파싱 + 검증, 실패 시 부분 복구
        const first = parseDraft(call.text);
        if ('draft' in first) {
          return normalizePlan(first.draft, {
            request,
            model,
            degraded: false,
            degradedReasons: [],
          });
        }

        let parsedRaw: unknown = null;
        try {
          parsedRaw = JSON.parse(extractJsonText(call.text));
        } catch {
          parsedRaw = null;
        }
        const repaired = parsedRaw ? repairPartial(parsedRaw) : null;
        if (repaired) {
          logInfo('degraded_recovery', { requestId, model, reasons: repaired.reasons });
          return normalizePlan(repaired.draft, {
            request,
            model,
            degraded: true,
            degradedReasons: repaired.reasons,
          });
        }

        // 3. 수정 왕복 1회
        logInfo('repair_roundtrip', { requestId, model });
        const repairCall = await callWithSchemaFallback(
          model,
          [
            userContent,
            '',
            '# 이전 응답이 스키마를 위반했습니다. 아래 문제를 고쳐 JSON 만 다시 출력하세요.',
            first.issues,
          ].join('\n'),
          MAX_OUTPUT_TOKENS,
          controller.signal,
          requestId,
        );
        const second = parseDraft(repairCall.text);
        if ('draft' in second) {
          return normalizePlan(second.draft, {
            request,
            model,
            degraded: true,
            degradedReasons: ['형식 오류를 1회 보정했습니다'],
          });
        }

        // 4. 다음 모델로 넘어간다.
        logError('schema_invalid_after_repair', {
          requestId,
          model,
          issues: first.issues.slice(0, 500),
          sample: redact(call.text.slice(0, 2000)),
        });
      } catch (error) {
        if (error instanceof PlanError) throw error;
        if (controller.signal.aborted) throw new PlanError('MODEL_TIMEOUT');

        const message = error instanceof Error ? redact(error.message) : String(error);
        logError('model_call_failed', { requestId, model, message });

        // 마지막 모델까지 실패했으면 상위로 올린다.
        if (attempt === models.length - 1) {
          throw new PlanError(
            /quota|rate limit|429|unavailable|503|high demand/i.test(message)
              ? 'MODEL_UNAVAILABLE'
              : 'MODEL_SCHEMA_INVALID',
          );
        }
      }
    }

    // 5. 모든 모델 소진
    throw new PlanError('MODEL_SCHEMA_INVALID');
  } finally {
    clearTimeout(timer);
  }
}
