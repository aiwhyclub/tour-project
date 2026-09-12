'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AVOID_OPTIONS,
  BUDGET_SCOPES,
  FOOD_LIKES,
  LIMITS,
  SPICE_LEVELS,
  TRAVEL_STYLES,
  type SpiceLevel,
} from '@/lib/constants/options';
import {
  PlanRequestSchema,
  toFieldErrors,
  tripDays,
  type PlanRequestInput,
} from '@/lib/validation/plan-request';
import { isoAfterDays } from '@/lib/format/date';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/**
 * 여행 조건 입력 폼.
 *
 * R4: 모바일과 데스크톱이 같은 컴포넌트·같은 상수를 쓴다. 배치만 CSS 로 달라진다.
 *     선택지가 두 화면에서 어긋나는 일이 구조적으로 불가능하다.
 * R3: 여기서 하는 검증은 UX 보조일 뿐이며, 서버가 같은 스키마로 다시 검증한다.
 */
const inputClass =
  'w-full rounded-[var(--radius-field)] border border-control-border bg-surface px-4 py-3 ' +
  'text-body text-ink placeholder:text-ink-muted ' +
  'focus:border-ocean-600 focus:outline-none focus:ring-4 focus:ring-ocean-100 ' +
  'aria-[invalid=true]:border-danger-line aria-[invalid=true]:bg-danger-bg';

export interface PlanFormProps {
  initial: PlanRequestInput | null;
  serverFieldErrors: Record<string, string> | null;
  submitting: boolean;
  onSubmit: (request: PlanRequestInput) => void;
}

function defaultValues(): PlanRequestInput {
  return {
    destination: '',
    startDate: isoAfterDays(14),
    endDate: isoAfterDays(16),
    partySize: { adults: 2, children: 0, infants: 0 },
    budget: { amount: 800000, currency: 'KRW', scope: 'total' },
    styles: [],
    foodPreference: { likes: [], avoidIngredients: '', spiceLevel: 'medium' },
    avoid: [],
    notes: '',
    locale: 'ko-KR',
  };
}

export function PlanForm({
  initial,
  serverFieldErrors,
  submitting,
  onSubmit,
}: PlanFormProps) {
  const [values, setValues] = useState<PlanRequestInput>(initial ?? defaultValues());
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  // 하이드레이션 전에 제출되면 React 핸들러가 붙어 있지 않아
  // 폼이 네이티브 GET 으로 전송되고 입력이 통째로 날아간다.
  // 마운트 전까지 제출을 막아 그 경로를 없앤다.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const errors = useMemo(
    () => ({ ...(serverFieldErrors ?? {}), ...clientErrors }),
    [serverFieldErrors, clientErrors],
  );

  const days = tripDays(values.startDate ?? '', values.endDate ?? '');

  /**
   * 갱신은 항상 이전 값(prev)을 받아 계산한다.
   * 클로저의 values 를 읽어 쓰면 한 프레임 안에 여러 번 누를 때
   * 뒤의 갱신이 앞의 갱신을 덮어써서 선택이 유실된다.
   */
  const patch = (next: (prev: PlanRequestInput) => Partial<PlanRequestInput>) =>
    setValues((prev) => ({ ...prev, ...next(prev) }));

  const toggleIn = <T extends string>(list: readonly T[], value: T, max: number): T[] => {
    if (list.includes(value)) return list.filter((v) => v !== value);
    if (list.length >= max) return [...list];
    return [...list, value];
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = PlanRequestSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = toFieldErrors(result.error);
      setClientErrors(fieldErrors);
      // 첫 오류 필드로 포커스를 옮긴다 (S11: 키보드만으로 수정 가능해야 한다)
      const firstKey = Object.keys(fieldErrors)[0];
      if (firstKey) {
        const target = document.querySelector<HTMLElement>(
          '[data-field="' + firstKey.split('.')[0] + '"]',
        );
        target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        target?.querySelector<HTMLElement>('input, button, select, textarea')?.focus();
      }
      return;
    }

    setClientErrors({});
    onSubmit(values);
  };

  return (
    <Card as="section" className="p-6 sm:p-8 lg:p-10">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h2 className="text-h2 text-ink">여행 조건</h2>
          <p className="text-sm text-ink-soft">
            아래 조건을 채우면 일자별 계획을 만들어 드립니다. 별표(
            <span className="text-accent-700">*</span>)는 필수입니다.
          </p>
        </header>

        {/* --- 여행지 --- */}
        <div data-field="destination">
          <Field
            label="여행지"
            htmlFor="destination"
            required
            hint="도시나 지역 이름을 적어 주세요. 예: 제주도, 오사카, 강릉"
            error={errors.destination}
          >
            <input
              id="destination"
              name="destination"
              type="text"
              value={values.destination ?? ''}
              maxLength={LIMITS.destinationMax}
              aria-invalid={Boolean(errors.destination)}
              aria-describedby={errors.destination ? 'destination-error' : undefined}
              onChange={(e) => patch(() => ({ destination: e.target.value }))}
              placeholder="제주도"
              className={inputClass}
            />
          </Field>
        </div>

        {/* --- 일정 --- */}
        <div data-field="startDate">
          <Field
            label="일정"
            htmlFor="startDate"
            required
            hint={'최대 ' + LIMITS.tripDaysMax + '일까지 만들 수 있습니다.'}
            error={errors.startDate ?? errors.endDate}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                id="startDate"
                type="date"
                value={values.startDate ?? ''}
                aria-invalid={Boolean(errors.startDate)}
                aria-label="여행 시작일"
                onChange={(e) => patch(() => ({ startDate: e.target.value }))}
                className={inputClass}
              />
              <span aria-hidden="true" className="hidden text-ink-muted sm:block">
                ~
              </span>
              <input
                id="endDate"
                type="date"
                value={values.endDate ?? ''}
                aria-invalid={Boolean(errors.endDate)}
                aria-label="여행 종료일"
                onChange={(e) => patch(() => ({ endDate: e.target.value }))}
                className={inputClass}
              />
            </div>
            {days > 0 && (
              <p className="mt-2 text-sm font-medium text-ocean-700">
                {Math.max(0, days - 1)}박 {days}일
              </p>
            )}
          </Field>
        </div>

        {/* --- 인원 --- */}
        <div data-field="partySize">
          <Field
            label="인원"
            htmlFor="adults"
            required
            hint="유아는 예산 계산에서 제외됩니다."
            error={errors.partySize ?? errors['partySize.adults']}
          >
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ['adults', '성인', LIMITS.adultsMin, LIMITS.adultsMax],
                  ['children', '아동', 0, LIMITS.childrenMax],
                  ['infants', '유아', 0, LIMITS.infantsMax],
                ] as const
              ).map(([key, label, min, max]) => (
                <label key={key} className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-ink-muted">{label}</span>
                  <input
                    id={key === 'adults' ? 'adults' : undefined}
                    type="number"
                    inputMode="numeric"
                    min={min}
                    max={max}
                    value={values.partySize?.[key] ?? 0}
                    aria-label={label + ' 인원'}
                    onChange={(e) =>
                      patch((prev) => ({
                        partySize: {
                          ...(prev.partySize ?? { adults: 2, children: 0, infants: 0 }),
                          [key]: Number(e.target.value) || 0,
                        },
                      }))
                    }
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          </Field>
        </div>

        {/* --- 예산 --- */}
        <div data-field="budget">
          <Field
            label="예산"
            htmlFor="budgetAmount"
            required
            hint="대략적인 금액이면 충분합니다. 결과는 추정값으로 제공됩니다."
            error={errors.budget ?? errors['budget.amount']}
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  id="budgetAmount"
                  type="number"
                  inputMode="numeric"
                  min={LIMITS.budgetMin}
                  max={LIMITS.budgetMax}
                  step={10000}
                  value={values.budget?.amount ?? 0}
                  aria-label="예산 금액(원)"
                  onChange={(e) =>
                    patch((prev) => ({
                      budget: {
                        ...(prev.budget ?? { amount: 0, currency: 'KRW', scope: 'total' }),
                        amount: Number(e.target.value) || 0,
                      },
                    }))
                  }
                  className={inputClass + ' pr-10'}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                  원
                </span>
              </div>
              <div className="flex gap-2" role="radiogroup" aria-label="예산 기준">
                {BUDGET_SCOPES.map((scope) => (
                  <button
                    key={scope.value}
                    type="button"
                    role="radio"
                    aria-checked={values.budget?.scope === scope.value}
                    onClick={() =>
                      patch((prev) => ({
                        budget: {
                          ...(prev.budget ?? { amount: 0, currency: 'KRW', scope: 'total' }),
                          scope: scope.value,
                        },
                      }))
                    }
                    className={
                      'flex-1 rounded-[var(--radius-field)] border px-4 py-3 text-sm font-bold transition-colors sm:flex-none ' +
                      (values.budget?.scope === scope.value
                        ? 'border-ocean-700 bg-ocean-700 text-white'
                        : 'border-control-border bg-surface text-ink-soft hover:bg-ocean-50')
                    }
                  >
                    {scope.label}
                  </button>
                ))}
              </div>
            </div>
          </Field>
        </div>

        {/* --- 여행 스타일 --- */}
        <div data-field="styles">
          <Field
            label="여행 스타일"
            htmlFor="styles"
            required
            hint={
              (values.styles ?? []).length +
              '/' +
              LIMITS.stylesMax +
              ' 선택됨 · 최대 ' +
              LIMITS.stylesMax +
              '개까지 고를 수 있습니다.'
            }
            error={errors.styles ?? errors['styles.0']}
          >
            <div className="flex flex-wrap gap-2" role="group" aria-label="여행 스타일">
              {TRAVEL_STYLES.map((style) => (
                <Chip
                  key={style.value}
                  label={style.label}
                  hint={style.hint}
                  selected={(values.styles ?? []).includes(style.value)}
                  disabled={(values.styles ?? []).length >= LIMITS.stylesMax}
                  onToggle={() =>
                    patch((prev) => ({
                      styles: toggleIn(prev.styles ?? [], style.value, LIMITS.stylesMax),
                    }))
                  }
                />
              ))}
            </div>
          </Field>
        </div>

        {/* --- 음식 취향 --- */}
        <div data-field="foodPreference">
          <Field
            label="음식 취향"
            htmlFor="foodLikes"
            hint={
              (values.foodPreference?.likes ?? []).length +
              '/' +
              LIMITS.foodLikesMax +
              ' 선택됨 · 선택하지 않아도 됩니다.'
            }
            error={errors['foodPreference.avoidIngredients']}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2" role="group" aria-label="선호하는 음식">
                {FOOD_LIKES.map((food) => (
                  <Chip
                    key={food.value}
                    label={food.label}
                    hint={food.hint}
                    selected={(values.foodPreference?.likes ?? []).includes(food.value)}
                    disabled={
                      (values.foodPreference?.likes ?? []).length >= LIMITS.foodLikesMax
                    }
                    onToggle={() =>
                      patch((prev) => ({
                        foodPreference: {
                          ...(prev.foodPreference ?? {
                            likes: [],
                            avoidIngredients: '',
                            spiceLevel: 'medium',
                          }),
                          likes: toggleIn(
                            prev.foodPreference?.likes ?? [],
                            food.value,
                            LIMITS.foodLikesMax,
                          ),
                        },
                      }))
                    }
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="text-xs font-medium text-ink-muted">
                    못 먹는 재료 (쉼표로 구분)
                  </span>
                  <input
                    type="text"
                    value={values.foodPreference?.avoidIngredients ?? ''}
                    maxLength={LIMITS.avoidIngredientsMax}
                    placeholder="고수, 땅콩"
                    aria-label="못 먹는 재료"
                    onChange={(e) =>
                      patch((prev) => ({
                        foodPreference: {
                          ...(prev.foodPreference ?? {
                            likes: [],
                            avoidIngredients: '',
                            spiceLevel: 'medium',
                          }),
                          avoidIngredients: e.target.value,
                        },
                      }))
                    }
                    className={inputClass}
                  />
                </label>

                <label className="flex flex-col gap-1.5 sm:w-44">
                  <span className="text-xs font-medium text-ink-muted">맵기</span>
                  <select
                    value={values.foodPreference?.spiceLevel ?? 'medium'}
                    aria-label="맵기 선호"
                    onChange={(e) =>
                      patch((prev) => ({
                        foodPreference: {
                          ...(prev.foodPreference ?? {
                            likes: [],
                            avoidIngredients: '',
                            spiceLevel: 'medium',
                          }),
                          spiceLevel: e.target.value as SpiceLevel,
                        },
                      }))
                    }
                    className={inputClass}
                  >
                    {SPICE_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </Field>
        </div>

        {/* --- 피하고 싶은 것 --- */}
        <div data-field="avoid">
          <Field
            label="피하고 싶은 것"
            htmlFor="avoid"
            hint={
              (values.avoid ?? []).length +
              '/' +
              LIMITS.avoidMax +
              ' 선택됨 · 고른 항목은 일정에 반드시 반영됩니다.'
            }
            error={errors.avoid}
          >
            <div className="flex flex-wrap gap-2" role="group" aria-label="피하고 싶은 것">
              {AVOID_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  hint={option.hint}
                  selected={(values.avoid ?? []).includes(option.value)}
                  disabled={(values.avoid ?? []).length >= LIMITS.avoidMax}
                  onToggle={() =>
                    patch((prev) => ({
                      avoid: toggleIn(prev.avoid ?? [], option.value, LIMITS.avoidMax),
                    }))
                  }
                />
              ))}
            </div>
          </Field>
        </div>

        {/* --- 추가 요청 --- */}
        <div data-field="notes">
          <Field
            label="추가 요청"
            htmlFor="notes"
            hint={'자유롭게 적어 주세요. 최대 ' + LIMITS.notesMax + '자.'}
            error={errors.notes}
          >
            <textarea
              id="notes"
              rows={3}
              maxLength={LIMITS.notesMax}
              value={values.notes ?? ''}
              placeholder="부모님과 함께라 이동이 적었으면 합니다"
              onChange={(e) => patch(() => ({ notes: e.target.value }))}
              className={inputClass + ' resize-y'}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-6">
          <Button
            type="submit"
            disabled={submitting || !hydrated}
            className="w-full sm:w-auto sm:self-start"
          >
            {submitting ? '만드는 중...' : '여행 계획 만들기'}
          </Button>
          <p className="text-xs leading-relaxed text-ink-muted">
            결과의 금액과 시간은 모두 추정값입니다. 이 서비스는 예약·결제·실시간 가격 조회를
            제공하지 않습니다.
          </p>
        </div>
      </form>
    </Card>
  );
}
