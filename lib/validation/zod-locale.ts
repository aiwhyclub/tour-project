import { z } from 'zod';
import { ko } from 'zod/locales';

/**
 * Zod 기본 오류 메시지를 한국어로 전환한다.
 *
 * 명시적 메시지를 붙이지 않은 규칙(타입 불일치, enum 위반 등)도
 * 사용자에게 그대로 노출되므로, 영어 기본 문구가 새어 나가지 않도록
 * 스키마를 정의하기 전에 한 번 설정한다.
 *
 * plan-request.ts 가 이 모듈을 가장 먼저 import 하므로
 * 검증 경로에서는 항상 적용된 상태가 보장된다.
 */
z.config(ko());

export {};
