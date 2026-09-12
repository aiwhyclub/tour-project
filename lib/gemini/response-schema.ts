import { z } from 'zod';
import { ItineraryDraftSchema } from '@/lib/validation/itinerary-schema';

/**
 * Gemini 에 넘길 JSON Schema.
 *
 * reused: 'inline' 이 핵심이다. Gemini 의 스키마 서브셋은 $ref 에 강한 제약이 있어
 * ("$ref 가 설정된 하위 스키마에는 $ 로 시작하지 않는 다른 속성을 둘 수 없다"),
 * 같은 서브스키마(MoneyEstimate 등)를 여러 번 재사용하는 우리 구조에서는
 * 기본 동작인 $defs + $ref 로 뽑으면 거부되거나 조용히 무시될 수 있다.
 * 인라인 전개하면 스키마가 커지는 대신 그 위험이 사라진다.
 */
export const ITINERARY_JSON_SCHEMA = z.toJSONSchema(ItineraryDraftSchema, {
  target: 'draft-2020-12',
  io: 'output',
  reused: 'inline',
});

/** 스키마가 Gemini 서브셋 제약을 지키는지 확인한다. 빌드 전 스모크 체크용. */
export function auditSchema(): {
  bytes: number;
  hasRef: boolean;
  hasDefs: boolean;
  maxDepth: number;
  ok: boolean;
  problems: string[];
} {
  const text = JSON.stringify(ITINERARY_JSON_SCHEMA);
  const hasRef = text.includes('"$ref"');
  const hasDefs = text.includes('"$defs"');

  const depthOf = (node: unknown, d = 0): number => {
    if (node === null || typeof node !== 'object') return d;
    const children = Object.values(node as Record<string, unknown>);
    if (children.length === 0) return d;
    return Math.max(...children.map((c) => depthOf(c, d + 1)));
  };
  const maxDepth = depthOf(ITINERARY_JSON_SCHEMA);

  const problems: string[] = [];
  if (hasRef) problems.push('$ref 가 남아 있습니다. reused:"inline" 설정을 확인하세요.');
  if (hasDefs) problems.push('$defs 가 남아 있습니다.');
  if (text.length > 120_000) problems.push('스키마가 너무 큽니다 (>120KB). 거부될 수 있습니다.');

  return { bytes: text.length, hasRef, hasDefs, maxDepth, ok: problems.length === 0, problems };
}
