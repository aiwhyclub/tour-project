import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';

/**
 * Flat config.
 *
 * eslint-config-next@15 은 아직 레거시 .eslintrc 포맷만 제공해 FlatCompat 이 필요한데,
 * 이 환경의 pnpm 해석에서 @eslint/eslintrc 가 ESM 으로 로드되지 않았다.
 * 그래서 Next 플러그인을 직접 붙이고, 이 프로젝트의 구조적 가드레일을 명시적으로 얹는다.
 */
export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      '.playwright-mcp/**',
      'next-env.d.ts',
    ],
  },

  ...tseslint.configs.recommended,

  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  /**
   * 가드레일 1 — 3D 코드 격리.
   *
   * three 는 번들에서 380KB 규모다. 공용 컴포넌트에 `import type { Mesh } from 'three'`
   * 한 줄만 새어 들어가도 3D 청크가 초기 번들로 끌려오고, 몇 주간 아무도 눈치채지 못한다.
   * components/three/** 밖에서는 import 자체를 금지해 그 사고를 린트 단계에서 막는다.
   */
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['components/three/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['three', 'three/*', '@react-three/*'],
              message:
                '3D 라이브러리는 components/three/** 안에서만 import 하세요. 그 밖에서 가져오면 3D 청크가 초기 번들에 섞입니다.',
            },
          ],
        },
      ],
    },
  },

  /**
   * 가드레일 2 — 면책 렌더링 계약 (R1).
   *
   * 추정 객체의 금액·시각은 components/disclaimer/** 안에서만 읽는다.
   * 그 컴포넌트들이 언제나 ConfidenceBadge 를 함께 내보내므로,
   * "배지 붙이는 걸 기억한다"가 아니라 "배지 없이는 금액을 그릴 수 없다"가 된다.
   * 금액을 새로 표시해야 하면 Money / TimeChip 을 쓰세요.
   */
  {
    files: ['components/**/*.tsx'],
    ignores: ['components/disclaimer/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        // (1) 추정 객체에서 대표값을 꺼내 직접 그리는 경우.
        //     객체 이름으로 한정해 normalize 나 평탄한 초안 필드에는 걸리지 않게 한다.
        {
          selector:
            "MemberExpression[property.name='amount'][object.property.name=/^(daySubtotal|totalBudget|perPersonBudget|estimate|perPerson|total|cost)$/]",
          message:
            '금액은 components/disclaimer/Money.tsx 로 렌더하세요 (R1: 추정 배지가 항상 함께 나가야 합니다).',
        },
        {
          selector: "MemberExpression[property.name='start'][object.property.name='time']",
          message:
            '시각은 components/disclaimer/TimeChip.tsx 로 렌더하세요 (R1).',
        },
        // (2) 추정 객체에만 존재하는 필드명. 객체 이름을 열거할 필요 없이
        //     이 이름이 컴포넌트에서 읽히면 그 자체가 계약 위반이다.
        {
          selector:
            "MemberExpression[property.name=/^(rangeLow|rangeHigh|verifyHint|hoursNote)$/]",
          message:
            '추정 객체의 내부 필드입니다. Money / TimeChip 을 통해 렌더하세요 (R1).',
        },
      ],
    },
  },
);
