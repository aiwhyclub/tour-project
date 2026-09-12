import '@/lib/validation/zod-locale';
import { z } from 'zod';
import {
  AVOID_VALUES,
  BUDGET_SCOPE_VALUES,
  FOOD_LIKE_VALUES,
  LIMITS,
  SPICE_LEVEL_VALUES,
  TRAVEL_STYLE_VALUES,
} from '@/lib/constants/options';

/**
 * 요청 검증 스키마 — 클라이언트와 서버가 동일하게 사용한다.
 *
 * R3: 클라이언트 검증은 UX 보조일 뿐이다. 서버는 원본 body 를 절대 쓰지 않고
 *     이 스키마의 파싱 결과만 사용한다. 즉 클라이언트를 우회해도 통과할 수 없다.
 */

/** 제어문자와 꺾쇠를 제거하고 공백을 정리한다. */
const sanitize = (s: string) =>
  s
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** 자유 입력에 URL 이 들어오면 외부 지시로 오인될 수 있어 거부한다. */
const looksLikeUrl = (s: string) => /(https?:\/\/|www\.|\.[a-z]{2,}\/)/i.test(s);

const isoDate = z
  .string('날짜를 선택해 주세요.')
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다.')
  .refine((s) => !Number.isNaN(Date.parse(s + 'T00:00:00Z')), {
    message: '존재하지 않는 날짜입니다.',
  });

export const PartySizeSchema = z.object(
  {
    adults: z.int('성인 인원을 입력해 주세요.').min(LIMITS.adultsMin, '성인은 1명 이상이어야 합니다.').max(LIMITS.adultsMax),
    children: z.int('아동 인원을 입력해 주세요.').min(0).max(LIMITS.childrenMax),
    infants: z.int('유아 인원을 입력해 주세요.').min(0).max(LIMITS.infantsMax),
  },
  { error: '인원을 입력해 주세요.' },
);

export const BudgetSchema = z.object(
  {
    amount: z
      .int('예산 금액을 숫자로 입력해 주세요.')
      .min(LIMITS.budgetMin, '예산은 0원 이상이어야 합니다.')
      .max(LIMITS.budgetMax, '예산이 입력 가능한 범위를 넘었습니다.'),
    currency: z.literal('KRW'),
    scope: z.enum(BUDGET_SCOPE_VALUES, '예산 기준을 선택해 주세요.'),
  },
  { error: '예산을 입력해 주세요.' },
);

export const FoodPreferenceSchema = z.object({
  likes: z
    .array(z.enum(FOOD_LIKE_VALUES, '선택할 수 없는 음식 취향입니다.'), {
      error: '음식 취향 형식이 올바르지 않습니다.',
    })
    .max(LIMITS.foodLikesMax)
    .default([]),
  avoidIngredients: z
    .string()
    .max(LIMITS.avoidIngredientsMax)
    .transform(sanitize)
    .default(''),
  spiceLevel: z.enum(SPICE_LEVEL_VALUES, '맵기 선택이 올바르지 않습니다.').default('medium'),
});

export const PlanRequestSchema = z
  .object({
    destination: z
      .string('여행지를 입력해 주세요.')
      .transform(sanitize)
      .pipe(
        z
          .string()
          .min(LIMITS.destinationMin, '여행지를 입력해 주세요.')
          .max(
            LIMITS.destinationMax,
            '여행지는 ' + LIMITS.destinationMax + '자 이내로 입력해 주세요.',
          ),
      )
      .refine((s) => !looksLikeUrl(s), {
        message: '여행지에는 주소(URL)를 넣을 수 없습니다.',
      }),

    startDate: isoDate,
    endDate: isoDate,

    partySize: PartySizeSchema,
    budget: BudgetSchema,

    styles: z
      .array(z.enum(TRAVEL_STYLE_VALUES, '선택할 수 없는 여행 스타일입니다.'), {
        error: '여행 스타일을 하나 이상 선택해 주세요.',
      })
      .min(1, '여행 스타일을 하나 이상 선택해 주세요.')
      .max(
        LIMITS.stylesMax,
        '여행 스타일은 최대 ' + LIMITS.stylesMax + '개까지 선택할 수 있습니다.',
      ),

    foodPreference: FoodPreferenceSchema.default({
      likes: [],
      avoidIngredients: '',
      spiceLevel: 'medium',
    }),

    avoid: z
      .array(z.enum(AVOID_VALUES, '선택할 수 없는 항목입니다.'), {
        error: '피하고 싶은 항목 형식이 올바르지 않습니다.',
      })
      .max(LIMITS.avoidMax)
      .default([]),

    notes: z.string().max(LIMITS.notesMax).transform(sanitize).default(''),

    locale: z.literal('ko-KR').default('ko-KR'),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: '종료일은 시작일과 같거나 이후여야 합니다.',
    path: ['endDate'],
  })
  .refine(
    (v) => {
      const days = tripDays(v.startDate, v.endDate);
      return days >= LIMITS.tripDaysMin && days <= LIMITS.tripDaysMax;
    },
    {
      message:
        '여행 기간은 ' +
        LIMITS.tripDaysMin +
        '일 이상 ' +
        LIMITS.tripDaysMax +
        '일 이하로 선택해 주세요.',
      path: ['endDate'],
    },
  )
  .refine((v) => !isTooFarPast(v.startDate), {
    message: '시작일은 오늘 이후로 선택해 주세요.',
    path: ['startDate'],
  })
  .refine((v) => !isTooFarFuture(v.startDate), {
    message: '시작일은 2년 이내로 선택해 주세요.',
    path: ['startDate'],
  })
  .refine(
    (v) =>
      v.partySize.adults + v.partySize.children + v.partySize.infants <=
      LIMITS.partyTotalMax,
    {
      message: '총 인원은 ' + LIMITS.partyTotalMax + '명을 넘을 수 없습니다.',
      path: ['partySize'],
    },
  )
  .refine((v) => !looksLikeUrl(v.notes), {
    message: '추가 요청에는 주소(URL)를 넣을 수 없습니다.',
    path: ['notes'],
  });

export type PlanRequest = z.infer<typeof PlanRequestSchema>;
export type PlanRequestInput = z.input<typeof PlanRequestSchema>;

/* --- 날짜 헬퍼 (스키마와 UI가 공유) --- */

export function tripDays(startDate: string, endDate: string): number {
  const start = Date.parse(startDate + 'T00:00:00Z');
  const end = Date.parse(endDate + 'T00:00:00Z');
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function todayUtcMidnight(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function isTooFarPast(startDate: string): boolean {
  // 시간대 차이를 감안해 하루 여유를 둔다.
  return Date.parse(startDate + 'T00:00:00Z') < todayUtcMidnight() - 86_400_000;
}

function isTooFarFuture(startDate: string): boolean {
  return (
    Date.parse(startDate + 'T00:00:00Z') > todayUtcMidnight() + 730 * 86_400_000
  );
}

/** Zod 이슈를 필드별 한국어 메시지 맵으로 변환한다. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
