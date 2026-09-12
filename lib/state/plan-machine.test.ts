import { describe, expect, it } from 'vitest';
import { initialState, reducer } from '@/lib/state/plan-machine';
import type { PlanErrorState, PlanState } from '@/lib/state/plan-machine';
import type { ItineraryPlan } from '@/types/itinerary';
import type { PlanRequestInput } from '@/lib/validation/plan-request';

const request = {
  destination: '제주도',
  startDate: '2026-10-03',
  endDate: '2026-10-05',
  partySize: { adults: 2, children: 1, infants: 0 },
  budget: { amount: 900_000, currency: 'KRW', scope: 'total' },
  styles: ['healing'],
} as unknown as PlanRequestInput;

const plan = { schemaVersion: 1 } as unknown as ItineraryPlan;

const error: PlanErrorState = {
  code: 'MODEL_TIMEOUT',
  message: '일정 생성이 지연되고 있습니다.',
  retryable: true,
  fields: null,
};

describe('reducer — 4상태 전이', () => {
  it('초기 상태는 입력 화면이고 아무것도 들고 있지 않다', () => {
    expect(initialState).toEqual({
      phase: 'input',
      lastRequest: null,
      plan: null,
      error: null,
    });
  });

  it('submit: 처리 중으로 가면서 요청을 보관한다', () => {
    const s = reducer(initialState, { type: 'submit', request });
    expect(s.phase).toBe('loading');
    expect(s.lastRequest).toBe(request);
  });

  it('submit: 이전 오류를 지운다 (재제출인데 옛 오류가 남으면 안 된다)', () => {
    const errored: PlanState = { ...initialState, phase: 'error', error };
    expect(reducer(errored, { type: 'submit', request }).error).toBeNull();
  });

  it('succeed: 결과 화면으로 가고 일정을 담는다', () => {
    const loading = reducer(initialState, { type: 'submit', request });
    const s = reducer(loading, { type: 'succeed', plan });
    expect(s.phase).toBe('result');
    expect(s.plan).toBe(plan);
    expect(s.error).toBeNull();
  });

  it('fail: 오류 화면으로 가되 요청은 그대로 들고 있다 (S4)', () => {
    const loading = reducer(initialState, { type: 'submit', request });
    const s = reducer(loading, { type: 'fail', error });
    expect(s.phase).toBe('error');
    expect(s.error).toBe(error);
    expect(s.lastRequest).toBe(request);
  });
});

describe('reducer — 입력값 보존 (S4)', () => {
  it('editConditions: 입력 화면으로 돌아가도 lastRequest 를 버리지 않는다', () => {
    const errored = reducer(
      reducer(initialState, { type: 'submit', request }),
      { type: 'fail', error },
    );
    const s = reducer(errored, { type: 'editConditions' });

    expect(s.phase).toBe('input');
    expect(s.lastRequest).toBe(request);
    expect(s.error).toBeNull();
  });

  it('cancel: 입력 화면으로 돌아가고 오류를 지운다', () => {
    const loading = reducer(initialState, { type: 'submit', request });
    const s = reducer(loading, { type: 'cancel' });

    expect(s.phase).toBe('input');
    expect(s.error).toBeNull();
    expect(s.lastRequest).toBe(request);
  });

  it('retry: 보관한 요청이 있으면 곧바로 처리 중으로 간다', () => {
    const errored = reducer(
      reducer(initialState, { type: 'submit', request }),
      { type: 'fail', error },
    );
    const s = reducer(errored, { type: 'retry' });

    expect(s.phase).toBe('loading');
    expect(s.error).toBeNull();
  });

  it('retry: 보관한 요청이 없으면 입력 화면으로 간다 (빈 요청을 보내지 않는다)', () => {
    const errored: PlanState = { ...initialState, phase: 'error', error };
    const s = reducer(errored, { type: 'retry' });

    expect(s.phase).toBe('input');
    expect(s.error).toBeNull();
  });
});

describe('reducer — 불변성', () => {
  it('입력 상태를 변형하지 않는다', () => {
    const snapshot = { ...initialState };
    reducer(initialState, { type: 'submit', request });
    expect(initialState).toEqual(snapshot);
  });

  it('알 수 없는 액션은 같은 상태를 그대로 돌려준다', () => {
    const s = reducer(initialState, { type: 'nope' } as never);
    expect(s).toBe(initialState);
  });
});
