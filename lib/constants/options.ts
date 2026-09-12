/**
 * 입력 선택지의 단일 진실원천.
 *
 * R4: 모바일 390px 와 데스크톱의 선택지가 완전히 동일해야 한다.
 *     양쪽 화면이 이 파일 하나만 참조하므로 구조적으로 어긋날 수 없다.
 * R3: 서버 검증 스키마(z.enum)도 이 값들로 생성된다.
 *     즉 클라이언트에 없는 값은 서버에서도 거부된다.
 */

export interface OptionDef<T extends string> {
  value: T;
  label: string;
  /** 프롬프트에 전달할 한국어 설명 */
  hint: string;
}

/* --- 여행 스타일 --- */
export const TRAVEL_STYLES = [
  { value: 'healing', label: '힐링·휴식', hint: '여유로운 일정과 휴식 위주' },
  { value: 'nature', label: '자연·풍경', hint: '자연 경관과 산책 위주' },
  { value: 'food', label: '미식', hint: '지역 음식과 맛집 중심' },
  { value: 'culture', label: '역사·문화', hint: '박물관, 유적, 전통 공간' },
  { value: 'photo', label: '사진·뷰맛집', hint: '사진 찍기 좋은 장소 중심' },
  { value: 'activity', label: '액티비티', hint: '체험과 레저 활동 포함' },
  { value: 'shopping', label: '쇼핑', hint: '상점가와 기념품 위주' },
  { value: 'city', label: '도시 산책', hint: '도심 골목과 카페 중심' },
  { value: 'family', label: '가족 여행', hint: '전 연령이 함께 즐길 수 있는 구성' },
] as const satisfies readonly OptionDef<string>[];

export type TravelStyle = (typeof TRAVEL_STYLES)[number]['value'];

/* --- 음식 취향 --- */
export const FOOD_LIKES = [
  { value: 'local', label: '현지식', hint: '지역 향토 음식' },
  { value: 'seafood', label: '해산물', hint: '생선, 조개, 회 등' },
  { value: 'meat', label: '고기', hint: '구이, 정육 요리' },
  { value: 'vegetarian', label: '채식 위주', hint: '육류를 줄인 구성' },
  { value: 'cafe', label: '카페·디저트', hint: '커피와 디저트 중심' },
  { value: 'street', label: '길거리 음식', hint: '시장, 노점 음식' },
  { value: 'fine', label: '분위기 좋은 곳', hint: '정찬, 뷰가 좋은 식당' },
  { value: 'noodle', label: '면요리', hint: '국수, 면 종류' },
] as const satisfies readonly OptionDef<string>[];

export type FoodLike = (typeof FOOD_LIKES)[number]['value'];

export const SPICE_LEVELS = [
  { value: 'none', label: '안 매움', hint: '매운 음식 제외' },
  { value: 'mild', label: '약간', hint: '순한 맛 선호' },
  { value: 'medium', label: '보통', hint: '일반적인 매운맛 가능' },
  { value: 'hot', label: '매운 것 좋아함', hint: '매운 음식 환영' },
] as const satisfies readonly OptionDef<string>[];

export type SpiceLevel = (typeof SPICE_LEVELS)[number]['value'];

/* --- 피하고 싶은 것 --- */
export const AVOID_OPTIONS = [
  { value: 'long_walking', label: '많이 걷기', hint: '도보 이동 거리를 줄일 것' },
  { value: 'crowded_area', label: '사람 많은 곳', hint: '혼잡한 명소를 피할 것' },
  { value: 'early_start', label: '이른 아침 일정', hint: '오전 늦게 시작할 것' },
  { value: 'late_night', label: '늦은 밤 일정', hint: '저녁 일찍 마무리할 것' },
  { value: 'long_transfer', label: '긴 이동', hint: '지역 간 장거리 이동을 줄일 것' },
  { value: 'water_activity', label: '물놀이·수상활동', hint: '수상 활동 제외' },
  { value: 'height', label: '높은 곳', hint: '전망대, 케이블카 등 제외' },
  { value: 'driving', label: '직접 운전', hint: '렌터카 대신 대중교통·택시 전제' },
] as const satisfies readonly OptionDef<string>[];

export type AvoidOption = (typeof AVOID_OPTIONS)[number]['value'];

/* --- 예산 기준 --- */
export const BUDGET_SCOPES = [
  { value: 'total', label: '전체 총액', hint: '입력 금액이 일행 전체 예산' },
  { value: 'per_person', label: '1인당', hint: '입력 금액이 1인 기준 예산' },
] as const satisfies readonly OptionDef<string>[];

export type BudgetScope = (typeof BUDGET_SCOPES)[number]['value'];

/* --- z.enum() 에 넘길 값 튜플 --- */
const values = <T extends readonly OptionDef<string>[]>(defs: T) =>
  defs.map((d) => d.value) as unknown as {
    [K in keyof T]: T[K] extends OptionDef<infer V> ? V : never;
  };

export const TRAVEL_STYLE_VALUES = values(TRAVEL_STYLES);
export const FOOD_LIKE_VALUES = values(FOOD_LIKES);
export const SPICE_LEVEL_VALUES = values(SPICE_LEVELS);
export const AVOID_VALUES = values(AVOID_OPTIONS);
export const BUDGET_SCOPE_VALUES = values(BUDGET_SCOPES);

/** 프롬프트용 한국어 라벨 조회 */
export function labelOf(
  defs: readonly OptionDef<string>[],
  value: string,
): string {
  return defs.find((d) => d.value === value)?.label ?? value;
}

export function hintOf(
  defs: readonly OptionDef<string>[],
  value: string,
): string {
  return defs.find((d) => d.value === value)?.hint ?? '';
}

/** 입력 제한 — 클라이언트와 서버가 같은 상수를 쓴다 (R3) */
export const LIMITS = {
  destinationMin: 1,
  destinationMax: 40,
  tripDaysMin: 1,
  tripDaysMax: 7,
  adultsMin: 1,
  adultsMax: 20,
  childrenMax: 20,
  infantsMax: 10,
  partyTotalMax: 20,
  budgetMin: 0,
  budgetMax: 100_000_000,
  stylesMax: 5,
  foodLikesMax: 5,
  avoidMax: 5,
  avoidIngredientsMax: 100,
  notesMax: 300,
  bodyBytesMax: 8 * 1024,
} as const;
