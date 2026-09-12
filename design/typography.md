# 타이포그래피 — 여행 큐레이션

| 항목 | 내용 |
|---|---|
| 문서 | design/typography.md |
| 서체 | Pretendard (한글 고딕) — 저장소 자체 호스팅 |
| 핵심 규칙 | 제목과 본문의 크기 차이를 뚜렷하게 · 한글 조판은 `word-break: keep-all` · 본문 행간 1.6 이상 |
| 관련 | [design-tokens.md](./design-tokens.md) · [color-system.md](./color-system.md) |


> ⚠️ **이 문서의 타입 스케일 표(§2)는 아직 구현과 맞지 않는다.**
> 색 토큰과 대비 수치는 `app/globals.css` 기준으로 reconcile을 마쳤으나,
> **스케일은 초기 설계안의 11단계를 그대로 담고 있고 실제로 shipped된 것은 7단계다**
> (`text-display` 4rem · `text-h1` 2.75rem · `text-h2` 1.875rem · `text-h3` 1.3125rem ·
> `text-body` 1rem/1.7 · `text-sm` 0.875rem · `text-xs` 0.75rem).
> `text-body-lg` · `text-body-sm` · `text-caption` · `text-micro` · `text-num` · `text-h4` 는
> **존재하지 않는 클래스다.** 실제 값은 [design-tokens.md](./design-tokens.md) §7을 보라.
> 스케일 재정렬은 별도 작업으로 남겨 두었다.

---

## 1. 서체 선택과 조달

| 항목 | 내용 |
|---|---|
| 서체 | Pretendard Variable (가변 폰트, weight 45–920) |
| 라이선스 | SIL Open Font License 1.1 — 웹 임베딩·재배포·수정 허용 |
| 조달 | 저장소에 직접 포함. CDN·`next/font/google` 사용하지 않는다 |
| 형식 | `.woff2` 서브셋 1종 (`PretendardVariable.subset.woff2`) |
| 경로 | `public/fonts/PretendardVariable.subset.woff2` |
| 서브셋 범위 | 한글 완성형 2,350자 + 라틴 기본 + 숫자 + 문장부호 + 통화기호(₩ ~) |
| 목표 용량 | **≤ 320KB** (동적 서브셋 아닌 단일 파일) |
| 기록 | `public/assets-manifest.json`에 파일·출처·라이선스·저자·수정 여부 기록 (R6) |

> Pretendard는 이미지·영상이 아니므로 Pexels/Pixabay 규칙(R6)의 대상은 아니지만, 오픈소스 에셋 추적 원칙을 동일하게 적용해 매니페스트에 함께 기록한다.

### 1-1. 로드 방식

```css
/* app/globals.css */
@font-face {
  font-family: 'Pretendard Variable';
  src: url('/fonts/PretendardVariable.subset.woff2') format('woff2-variations');
  font-weight: 45 920;
  font-style: normal;
  font-display: swap;   /* LCP가 Hero 텍스트이므로 block 금지 */
  unicode-range: U+0020-007E, U+00A0-00FF, U+20A9, U+2018-201D,
                 U+3000-303F, U+AC00-D7A3, U+1100-11FF;
}
```

```tsx
// app/layout.tsx — Server Component. 프리로드는 LCP 직결이므로 반드시 둔다.
<link
  rel="preload"
  href="/fonts/PretendardVariable.subset.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>
```

| 결정 | 이유 |
|---|---|
| `font-display: swap` | LCP 요소가 Hero **텍스트**다. `block`이면 폰트 로드 전까지 텍스트가 렌더되지 않아 LCP가 폰트 다운로드 시간만큼 밀린다 |
| 폴백 스택 1순위 `-apple-system` → `Apple SD Gothic Neo` | swap 구간에서 보이는 시스템 한글 고딕. 글자폭이 Pretendard와 가까워 리플로우가 작다 |
| `size-adjust` 미사용 | 가변 서브셋 단일 파일이 320KB 이하로 충분히 빠르다. 추가 조정은 검증 부담만 늘린다 |
| 가변 폰트 1개 | weight 400/500/600/700을 정적 4파일로 받으면 4회 요청 + 총 용량 증가. CLS 관점에서도 불리하다 |

---

## 2. 타입 스케일

배율 1.5(Perfect Fifth)를 본문 위에 적용하고, 본문 이하 구간은 1.125로 촘촘하게 잡았다. 큰 배율을 위에만 쓰는 이유는 **제목과 본문의 대비를 벌리기 위해서**다.

### 2-1. 데스크톱 (≥768px)

| 토큰 | px | rem | line-height | letter-spacing | weight | 용도 |
|---|---|---|---|---|---|---|
| `text-display` | 72 | 4.5 | 1.08 | -0.03em | 700 | Hero h1 — **LCP 요소** |
| `text-h1` | 48 | 3 | 1.15 | -0.025em | 700 | 결과 화면 최상단 제목, 푸터 스테이트먼트 |
| `text-h2` | 32 | 2 | 1.25 | -0.02em | 700 | 결과 블록 제목 (일자별 코스 / 예산표 / …) |
| `text-h3` | 24 | 1.5 | 1.35 | -0.015em | 600 | 일자 카드 제목, 폼 섹션 제목 |
| `text-h4` | 20 | 1.25 | 1.45 | -0.01em | 600 | 표 헤더, 체크리스트 분류 제목 |
| `text-body-lg` | 18 | 1.125 | 1.75 | 0 | 400 | Hero 보조 카피, 블록 도입 문장 |
| `text-body` | 16 | 1 | 1.7 | 0 | 400 | 기본 본문, 폼 입력값 |
| `text-body-sm` | 15 | 0.9375 | 1.65 | 0 | 400 | 카드 내부 설명, 표 셀 |
| `text-caption` | 14 | 0.875 | 1.6 | 0.005em | 400 | 보조 설명, 근거(`basis`) 문구 |
| `text-micro` | 12 | 0.75 | 1.5 | 0.01em | 500 | 확신도 배지 라벨, 라이선스 표기 |
| `text-num` | 17 | 1.0625 | 1.4 | 0 | 600 | **금액 전용** (`tabular-nums`) |

### 2-2. 모바일 (390px)

항목과 선택지는 동일하고(R4) **크기만** 줄인다. 아래 값은 `@media (max-width: 767px)`에서 같은 토큰을 재정의한 것이며, 유틸리티 클래스명은 바뀌지 않는다.

| 토큰 | 데스크톱 px | 모바일 px | 축소율 | line-height (모바일) |
|---|---|---|---|---|
| `text-display` | 72 | **38** | 0.53 | 1.18 |
| `text-h1` | 48 | **30** | 0.63 | 1.25 |
| `text-h2` | 32 | **24** | 0.75 | 1.33 |
| `text-h3` | 24 | **20** | 0.83 | 1.40 |
| `text-h4` | 20 | **18** | 0.90 | 1.45 |
| `text-body-lg` | 18 | **17** | 0.94 | 1.70 |
| `text-body` | 16 | **16** | 1.00 | 1.70 |
| `text-body-sm` | 15 | **15** | 1.00 | 1.65 |
| `text-caption` | 14 | **14** | 1.00 | 1.60 |
| `text-micro` | 12 | **12** | 1.00 | 1.50 |
| `text-num` | 17 | **17** | 1.00 | 1.40 |

| 규칙 | 내용 |
|---|---|
| 하한 | 본문 계열은 모바일에서 축소하지 않는다. 16px 미만 본문은 iOS Safari에서 입력 포커스 시 자동 확대를 유발한다 |
| 상한 | `text-display` 38px + `word-break: keep-all`로 390px에서 "제주도에서 보내는" 같은 어절이 잘리지 않는다 |
| 구현 | `clamp()`가 아니라 미디어 쿼리로 재정의한다. `clamp()`는 중간 폭에서 예측 불가능한 값이 나와 390px/1440px 두 기준 검증을 어렵게 한다 |

```css
@media (max-width: 767px) {
  @theme inline {
    --text-display: 2.375rem;  /* 38px */
    --text-display--line-height: 1.18;
    --text-h1: 1.875rem;       /* 30px */
    --text-h1--line-height: 1.25;
    --text-h2: 1.5rem;         /* 24px */
    --text-h2--line-height: 1.33;
    --text-h3: 1.25rem;        /* 20px */
    --text-h3--line-height: 1.40;
    --text-h4: 1.125rem;       /* 18px */
    --text-body-lg: 1.0625rem; /* 17px */
  }
}
```

---

## 3. 제목·본문 대비 규칙

디자인 방향이 요구한 "제목과 본문의 크기 차이를 뚜렷하게"를 검증 가능한 수치로 고정한다.

| # | 규칙 | 데스크톱 | 모바일 | 검증 |
|---|---|---|---|---|
| TY1 | Hero h1 ÷ Hero 보조 카피 **≥ 3.5배** | 72 / 18 = **4.00** ✅ | 38 / 17 = **2.24** ⚠️ | 모바일은 아래 TY2로 보완 |
| TY2 | 모바일 Hero h1 ÷ 보조 카피 **≥ 2.2배** | — | 38 / 17 = **2.24** ✅ | |
| TY3 | 블록 제목(h2) ÷ 본문 **≥ 2.0배** | 32 / 16 = **2.00** ✅ | 24 / 16 = **1.50** ⚠️ | 모바일은 굵기 대비로 보완 (TY5) |
| TY4 | 카드 제목(h3) ÷ 카드 본문(body-sm) **≥ 1.5배** | 24 / 15 = **1.60** ✅ | 20 / 15 = **1.33** ⚠️ | TY5로 보완 |
| TY5 | 모든 제목과 인접 본문의 **weight 차 ≥ 200** | 700 vs 400 = 300 ✅ / 600 vs 400 = 200 ✅ | 동일 ✅ | 크기 대비가 줄어드는 모바일에서 위계를 유지하는 주 수단 |
| TY6 | 제목의 `letter-spacing`은 항상 음수, 본문은 0 이상 | ✅ | ✅ | 큰 글자의 자간이 벌어져 보이는 착시 보정 |
| TY7 | 제목 색 `ink`, 본문 색 `ink-soft` — **색 명도까지 위계에 참여** | **17.85 vs 7.58** | 동일 | [color-system.md](./color-system.md) §3-1 |

> 모바일에서 크기 비가 1.33~1.50으로 떨어지는 구간은 **크기 + 굵기 + 색 명도 3중 대비**로 위계를 유지한다. 390px에서 제목을 더 키우면 `word-break: keep-all` 환경에서 줄바꿈이 깨진다.

---

## 4. 한글 조판 규칙

| # | 규칙 | CSS | 이유 |
|---|---|---|---|
| K1 | 어절 중간에서 줄바꿈하지 않는다 | `word-break: keep-all` (`html`에 전역) | 기본값 `normal`은 한글을 글자 단위로 끊는다. "제주도에서 / 보내는"이 "제주도에 / 서 보내는"이 된다 |
| K2 | 예외적으로 넘치는 긴 문자열은 강제 줄바꿈 | `overflow-wrap: anywhere` (`html`에 전역) | K1만 걸면 사용자가 입력한 40자 여행지가 컨테이너를 밀어내 390px 가로 스크롤(S9 위반)을 만든다 |
| K2-1 | 사용자 자유 입력을 그대로 출력하는 요소(여행지명·추가 요청 에코) | 위 전역 규칙 + `min-width: 0` on flex 자식 | flex 자식은 기본 `min-width: auto`라 줄어들지 않아 넘친다. 가로 스크롤의 가장 흔한 원인 |
| K3 | 본문 행간 **1.6 이상** | `--text-body--line-height: 1.7` 등 | 한글은 라틴보다 글자 상자가 꽉 차고 받침이 있어 1.5로는 답답하다 |
| K4 | 제목 행간 1.08–1.45 | 표 §2-1 | 큰 제목은 행간이 넓으면 한 덩어리로 안 읽힌다 |
| K5 | 제목 줄바꿈 균형 | `text-wrap: balance` (h1~h3) | 마지막 줄에 한 어절만 남는 것을 방지 |
| K6 | 본문 줄바꿈 | `text-wrap: pretty` (p) | 고아 어절 방지. 미지원 브라우저는 무시하므로 안전 |
| K7 | 금액·시간 숫자 | `font-variant-numeric: tabular-nums` | 예산표에서 자릿수가 흔들리면 합계 검산이 어렵다 |
| K8 | 금액 단위 | 숫자와 "원" 사이 공백 없음, 천단위 콤마 | `1,250,000원`. `Intl.NumberFormat('ko-KR')` |
| K9 | 날짜 | `2026. 10. 3.(토)` 형식 | 요일 포함. 사용자가 일정 감을 잡는 데 요일이 핵심 |
| K10 | 시각 | `09:30` 24시간제 | "오전/오후"는 표에서 폭을 낭비한다 |
| K11 | 이탤릭 금지 | — | 한글 폰트에 진짜 이탤릭이 없어 기울임 합성이 되고 가독성이 떨어진다. 강조는 weight로 |
| K12 | 밑줄은 링크에만 | `text-decoration: underline` | 강조 밑줄은 링크로 오인된다 |
| K13 | 전각 문장부호 사용 안 함 | `…` 대신 `...` 금지, `…` 사용 | 말줄임은 U+2026 한 글자로 |
| K14 | 자간 조정을 본문에 적용하지 않음 | `letter-spacing: 0` | 한글 본문의 음수 자간은 받침이 붙어 보이게 만든다 |

```css
@layer base {
  h1, h2, h3 { text-wrap: balance; }
  p, li { text-wrap: pretty; }
  .num, td.num, .money { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }
}
```

---

## 5. 컴포넌트별 타이포 적용

| 컴포넌트 | 요소 | 토큰 | 색 | 비고 |
|---|---|---|---|---|
| Hero | h1 | `text-display-responsive` / 800 | `text-white` | LCP. SSR로 즉시 렌더. 스크림 위 실측 **5.07** (3D 구동 상태) |
| Hero | 부제 | `text-body` / 400 | **`text-white`** (불투명) | 스크림 위 실측 **7.43** — [color-system.md](./color-system.md) §5-4 |
| Hero | CTA 버튼 | `text-body` / 600 | `white` on `ocean-600` | 대비 6.52 |
| Hero | CTA 보조 문구 | `text-xs` | **`text-white`** (불투명) | 스크림 위 실측 **9.88** |
| Hero | SCROLL 큐 | `text-xs` | `text-white/90` | 스크림 위 실측 **9.77** |
| 입력 폼 | 섹션 제목 | `text-h3` / 600 | `ink` | |
| 입력 폼 | 라벨 | `text-body-sm` / 600 | `ink` | 필수 표시는 텍스트 "필수"로. `*` 단독 금지 |
| 입력 폼 | 도움말 | `text-caption` / 400 | `ink-muted` | `aria-describedby`로 필드에 연결 |
| 입력 폼 | 입력값 | `text-body` / 400 | `ink` | 16px 고정 (iOS 확대 방지) |
| 입력 폼 | 오류 문구 | `text-body-sm` / 500 | `danger-ink` | 아이콘 + 텍스트 |
| 처리 중 | 안내 문구 | `text-h3` / 600 | `ink` | |
| 처리 중 | 단계 표시 | `text-caption` / 400 | `ink-muted` | |
| 요약 카드 | 여행 제목 | `text-h2` / 700 | `ink` | |
| 요약 카드 | 총 예산 | `text-num` 1.5배(26px) / 700 | `ink` | 강조색으로 칠하지 않는다 (C5) |
| 일자별 코스 | 일자 제목 | `text-h3` / 600 | `ink` | |
| 일자별 코스 | 시각 | `text-body-sm` / 600 | `ocean-700` | `tabular-nums` |
| 일자별 코스 | 장소명 | `text-h4` / 600 | `ink` | |
| 일자별 코스 | 지역명(`areaName`) | `text-caption` / 400 | `ink-muted` | 텍스트일 뿐 링크가 아니다 (R5) |
| 예산표 | 헤더 | `text-body-sm` / 600 | `ink-soft` | |
| 예산표 | 금액 | `text-num` / 600 | `ink` | `tabular-nums` |
| 예산표 | 근거(`basis`) | `text-caption` / 400 | `ink-soft` | 줄무늬 배경 위이므로 `ink-muted` 금지 |
| 예산표 | 합계 행 | `text-num` 1.15배(20px) / 700 | `ink` | 상단 2px 실선 |
| 체크리스트 | 항목명 | `text-body` / 400 | `ink-soft` | 완료 시 `line-through` + `ok-ink` |
| 체크리스트 | 사유 | `text-caption` / 400 | `ink-muted` | |
| 우천 대안 | 대체 대상 | `text-body-sm` / 600 | `ocean-700` | |
| 확신도 배지 | 라벨 | `text-micro` / 500 | §6 매핑 | |
| 오류 화면 | 제목 | `text-h2` / 700 | `ink` | |
| 오류 화면 | 설명 | `text-body-lg` / 400 | `ink-soft` | |
| 푸터 | 스테이트먼트 | `text-h1`(데스크톱 64px 확대) / 700 | `ink` | [footer-spec.md](./footer-spec.md) §3 |
| 푸터 | 컬럼 제목 | `text-caption` / 600, `tracking-wide` | `ink-muted` | |
| 푸터 | 링크 | `text-sm` / 400 | `ink-soft` (hover `ocean-700`) | **7.24** / hover **5.86** |
| 푸터 | 범위 고지 | `text-caption` / 400 | `ink-soft` | |
| 푸터 | 에셋 출처 | `text-xs` / 400 | `ink-muted` | `surface-subtle` 배경 대비 **4.55**. 12px 이하로 더 줄이지 않는다 |

> 마지막 행은 design-tokens.md의 금지 규칙 T4(`ink-muted` 14px 미만 금지)에 대한 **유일한 명시적 예외**다. 라이선스 표기는 법적 요구를 충족하는 최소 표기이며, 본문 정보가 아니다. 그 외 어떤 곳에서도 예외를 만들지 않는다.

---

## 6. 확신도 배지 타이포

| `confidence` | 라벨 | 크기 | weight | 형태 구분 |
|---|---|---|---|---|
| `estimate` | `추정` | `text-micro` 12px | 500 | 배경 채움, 테두리 없음 |
| `typical_range` | `통상 범위` | `text-micro` 12px | 500 | 배경 채움 + 좌측 2px 실선 바 |
| `unverified` | `미확인` | `text-micro` 12px | 500 | 배경 채움 + 1px 점선 테두리 |

배지는 금액·시각 **바로 뒤**에 붙고, 줄바꿈으로 분리되지 않는다(`white-space: nowrap`, 부모에 `display: inline-flex; gap: 6px`).

`basis`(근거)는 배지 아래 `text-caption`으로 한 줄. `verifyHint`(확인 방법)는 배지에 `title`이 아니라 **가시 텍스트**로 둔다 — `title`은 키보드·터치에서 접근되지 않는다.

---

## 7. 타이포 금지 규칙

| # | 금지 | 이유 |
|---|---|---|
| P1 | `text-[13px]` 같은 임의 크기 | 스케일 밖 값은 위계를 무너뜨린다 |
| P2 | 본문에 `clamp()` | 390px/1440px 두 기준 검증이 불가능해진다 |
| P3 | 한글에 이탤릭 | 합성 기울임. K11 |
| P4 | 폼 입력 필드 16px 미만 | iOS Safari 자동 확대 |
| P5 | `word-break: break-all` | 어절 중간 절단 |
| P6 | 제목에 `text-transform: uppercase` | 한글에 무효이고 라틴 혼용 시 위계만 흐려진다 |
| P7 | 금액에 비례 숫자(`proportional-nums`) | 자릿수 흔들림 |
| P8 | 필수 표시를 `*` 기호 단독으로 | 스크린리더가 "별표"로 읽는다. "필수" 텍스트 병기 |
