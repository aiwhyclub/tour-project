# 여행 큐레이션

여행지·일정·인원·예산·취향을 넣으면 일자별 코스와 예상 예산표, 준비물 체크리스트,
우천 시 대안을 한 번에 만들어 주는 한국어 웹 도구입니다.

**예약을 대신해주지 않고, 결정을 대신해주지도 않습니다.** 결정하기 위한 재료를
정돈해서 드립니다.

---

## 요구사항

| 항목 | 버전 |
|---|---|
| Node.js | 22 (`engines` 는 >=20, 배포 대상은 22) |
| pnpm | 12 (`packageManager` 필드가 고정) |

## 빠른 시작

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

**API 키가 없어도 전체 화면이 목업 데이터로 동작합니다.** 폼 입력부터 결과 5블록,
오류 화면까지 그대로 볼 수 있습니다. 실제 모델을 붙이려면 `.env.local` 의
`GEMINI_API_KEY` 만 채우면 됩니다 — 다른 설정은 바꿀 필요가 없습니다.

### `PLAN_SOURCE` 전환 규칙

| 값 | 동작 |
|---|---|
| `auto` (기본) | 키가 있으면 Gemini, 없으면 목업 |
| `gemini` | 항상 Gemini. 키가 비어 있으면 서버가 기동 시점에 실패한다 |
| `mock` | 키가 있어도 목업. 데모·개발용 |

실연동 상태에서 한 요청만 목업으로 받고 싶으면 `/api/plan?source=mock` 을 씁니다.
세 경로 모두 같은 `normalizePlan()` 을 거치므로 **화면 구성이 완전히 같습니다.**

## 스크립트

| 명령 | 하는 일 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm build` / `pnpm start` | 프로덕션 빌드 · 기동 |
| `pnpm lint` | ESLint (프로젝트 가드레일 2종 포함) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest 단위 테스트 |
| `pnpm audit:schema` | Gemini 스키마 스모크 점검 리포트만 출력 |
| `pnpm analyze` | 번들 분석 (`.next/analyze/client.html`) |

## 하는 것 / 하지 않는 것

**합니다**: 일자별 코스 · 예상 예산표(항목별 근거 포함) · 준비물 체크리스트 ·
우천 시 대안 · 모든 금액과 시간에 확신도 배지.

**하지 않습니다**: 예약 · 결제 · 로그인 · 지도 연동 · 실시간 가격이나 운영시간 조회.
이 목록은 취향이 아니라 제품 범위이며, 타입 시스템과 ESLint 규칙으로 강제됩니다.
예를 들어 `Confidence` 유니온에는 `'confirmed'` 가 없어서 "확정 가격"을 표현하는 것
자체가 컴파일되지 않고, 좌표 필드가 없어서 지도 연동이 타입 수준에서 불가능합니다.

## 구조

| 경로 | 내용 |
|---|---|
| `app/` | 라우트. `page.tsx` 는 서버 컴포넌트이고 클라이언트 JS 는 `PlanExperience` 부터 |
| `components/three/**` | 3D. **이 밖에서 `three` 를 import 하면 lint 가 막습니다** (초기 번들 오염 방지) |
| `components/disclaimer/**` | 금액·시간을 렌더할 수 있는 유일한 곳. 배지가 항상 함께 나갑니다 |
| `lib/gemini/` | 프롬프트 · 스키마 · 실패 사다리 · 정규화 |
| `lib/validation/` | 요청·응답 스키마. 클라이언트와 서버가 같은 파일을 씁니다 |
| `scripts/build-font.py` | Pretendard 서브셋 재생성 (저작 시점 1회용) |

오류 화면이 두 층입니다. 계획 생성 플로우의 로딩·오류는 `lib/state/plan-machine.ts`
가 소유하고, `app/error.tsx` 와 `app/not-found.tsx` 는 그 바깥의 렌더 타임 크래시와
잘못된 주소를 잡습니다. 중복이 아니라 층이 다릅니다.

## 문서

| 문서 | 내용 |
|---|---|
| [docs/01_PRD.md](docs/01_PRD.md) | 제품 요구사항 · 성공 기준 S1~S18 |
| [docs/03_FRD.md](docs/03_FRD.md) | 기능 요구사항 F-01~F-47 |
| [docs/04_TRD.md](docs/04_TRD.md) | 아키텍처 · 확정 위험 7건 · 보안 SEC1~SEC15 |
| [docs/05_개발계획.md](docs/05_개발계획.md) | EPIC 3 · STORY 55 · EPIC 밖 3단계 |
| [docs/06_품질점검.md](docs/06_품질점검.md) | QA · 보안 검토(SEC1~15) · 성능 실측 · 수용한 편차 |
| [design/](design/) | 토큰 · 색 · 타이포 · 모션 · 화면 상태 · 푸터 사양 |

## 에셋 출처

모든 이미지와 글꼴은 오픈소스만 쓰고 저장소에서 직접 호스팅합니다. 파일·출처·
라이선스·수정 여부는 [`public/assets-manifest.json`](public/assets-manifest.json) 에
기록되어 있습니다. 사람이 읽는 요약은 사이트 푸터에 있습니다.

## 알려진 미해결 항목

- **INP 미측정** — LCP·CLS 는 실측했으나(데스크톱 LCP 1,796ms · 모바일 668ms ·
  CLS 0) INP 측정 도구를 아직 도입하지 못했습니다.
- **실연동 QA 3경로 미판정** — Gemini 무료 등급 하루 20건 할당량이 소진되어
  프롬프트 주입 방어·저하 모드·실연동 재현성을 실호출로 확인하지 못했습니다.
  구조적 격리는 단위 테스트로 고정되어 있습니다.
- **Gemini 스키마 상시 거부** — 평탄화한 스키마도 모델 첫 호출에서 거부되어
  스키마 없는 폴백 경로로 동작합니다. 기능 영향은 없으나 원인은 미규명입니다.
- **데스크톱 LCP 의 1.8초 재페인트** — h1 은 284ms 에 그려지는데 0.09% 큰
  재페인트가 최종 LCP 를 잡습니다. 없애면 LCP 가 284ms 로 떨어집니다.
- **Hero 배경 영상 미확보** — Pexels 영상 CDN 403, Pixabay 404 로 실패해 GSAP Ken
  Burns 사진 시퀀스로 대체했습니다. 교체 지점은
  `components/hero/HeroMediaLayer.tsx` 의 `HERO_FRAMES` 입니다.
- **`ⓘ ▾ ☂` 글리프 부재** — Pretendard 원본에 없어 서브셋 범위와 무관하게
  시스템 폰트로 폴백됩니다.
