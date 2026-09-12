/**
 * 여행 일정 데이터 모델.
 *
 * 설계 원칙 (docs/00_PROMPT_OPTIMIZED.md R1):
 *   확인되지 않은 실시간 가격·운영시간을 "사실"로 표현할 수단을 타입에서 제거한다.
 *   금액과 시간은 원시 number/string 이 아니라 반드시 추정 객체로만 존재하며,
 *   Confidence 유니온에는 'confirmed' 멤버가 없다 — 즉 "확정"은 표현 불가능하다.
 *
 * 설계 원칙 (R5):
 *   좌표(위도·경도) 필드를 두지 않는다. 장소는 areaName 텍스트로만 표현한다.
 *   지도 연동은 제외 범위이며, 데이터 모델 단계에서 차단한다.
 */

/** 의도적으로 'confirmed' 멤버가 없다. 실시간 정확성은 제품 범위 밖이다. */
export type Confidence = 'estimate' | 'typical_range' | 'unverified';

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  estimate: '추정',
  typical_range: '일반 시세',
  unverified: '미확인',
};

/** 금액은 언제나 범위와 근거를 동반한다. 단일 확정 금액은 표현할 수 없다. */
export interface MoneyEstimate {
  amount: number;
  currency: 'KRW';
  rangeLow: number;
  rangeHigh: number;
  confidence: Confidence;
  /** 이 금액이 어디서 나왔는지. 예: "2인 기준 일반 시세 추정" */
  basis: string;
  /** 사용자가 직접 확인해야 한다는 안내. 예: "방문 전 공식 채널에서 확인하세요" */
  verifyHint: string;
}

/** 시간은 "계획된 시각"이지 "운영시간 보장"이 아니다. */
export interface TimeEstimate {
  /** "09:30" — 일정상 계획 시각 */
  start: string;
  durationMinutes: number;
  confidence: Confidence;
  /** 운영시간 변동 가능성 안내. 해당 없으면 null */
  hoursNote: string | null;
}

export type ActivityKind = 'sight' | 'meal' | 'move' | 'rest' | 'activity' | 'stay';

export const ACTIVITY_KIND_LABEL: Record<ActivityKind, string> = {
  sight: '관광',
  meal: '식사',
  move: '이동',
  rest: '휴식',
  activity: '체험',
  stay: '숙박',
};

export interface ActivityItem {
  id: string;
  order: number;
  kind: ActivityKind;
  title: string;
  /** 지역명 텍스트만. 좌표 없음 — 지도 연동은 제외 범위(R5) */
  areaName: string;
  description: string;
  time: TimeEstimate;
  cost: MoneyEstimate | null;
  tips: string[];
  /** 사용자의 '피하고 싶은 것' 중 이 항목이 지키는 조건 */
  respectsAvoid: string[];
  /** 실내 여부 — 우천 시 대체 대상 판별에 쓰인다 */
  indoor: boolean;
}

export type DayPace = 'relaxed' | 'balanced' | 'packed';

export const DAY_PACE_LABEL: Record<DayPace, string> = {
  relaxed: '여유',
  balanced: '보통',
  packed: '알참',
};

export interface DayPlan {
  /** 1부터 시작 */
  dayIndex: number;
  /** ISO YYYY-MM-DD */
  date: string;
  theme: string;
  summary: string;
  pace: DayPace;
  items: ActivityItem[];
  /** 서버에서 items 로부터 재계산된다 (R8) */
  daySubtotal: MoneyEstimate;
}

export type BudgetCategory =
  | 'transport'
  | 'stay'
  | 'food'
  | 'activity'
  | 'shopping'
  | 'etc';

export const BUDGET_CATEGORY_LABEL: Record<BudgetCategory, string> = {
  transport: '교통',
  stay: '숙박',
  food: '식비',
  activity: '체험·입장',
  shopping: '쇼핑',
  etc: '기타',
};

export interface BudgetLine {
  category: BudgetCategory;
  label: string;
  estimate: MoneyEstimate;
  perPerson: MoneyEstimate;
  /** 서버에서 재계산된다 (R8) */
  sharePercent: number;
  /** 행 클릭 시 펼쳐지는 산정 가정 */
  assumptions: string[];
}

export interface BudgetVsUser {
  userBudget: number;
  /** total.amount - userBudget */
  difference: number;
  status: 'under' | 'near' | 'over';
  comment: string;
}

export interface BudgetTable {
  lines: BudgetLine[];
  /** 서버에서 lines 로부터 재계산된다 (R8) */
  total: MoneyEstimate;
  /** 서버에서 재계산된다 (R8) */
  perPerson: MoneyEstimate;
  /** 예: "항공권 미포함", "여행자보험 미포함" */
  excluded: string[];
  vsUserBudget: BudgetVsUser;
}

export type ChecklistCategory = 'document' | 'clothing' | 'gear' | 'health' | 'etc';

export const CHECKLIST_CATEGORY_LABEL: Record<ChecklistCategory, string> = {
  document: '서류',
  clothing: '의류',
  gear: '장비',
  health: '건강',
  etc: '기타',
};

export type ChecklistPriority = 'must' | 'recommended' | 'optional';

export const CHECKLIST_PRIORITY_LABEL: Record<ChecklistPriority, string> = {
  must: '필수',
  recommended: '권장',
  optional: '선택',
};

export interface ChecklistItem {
  id: string;
  label: string;
  category: ChecklistCategory;
  priority: ChecklistPriority;
  reason: string;
}

export interface PackingChecklist {
  items: ChecklistItem[];
  seasonNote: string;
}

export interface RainyAlternative {
  id: string;
  dayIndex: number;
  /** 어떤 일정을 대체하는지. 특정 항목이 아니면 null */
  replacesActivityId: string | null;
  title: string;
  areaName: string;
  description: string;
  cost: MoneyEstimate | null;
}

export interface RainyDayPlan {
  alternatives: RainyAlternative[];
  generalAdvice: string[];
}

export type DisclaimerScope = 'budget' | 'hours' | 'availability' | 'general';

export interface Disclaimer {
  id: string;
  scope: DisclaimerScope;
  severity: 'info' | 'warning';
  message: string;
}

export interface PlanSummary {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  nights: number;
  /** 예: "성인 2명, 아동 1명" */
  partySummary: string;
  styleTags: string[];
  headline: string;
  /** 3–5개 */
  highlights: string[];
  totalBudget: MoneyEstimate;
  perPersonBudget: MoneyEstimate;
}

export interface GenerationMeta {
  model: string;
  generatedAt: string;
  /** 응답이 부분 복구를 거쳤는지 */
  degraded: boolean;
  /** degraded 일 때 사용자에게 보여줄 사유 */
  degradedReasons: string[];
}

export interface ItineraryPlan {
  schemaVersion: 1;
  summary: PlanSummary;
  days: DayPlan[];
  budget: BudgetTable;
  checklist: PackingChecklist;
  rainyDay: RainyDayPlan;
  /** 모델 출력을 버리고 서버가 강제 주입한다 (R1) */
  disclaimers: Disclaimer[];
  generation: GenerationMeta;
}
