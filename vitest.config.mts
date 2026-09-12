import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * 대상은 전부 순수 함수다 — 정규화·검증·포맷·상태 기계·레이트리밋.
 * DOM 이 필요 없으므로 environment 는 node 이고 jsdom 계열 의존성을 두지 않는다.
 *
 * alias 가 이 설정의 존재 이유다. tsconfig 의 moduleResolution 이 "bundler" 라
 * 소스가 전부 '@/lib/...' 로 임포트하는데, node --test 는 tsconfig 경로 별칭을
 * 해석하지 못한다(subpath imports 는 '#' 접두사만 받는다). 테스트 러너에 맞추려고
 * 소스의 임포트를 상대 경로로 바꾸는 것은 본말전도다.
 *
 * globals 는 켜지 않는다. describe/it/expect 를 명시적으로 임포트하면
 * tsconfig 에 types 항목을 추가할 필요가 없다.
 *
 * 주의: vitest 4 는 통과한 테스트의 console.* 출력을 가로채 감춘다.
 * auditSchema() 리포트(E3-S01)처럼 터미널에 남아야 하는 증거물은
 * console.log 가 아니라 process.stdout.write 로 찍는다 — 그쪽은 가로채이지 않는다.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    // 설정 파일이 ESM 으로 로드되므로 __dirname 을 쓸 수 없다
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
});
