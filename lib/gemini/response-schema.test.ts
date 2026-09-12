import { describe, expect, it } from 'vitest';
import { ITINERARY_JSON_SCHEMA, auditSchema } from '@/lib/gemini/response-schema';

/**
 * E3-S01 — 스키마 컴파일 스모크 점검.
 *
 * auditSchema() 는 만들어만 두고 호출하는 곳이 없었다. 여기가 그 호출 지점이다.
 *
 * maxDepth 단언이 이 파일의 핵심이다. Gemini 는 중첩이 깊은 스키마를
 * 400 INVALID_ARGUMENT 로 거부하는데 그 상한이 문서화되어 있지 않다(실측: days 가지가
 * 깊이 14 에서 실패, 형제 가지는 11~13 에서 통과). auditSchema 자체는 깊이로
 * 실패하지 않으므로, 현재 실측값을 상한으로 박아 두어 스키마에 한 겹이 더 생기면
 * 배포가 아니라 테스트가 먼저 깨지게 한다.
 */
const report = auditSchema();

describe('auditSchema', () => {
  it('리포트를 터미널에 남긴다', () => {
    // 완료 조건이 "출력에 리포트 한 줄이 보인다" 이므로 의도적으로 찍는다.
    // console.log 를 쓰지 않는다 — vitest 4 는 통과한 테스트의 console 출력을
    // 가로채 감춘다(silent 기본값 'passed-only'). stdout 직접 쓰기는 가로채이지 않는다.
    process.stdout.write('\n[auditSchema] ' + JSON.stringify(report) + '\n');
    expect(report).toBeTruthy();
  });

  it('$ref 가 남아 있지 않다 (reused:"inline" 이 동작했다)', () => {
    expect(report.hasRef).toBe(false);
  });

  it('$defs 가 남아 있지 않다', () => {
    expect(report.hasDefs).toBe(false);
  });

  it('120KB 미만이다', () => {
    expect(report.bytes).toBeLessThan(120_000);
  });

  it('문제 목록이 비어 있고 ok 다', () => {
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('중첩 깊이가 현재 실측 상한을 넘지 않는다', () => {
    expect(report.maxDepth).toBeLessThanOrEqual(11);
  });
});

describe('ITINERARY_JSON_SCHEMA', () => {
  it('모델에게 요구하는 최상위 블록이 5개다', () => {
    const props = (ITINERARY_JSON_SCHEMA as { properties?: Record<string, unknown> })
      .properties;
    expect(Object.keys(props ?? {}).sort()).toEqual([
      'budget',
      'checklist',
      'days',
      'rainyDay',
      'summary',
    ]);
  });

  it('disclaimers 와 generation 을 모델에게 요구하지 않는다 (서버 주입, R1)', () => {
    const text = JSON.stringify(ITINERARY_JSON_SCHEMA);
    expect(text).not.toContain('disclaimers');
    expect(text).not.toContain('generation');
  });

  it('confidence 를 모델이 제출할 통로가 없다 (R1)', () => {
    expect(JSON.stringify(ITINERARY_JSON_SCHEMA)).not.toContain('confidence');
  });
});
