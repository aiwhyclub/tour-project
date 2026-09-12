import { z } from 'zod';

/**
 * 일정 응답 스키마 — 단일 진실원천.
 *
 * 이 스키마 하나가 두 가지 일을 한다.
 *   (a) lib/gemini/response-schema.ts 에서 Gemini 의 responseJsonSchema 로 컴파일된다
 *   (b) 모델 응답을 검증한다
 * 둘이 어긋날 수 없으므로 "요청한 형태"와 "받아들이는 형태"가 항상 일치한다.
 *
 * Gemini 구조화 출력 서브셋 제약을 지킨다 (실측 기반, 2026-09-12):
 *   - $ref / $defs 금지 → z.toJSONSchema({ reused: 'inline' }) 로 인라인 전개
 *   - 재귀 금지, enum 은 z.enum 으로
 *   - anyOf 자체는 허용된다 (.nullable() 로 생기는 형태는 통과했다)
 *   - 스키마 복잡도에 문서화되지 않은 상한이 있어, 중첩이 깊어지면
 *     400 INVALID_ARGUMENT 로 거부된다. 그래서 모델에게 요구하는 형태는
 *     의도적으로 평탄하다: 금액·시각을 중첩 객체가 아니라 평탄한 필드로 받고,
 *     추정 객체(MoneyEstimate·TimeEstimate) 조립은 lib/gemini/normalize.ts 가 한다.
 *     이 분리는 R1 도 강화한다 — 모델이 confidence 를 제출할 통로가 아예 없다.
 *   - 그럼에도 거부되면 lib/gemini/generate-plan.ts 가 스키마 없이 재시도한다.
 *
 * .describe() 에 적은 한국어가 JSON Schema 의 description 으로 전달되어
 * 필드별 지시 역할을 한다. 산문 프롬프트로 구조를 재설명하는 것보다 훨씬 안정적이다.
 */

export const ActivityItemSchema = z.object({
  id: z.string().min(1).max(40).describe('회차 내 고유 id. 예: d1-a1'),
  order: z.int().min(1).describe('그날 안에서의 순서. 1부터.'),
  kind: z
    .enum(['sight', 'meal', 'move', 'rest', 'activity', 'stay'])
    .describe('일정 종류'),
  title: z.string().min(1).max(60).describe('장소 또는 활동 이름'),
  areaName: z
    .string()
    .min(1)
    .max(40)
    .describe('지역명 텍스트만. 좌표·주소·지도 링크를 절대 넣지 말 것.'),
  description: z.string().min(1).max(300).describe('무엇을 하는지 2~3문장'),

  // --- 시간: 평탄한 필드로 받는다 ---
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .describe('일정상 계획 시각 HH:MM. 영업시간 보장이 아니다.'),
  durationMinutes: z.int().min(0).max(1440).describe('예상 소요 시간(분)'),

  // --- 비용: 금액과 근거만 받는다. 범위·신뢰도는 서버가 만든다 (R1) ---
  costAmount: z
    .int()
    .min(0)
    .nullable()
    .describe('예상 비용(원). 비용이 없거나 모르면 null. 지어내지 말 것.'),
  costBasis: z
    .string()
    .max(120)
    .describe('금액 산정 근거. 예: "2인 기준 일반 시세 추정". 비용이 null 이면 빈 문자열.'),

  tips: z.array(z.string().max(120)).max(3).describe('실용적인 팁 0~3개'),
  respectsAvoid: z
    .array(z.string().max(40))
    .max(5)
    .describe("사용자의 '피하고 싶은 것' 중 이 항목이 지키는 조건"),
  indoor: z.boolean().describe('실내 여부. 우천 시 대체 판단에 쓰인다.'),
});

export const DayPlanSchema = z.object({
  dayIndex: z.int().min(1).max(7).describe('1부터 시작하는 일차'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('YYYY-MM-DD'),
  theme: z.string().min(1).max(40).describe('그날의 한 줄 테마'),
  summary: z.string().min(1).max(200).describe('그날 흐름 요약'),
  pace: z.enum(['relaxed', 'balanced', 'packed']).describe('일정 밀도'),
  items: z.array(ActivityItemSchema).min(3).max(10).describe('그날의 일정 항목'),
  // daySubtotal 은 받지 않는다. 서버가 items 의 costAmount 로부터 재계산한다 (R8).
});

export const BudgetLineSchema = z.object({
  category: z
    .enum(['transport', 'stay', 'food', 'activity', 'shopping', 'etc'])
    .describe('예산 항목 분류'),
  label: z.string().min(1).max(40).describe('항목 이름'),
  // 금액만 받는다. 1인당·비중·범위·신뢰도는 전부 서버가 계산한다 (R8).
  amount: z.int().min(0).describe('이 항목의 전체 예상 금액(원)'),
  basis: z.string().max(120).describe('금액 산정 근거'),
  assumptions: z
    .array(z.string().max(120))
    .max(4)
    .describe('이 금액을 어떻게 잡았는지의 가정'),
});

export const BudgetTableSchema = z.object({
  lines: z.array(BudgetLineSchema).min(3).max(6).describe('예산 항목들'),
  excluded: z
    .array(z.string().max(60))
    .max(5)
    .describe('미포함 항목. 예: "항공권 미포함"'),
  // total / perPerson / vsUserBudget 은 받지 않는다.
  // 모델 산술을 신뢰하지 않고 서버가 lines 로부터 전부 재계산한다 (R8).
});

export const ChecklistItemSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(40).describe('준비물 이름'),
  category: z
    .enum(['document', 'clothing', 'gear', 'health', 'etc'])
    .describe('분류'),
  priority: z.enum(['must', 'recommended', 'optional']).describe('중요도'),
  reason: z.string().min(1).max(120).describe('왜 필요한지'),
});

export const PackingChecklistSchema = z.object({
  items: z.array(ChecklistItemSchema).min(6).max(18).describe('준비물 목록'),
  seasonNote: z.string().min(1).max(200).describe('그 시기 날씨·복장 관련 안내'),
});

export const RainyAlternativeSchema = z.object({
  id: z.string().min(1).max(40),
  dayIndex: z.int().min(1).max(7).describe('몇 일차의 대안인지'),
  replacesActivityId: z
    .string()
    .max(40)
    .nullable()
    .describe('대체 대상 일정의 id. 특정할 수 없으면 null.'),
  title: z.string().min(1).max(60).describe('대안 장소·활동 이름'),
  areaName: z.string().min(1).max(40).describe('지역명 텍스트만. 좌표 금지.'),
  description: z.string().min(1).max(200).describe('어떤 점이 대안이 되는지'),
  costAmount: z.int().min(0).nullable().describe('예상 비용(원). 모르면 null.'),
  costBasis: z.string().max(120).describe('금액 근거. 비용이 null 이면 빈 문자열.'),
});

export const RainyDayPlanSchema = z.object({
  alternatives: z
    .array(RainyAlternativeSchema)
    .min(2)
    .max(8)
    .describe('우천 시 대체 일정'),
  generalAdvice: z
    .array(z.string().max(150))
    .min(1)
    .max(4)
    .describe('비 올 때의 일반 조언'),
});

export const DisclaimerSchema = z.object({
  id: z.string().min(1).max(40),
  scope: z.enum(['budget', 'hours', 'availability', 'general']),
  severity: z.enum(['info', 'warning']),
  message: z.string().min(1).max(200),
});

export const PlanSummarySchema = z.object({
  title: z.string().min(1).max(50).describe('여행 제목'),
  destination: z.string().min(1).max(40),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.int().min(1).max(7),
  nights: z.int().min(0).max(6),
  partySummary: z.string().min(1).max(40).describe('예: "성인 2명, 아동 1명"'),
  styleTags: z.array(z.string().max(20)).max(5).describe('스타일 라벨'),
  headline: z.string().min(1).max(100).describe('이 여행을 한 문장으로'),
  highlights: z.array(z.string().max(60)).min(3).max(5).describe('핵심 포인트'),
  // totalBudget / perPersonBudget 은 받지 않는다. 서버가 예산 항목에서 계산한다 (R8).
});

export const GenerationMetaSchema = z.object({
  model: z.string().max(60),
  generatedAt: z.string().max(40),
  degraded: z.boolean(),
  degradedReasons: z.array(z.string().max(150)).max(5),
});

/**
 * 모델에게 요청하는 형태.
 * disclaimers 와 generation 은 서버가 주입하므로 모델에게 요구하지 않는다 —
 * 모델이 면책 문구를 스스로 쓰게 두면 R1 을 지킨다고 보장할 수 없다.
 */
export const ItineraryDraftSchema = z.object({
  summary: PlanSummarySchema,
  days: z.array(DayPlanSchema).min(1).max(7),
  budget: BudgetTableSchema,
  checklist: PackingChecklistSchema,
  rainyDay: RainyDayPlanSchema,
});

export type ItineraryDraft = z.infer<typeof ItineraryDraftSchema>;

/**
 * 복구 전용 관대 스키마.
 *
 * 위 스키마의 최소 개수 제약(일정 3개, 예산 3행, 준비물 6개, 우천 2건)은
 * 모델에게 "이만큼은 채워라"라고 요구하기 위한 것이지, 이미 받은 응답을
 * 살릴지 말지를 가르는 기준이 아니다. 깨진 원소를 골라낸 뒤 남은 개수가
 * 원래 최소치에 못 미친다고 전부 버리면, 복구 사다리가 아무것도 복구하지
 * 못하고 정상 응답만 통과시키는 죽은 코드가 된다 (실제로 그랬다).
 *
 * 그래서 복구 시점에는 "블록이 비어 있지 않은가"만 본다.
 * 부족한 부분은 generation.degraded 와 degradedReasons 로 사용자에게 알린다.
 */
export const ItineraryDraftRepairSchema = z.object({
  summary: PlanSummarySchema.extend({
    highlights: z.array(z.string().max(60)).min(1).max(5),
  }),
  days: z
    .array(
      DayPlanSchema.extend({
        items: z.array(ActivityItemSchema).min(1).max(10),
      }),
    )
    .min(1)
    .max(7),
  budget: BudgetTableSchema.extend({
    lines: z.array(BudgetLineSchema).min(1).max(6),
  }),
  checklist: PackingChecklistSchema.extend({
    items: z.array(ChecklistItemSchema).min(1).max(18),
  }),
  rainyDay: RainyDayPlanSchema.extend({
    alternatives: z.array(RainyAlternativeSchema).min(1).max(8),
    generalAdvice: z.array(z.string().max(150)).min(1).max(4),
  }),
});

/** 서버 주입까지 끝난 최종 형태. 클라이언트가 받는 것. */
export const ItineraryPlanSchema = ItineraryDraftSchema.extend({
  schemaVersion: z.literal(1),
  disclaimers: z.array(DisclaimerSchema).min(1),
  generation: GenerationMetaSchema,
});

export type ItineraryPlanParsed = z.infer<typeof ItineraryPlanSchema>;
