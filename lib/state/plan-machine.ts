'use client';

import { useCallback, useReducer } from 'react';
import type { ItineraryPlan } from '@/types/itinerary';
import type { ApiErrorCode } from '@/lib/errors';
import type { PlanRequestInput } from '@/lib/validation/plan-request';

/**
 * 화면 상태 기계: 입력 → 처리 중 → 결과 → 오류.
 *
 * 하나의 reducer 가 전이를 독점하므로 중간 상태가 깜빡이거나
 * 두 화면이 동시에 보이는 일이 구조적으로 생기지 않는다.
 */
export type Phase = 'input' | 'loading' | 'result' | 'error';

export interface PlanErrorState {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
  fields: Record<string, string> | null;
}

export interface PlanState {
  phase: Phase;
  /** 마지막으로 제출한 조건. 오류·수정 시 복원에 쓴다 (S4) */
  lastRequest: PlanRequestInput | null;
  plan: ItineraryPlan | null;
  error: PlanErrorState | null;
  /**
   * 처리 중 오버레이 "뒤"에 무엇을 남겨 둘지.
   *
   * 오버레이는 화면을 덮을 뿐 아래 화면을 언마운트하지 않는다
   * (design/screen-states.md §3: "입력 폼은 DOM에 남아 있고 입력값도 유지된다").
   * 첫 생성이면 폼이, [다시 만들기]로 온 것이면 직전 결과가 뒤에 남는다.
   */
  returnTo: 'input' | 'result';
}

export type Action =
  | { type: 'submit'; request: PlanRequestInput }
  | { type: 'succeed'; plan: ItineraryPlan }
  | { type: 'fail'; error: PlanErrorState }
  | { type: 'editConditions' }
  | { type: 'retry' }
  | { type: 'cancel' };

/** 테스트가 직접 겨냥할 수 있도록 export 한다. reducer 는 순수 함수라 DOM 이 필요 없다. */
export const initialState: PlanState = {
  phase: 'input',
  lastRequest: null,
  plan: null,
  error: null,
  returnTo: 'input',
};

export function reducer(state: PlanState, action: Action): PlanState {
  switch (action.type) {
    case 'submit':
      // 제출은 언제나 폼에서 출발한다.
      return {
        ...state,
        phase: 'loading',
        lastRequest: action.request,
        error: null,
        returnTo: 'input',
      };
    case 'succeed':
      return { ...state, phase: 'result', plan: action.plan, error: null };
    case 'fail':
      return { ...state, phase: 'error', error: action.error };
    case 'editConditions':
      // 입력값은 유지한다. 사용자가 처음부터 다시 적게 만들지 않는다 (S4).
      return { ...state, phase: 'input', error: null };
    case 'retry':
      // 결과 화면의 [다시 만들기]면 결과를, 오류 화면의 [다시 시도]면 폼을 뒤에 남긴다.
      return state.lastRequest
        ? {
            ...state,
            phase: 'loading',
            error: null,
            returnTo: state.phase === 'result' ? 'result' : 'input',
          }
        : { ...state, phase: 'input', error: null, returnTo: 'input' };
    case 'cancel':
      return { ...state, phase: 'input', error: null };
    default:
      return state;
  }
}

export function usePlanMachine() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const submit = useCallback(
    (request: PlanRequestInput) => dispatch({ type: 'submit', request }),
    [],
  );
  const succeed = useCallback(
    (plan: ItineraryPlan) => dispatch({ type: 'succeed', plan }),
    [],
  );
  const fail = useCallback(
    (error: PlanErrorState) => dispatch({ type: 'fail', error }),
    [],
  );
  const editConditions = useCallback(() => dispatch({ type: 'editConditions' }), []);
  const retry = useCallback(() => dispatch({ type: 'retry' }), []);
  const cancel = useCallback(() => dispatch({ type: 'cancel' }), []);

  return { state, submit, succeed, fail, editConditions, retry, cancel };
}
