# 디자인 토큰 — 여행 큐레이션

| 항목 | 내용 |
|---|---|
| 문서 | design/design-tokens.md |
| 대상 | Tailwind CSS v4.3.3 (CSS-first `@theme`) |
| 전제 | `tailwind.config.ts` 없음. 모든 토큰은 `app/globals.css`의 `@theme` 블록에 선언한다 |
| 권위 | **`app/globals.css`가 단일 진실원천이다.** 이 문서는 그 파일을 옮겨 적은 것이며, 둘이 어긋나면 코드가 맞다 |
| 관련 | [color-system.md](./color-system.md) · [typography.md](./typography.md) · [motion-spec.md](./motion-spec.md) · [footer-spec.md](./footer-spec.md) |

---

## 0. 읽는 법

Tailwind v4는 설정 파일이 아니라 CSS 커스텀 프로퍼티로 테마를 정의한다. `@theme` 안에 선언한 변수는 **자동으로 유틸리티 클래스가 된다.**

| `@theme` 네임스페이스 | 생성되는 유틸리티 | 이 프로젝트에서 쓰는가 |
|---|---|---|
| `--color-*` | `bg-*` `text-*` `border-*` `fill-*` `ring-*` | ✅ |
| `--spacing-*` | `p-*` `m-*` `gap-*` `w-*` `h-*` | ✅ |
| `--radius-*` | `rounded-*` | ✅ |
| `--shadow-*` | `shadow-*` | ✅ |
| `--font-*` | `font-*` | ✅ |
| `--text-*` | `text-*` (크기) | ✅ |
| `--tracking-*` | `tracking-*` | ✅ |
| `--leading-*` | `leading-*` | ✅ |
| `--ease-*` | `ease-*` | ✅ |
| `--breakpoint-*` | `sm:` `md:` `lg:` | ✅ |
| `--container-*` | `max-w-*` | ✅ |

**네임스페이스가 없는 토큰**(z-index, duration)은 `@theme`이 아니라 `@layer base`의 `:root`에 선언하고 임의값 문법으로 참조한다. 아래 각 절에 명시한다.

---

## 1. 색

모든 값은 `app/globals.css`의 `@theme` 블록에서 가져왔다. 대비 계산과 사용 규칙의 근거는 [color-system.md](./color-system.md)에 있다.

### 1-1. Ocean 램프 — 기준색 (바다색 계열 파랑)

| CSS 변수 | 값 | 흰색 위 대비 | 주 용도 |
|---|---|---|---|
| `--color-ocean-50` | `#eff8ff` | 1.06 | `estimate` 배지 배경, 칩 hover |
| `--color-ocean-100` | `#dbeefe` | 1.19 | 입력 포커스 링(`ring-ocean-100`) |
| `--color-ocean-200` | `#bfe2fe` | 1.35 | `estimate` 배지 테두리, Hero 아이브로우 |
| `--color-ocean-300` | `#92d0fd` | 1.71 | 칩 hover 테두리 |
| `--color-ocean-400` | `#5fb6fa` | 2.28 | 그라디언트 중간점 |
| `--color-ocean-500` | `#3897f0` | **3.06** | **포커스 아웃라인·채움 전용.** 텍스트 금지 |
| `--color-ocean-600` | `#1f77e0` | **4.40** | **포커스 아웃라인**(비텍스트 4.40/4.20 ✅), 밝은 면 위 **큰 글자만**. 흰 글자 배경 금지 |
| `--color-ocean-700` | `#1a5fbe` | **6.13** | 기본 버튼·선택 칩 배경, 링크 |
| `--color-ocean-800` | `#1b4f9a` | 7.98 | `estimate` 배지 텍스트 |
| `--color-ocean-900` | `#10355f` | 12.38 | 그림자 색상 원색 |
| `--color-ocean-950` | `#0a2038` | 16.45 | **Hero 배경·스크림 원색.** 페이지에서 유일한 어두운 면 |

### 1-2. Accent 램프 — 강조색 (선셋 코랄, 정확히 하나)

| CSS 변수 | 값 | 흰색 위 대비 | 흰 글자 얹을 때 | 규칙 |
|---|---|---|---|---|
| `--color-accent-50` | `#fff3f0` | 1.05 | — | 배경 틴트 |
| `--color-accent-100` | `#ffe3dc` | 1.19 | — | 배경 틴트 |
| `--color-accent-300` | `#ffab93` | 1.83 | — | 배경·장식 |
| `--color-accent-500` | `#ff6b4a` | **2.82** | **2.82** | ❌ **채움 전용.** 글자색·흰 글자 배경 금지 |
| `--color-accent-600` | `#ed4a26` | **3.74** | **3.74** | ⚠️ 본문 크기 글자 금지 |
| `--color-accent-700` | `#c5371a` | **5.34** | **5.34** | ✅ **양방향 안전. 강조색 텍스트는 이것만** |

> 명도 단계는 **두 번째 강조색이 아니다.** 코랄 이외의 유채색 강조 추가는 금지한다.

### 1-3. 표면 — 흰색에 가깝게

| CSS 변수 | 값 | 용도 |
|---|---|---|
| `--color-surface` | `#ffffff` | 카드·입력 필드, 페이지 기본 배경 |
| `--color-surface-subtle` | `#f8fafc` | 표 헤더·합계 행, 구획, **푸터 배경** |
| `--color-surface-sunken` | `#f1f5f9` | `unverified` 배지, 가라앉은 영역 |

> **푸터 배경은 `surface-subtle`이다.** footer.design 분류상 **Bright**를 택했으므로 어두운 면을 쓰지 않는다. `ocean-950`을 쓰는 Hero가 페이지에서 **유일한** 어두운 면이다. 상세는 [footer-spec.md](./footer-spec.md).

### 1-4. 선 · 잉크

| CSS 변수 | 값 | 용도 |
|---|---|---|
| `--color-line` | `#e2e8f0` | **장식 구분선 전용** (흰 배경 1.23) |
| `--color-line-strong` | `#cbd5e1` | **비조작 장식 테두리 전용** (흰 배경 **1.48**). 배지·구분자·푸터 고지 칩 |
| `--color-control-border` | `#78889c` | **조작 요소 경계 전용** (흰 **3.62** / `surface-subtle` **3.46** / `surface-sunken` **3.30**). 입력·미선택 칩·라디오·체크박스 — WCAG 1.4.11 충족 |
| `--color-ink` | `#0f172a` | 제목, 금액 숫자 (흰 배경 17.85) |
| `--color-ink-soft` | `#475569` | 본문, 보조 설명 (흰 배경 7.58) |
| `--color-ink-muted` | `#64748b` | 캡션 (흰 배경 4.76). **`surface-sunken` 위 금지** (4.34) |
| `--color-ink-inverse` | `#ffffff` | 어두운 면 위 텍스트 |

### 1-5. 상태색

상태색은 강조색 개수 규칙의 대상이 아니다. **색만으로 상태를 전달하지 않는다.**

| CSS 변수 | 값 | 대비 | 용도 |
|---|---|---|---|
| `--color-warn-bg` | `#fffbeb` | `warn-ink` 위 **6.84** | `typical_range` 배지 배경 |
| `--color-warn-line` | `#fde68a` | — | 같은 배지 테두리 |
| `--color-warn-ink` | `#92400e` | — | 같은 배지 텍스트 |
| `--color-danger-bg` | `#fef2f2` | `danger-ink` 위 **5.91** | 오류 배너 배경 |
| `--color-danger-line` | `#fecaca` | — | 오류 배너 테두리 |
| `--color-danger-ink` | `#b91c1c` | 흰 배경 **6.47** | 오류 텍스트·필드 테두리 |
| `--color-ok-bg` | `#f0fdf4` | `ok-ink` 위 **4.79** | 체크 완료 배경 |
| `--color-ok-ink` | `#15803d` | — | 체크 완료 텍스트 |

### 1-6. Hero 스크림 (토큰이 아니라 유틸리티·인라인 조합)

Hero 스크림은 CSS 변수가 아니라 `components/hero/HeroSection.tsx`의 두 레이어다.

```
레이어 1 (하→상):  bg-gradient-to-t from-ocean-950/78 via-transparent to-ocean-950/35

레이어 2 (좌→우, 인라인):
  linear-gradient(to right,
    rgb(10 32 56 / 0.82)  0%,
    rgb(10 32 56 / 0.76) 42%,
    rgb(10 32 56 / 0.60) 58%,
    rgb(10 32 56 / 0.30) 73%,
    rgb(10 32 56 / 0.08) 87%,
    transparent          96%)
```

**`--gradient-hero-copy-guard` 같은 토큰은 존재하지 않는다.** 카피 뒤에 국소 가드를 두면 사각 경계가 눈에 드러나므로, Hero 전체를 덮는 수평 그라디언트가 그 역할을 한다.

| 규칙 | 내용 |
|---|---|
| 방사형이 아니라 **선형 수평** | 방사형은 바깥 stop의 알파가 먼저 떨어져 h1 박스 오른쪽 끝(뷰포트 약 55%)에서 대비가 무너졌다 |
| stop은 **텍스트 폭을 보장**한다 | 58%까지 0.86 이상 유지 후 73%부터 해제. 사진의 오른쪽 절반은 살린다 |
| 스크림 `opacity: 1` **고정** | 스크럽하지 않는다. 스크롤 스크럽은 사진 레이어(scale·blur·opacity)에만 건다 |
| stop 값은 **대비 계산의 입력값** | 하나라도 바꾸면 [color-system.md](./color-system.md) §5-1의 절차로 재측정한다 |
| 스크림에 `pointer-events-none` **필수** | 스크림이 Canvas 위에 있으므로, 없으면 3D 클릭을 가로챈다 (§5-1) |
| 알파가 이전보다 **낮다** | Canvas를 스크림 아래로 내려 파티클 간섭이 사라진 만큼 사진을 다시 살렸다. **대비는 오히려 올라갔다** |

## 2. 여백 · 폭

**`--spacing-*` 커스텀 토큰은 선언하지 않는다.** Tailwind v4의 기본 간격 스케일(0.25rem 배수)을 그대로 쓴다. 레이아웃 폭은 토큰이 아니라 마크업의 유틸리티로 표현된다.

| 용도 | 실제 값 | 위치 |
|---|---|---|
| 페이지 컨테이너 최대 폭 | `max-w-[1200px]` | `HeroSection.tsx`, `Section.tsx` |
| 좌우 거터 (모바일) | `px-5` (20px) | 동일 |
| 좌우 거터 (640px 이상) | `sm:px-8` (32px) | 동일 |
| Hero 카피 블록 최대 폭 | `max-w-[640px]` | `HeroSection.tsx` — **스크림 대비 계산의 전제** |
| Hero 부제 최대 폭 | `max-w-[520px]` | 동일 |
| 카드 내부 패딩 | `p-5` → `sm:p-6` / `sm:p-8` | `result/*` |
| Hero 최소 높이 | `min-h-[100svh]` | `HeroSection.tsx` — CLS 방지 |

> Hero 카피 폭은 장식이 아니라 **대비 계산에 들어가는 값**이다. `max-w-[640px]`을 넓히면 텍스트가 수평 그라디언트의 옅은 구간으로 밀려나 대비가 떨어진다. 변경 시 [color-system.md](./color-system.md) §5를 다시 계산한다.

---

## 3. 라운드

| CSS 변수 | 값 | 용도 |
|---|---|---|
| `--radius-card` | `1.25rem` (20px) | 카드, 결과 블록 래퍼 |
| `--radius-field` | `0.75rem` (12px) | 입력 필드, 버튼, 내부 패널 |
| `--radius-chip` | `999px` | 칩, 배지 |

세 개뿐이다. 스케일을 더 잘게 나누지 않는 편이 일관성을 지키기 쉽다.

---

## 4. 그림자

"유리질(Air)" 인상을 위해 넓고 흐리고 옅게. 검정이 아니라 `ocean-900`(`16 53 95`)을 낮은 알파로 쓴다.

| CSS 변수 | 값 |
|---|---|
| `--shadow-card` | `0 1px 2px rgb(16 53 95 / 0.04), 0 8px 24px -12px rgb(16 53 95 / 0.14)` |
| `--shadow-lift` | `0 2px 4px rgb(16 53 95 / 0.06), 0 18px 40px -16px rgb(16 53 95 / 0.22)` |

**포커스 링은 그림자 토큰이 아니라 `outline`으로 구현한다.** `box-shadow` 포커스는 `overflow: hidden` 조상에서 잘린다.

```css
:focus-visible {
  outline: 3px solid var(--color-ocean-600);
  outline-offset: 2px;
  border-radius: 4px;
}
```

> **`ocean-500`이 아니라 `ocean-600`이다.** `ocean-500`은 흰 배경 3.06이지만 `surface-subtle` 위에서 **2.93**으로 미달했고, 그 배경 위에 포커스 가능한 요소(`RegenerateBar`의 버튼, `BudgetTable`의 행)가 실제로 있었다. `ocean-600`은 흰 **4.40** / `surface-subtle` **4.20**이다.
>
> 입력 필드의 `focus:ring-4 focus:ring-ocean-100`은 흰 배경 대비 **1.19**로 **표시가 아니라 여운(glow)**이다. 포커스 신호는 `outline`이 전달한다.

---

## 5. z-index

Tailwind v4에 `--z-*` 네임스페이스는 없지만, 이 프로젝트는 `@theme` 안에 선언하고 `style={{ zIndex: 'var(--z-hero-copy)' }}`로 참조한다.

Hero 레이어 값은 [screen-states.md](./screen-states.md)의 z-order 표와 **1:1로 일치한다.**

> **Canvas(10)가 스크림(20)보다 아래다.** 처음에는 반대였고, 그 결과 z=20의 흰 파티클이 카피 뒤 배경을 밝혀 **텍스트 대비를 9포인트 가까이 깎았다.** 파티클 위치는 `Math.random()`으로 흩뿌려지므로, 그 구성에서는 대비가 **페이지 로드마다 달라지는 값**이었다. 스크림을 위로 올려 텍스트 대비를 3D 내용과 **무관하게** 만들었다. 근거는 [color-system.md](./color-system.md) §5-3.

| CSS 변수 | 값 | 레이어 |
|---|---|---|
| `--z-hero-video` | `0` | 배경 미디어 — **사진 시퀀스** (변수명은 구현과 일치시키기 위해 유지한다) |
| `--z-hero-canvas` | `10` | R3F Canvas (투명) — **스크림 아래** |
| `--z-hero-scrim` | `20` | 두 겹 그라디언트 스크림 — **사진과 3D를 모두 덮는다** |
| `--z-hero-copy` | `30` | h1 / 부제 / CTA — **LCP 요소** |
| `--z-hero-cue` | `40` | 스크롤 유도 표시 |

Hero 외부에서 z축을 쓰는 곳은 `.skip-link`의 `z-index: 100` 하나뿐이다. 그 밖의 쌓임은 DOM 순서로 해결한다.

---

## 6. 모션

### 6-1. 지속 시간

| CSS 변수 | 값 | 용도 |
|---|---|---|
| `--duration-fast` | `180ms` | 버튼 눌림, 칩 토글, 색 전이 |
| `--duration-base` | `320ms` | 호버, 카드 확장, 패널 열기 |
| `--duration-slow` | `550ms` | 섹션 스크롤 진입, 강조 연출 |

### 6-2. 이징

| CSS 변수 | 값 | 성격 |
|---|---|---|
| `--ease-out-soft` | `cubic-bezier(0.22, 1, 0.36, 1)` | 빠르게 나갔다 부드럽게 안착. 진입 연출 기본값 |
| `--ease-in-out-soft` | `cubic-bezier(0.65, 0, 0.35, 1)` | 대칭. 위치가 오가는 전환 |

> 스크럽 타임라인의 트윈 이징은 **반드시 `none`**이다. 스크롤 위치와 진행률이 선형으로 대응하지 않으면 되감을 때 어긋나 보인다.

### 6-3. 모션 저감 (R7)

`@layer base`에서 전역으로 건다. GSAP `matchMedia`와 **이중**으로 막는다.

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

`html`의 `scroll-behavior: smooth`까지 되돌리는 것이 핵심이다. 이것을 빼면 앵커 이동이 여전히 부드럽게 스크롤되어 모션 저감 요청을 어긴다.

### 6-4. Hero Ken Burns

배경 사진에 거는 느린 줌·패닝. 영상 대체 구현이므로 **모션 저감 시에는 애니메이션 자체를 끈다.**

```css
@keyframes hero-kenburns-drift {
  from { transform: scale(1.04) translate3d(0, 0, 0); }
  to   { transform: scale(1.16) translate3d(-1.5%, -1.5%, 0); }
}
.hero-kenburns { will-change: transform; }
.hero-kenburns-active { animation: hero-kenburns-drift 9s var(--ease-out-soft) forwards; }

@media (prefers-reduced-motion: reduce) {
  .hero-kenburns-active { animation: none; }
}
```

---

## 7. 타이포 토큰

전체 규칙과 근거는 [typography.md](./typography.md)에 있다. 여기에는 `@theme`에 실제로 들어간 값만 싣는다.

| CSS 변수 | 크기 | line-height | letter-spacing | weight |
|---|---|---|---|---|
| `--text-display` | `4rem` (64px) | `1.12` | `-0.035em` | 800 |
| `--text-h1` | `2.75rem` (44px) | `1.2` | `-0.03em` | 800 |
| `--text-h2` | `1.875rem` (30px) | `1.3` | `-0.022em` | 700 |
| `--text-h3` | `1.3125rem` (21px) | `1.4` | `-0.015em` | 700 |
| `--text-body` | `1rem` (16px) | `1.7` | — | 400 |
| `--text-sm` | `0.875rem` (14px) | `1.6` | — | 400 |
| `--text-xs` | `0.75rem` (12px) | `1.5` | — | 400 |

`--text-body`의 `1.7`은 **한글 본문 가독성의 최소선**이다. 이보다 좁히지 않는다.

### 7-1. 반응형 디스플레이

`--text-display`(64px)는 데스크톱 값이다. 모바일에서는 유틸리티 클래스가 36px로 낮춘다.

```css
.text-display-responsive {
  font-size: 2.25rem;      /* 36px — 모바일 기본 */
  line-height: 1.15;
  letter-spacing: -0.03em;
  font-weight: 800;
}
@media (min-width: 768px) {
  .text-display-responsive {
    font-size: var(--text-display);              /* 64px */
    line-height: var(--text-display--line-height);
    letter-spacing: var(--text-display--letter-spacing);
  }
}
```

`clamp()`가 아니라 미디어 쿼리를 쓴다. `clamp()`는 중간 폭에서 예측 불가능한 값이 나와 390px/1440px 두 기준 검증을 어렵게 한다.

### 7-2. 글꼴 스택

| CSS 변수 | 값 |
|---|---|
| `--font-sans` | `'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif` |

---

## 8. 전역 기본값 (`@layer base`)

```css
html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

body {
  background-color: var(--color-surface);
  color: var(--color-ink);
  font-family: var(--font-sans);
  word-break: keep-all;        /* 한글은 단어 중간에서 끊지 않는다 */
  overflow-wrap: anywhere;     /* 그래도 넘치면 강제 줄바꿈 — 390px 가로 스크롤 방어 */
  -webkit-font-smoothing: antialiased;
}

/* S9: 390px에서 가로 스크롤 0 — 넘칠 수 있는 요소의 기본 방어선 */
img, video, canvas, svg { max-width: 100%; }
```

`word-break: keep-all`과 `overflow-wrap: anywhere`는 **짝으로만 의미가 있다.** 앞의 것만 쓰면 사용자가 입력한 40자 여행지가 컨테이너를 밀어내 390px 가로 스크롤(S9 위반)을 만든다.

### 8-1. 유틸리티

| 클래스 | 내용 |
|---|---|
| `.skip-link` | 본문 바로가기. 평소 `left: -9999px`, `:focus`에서 나타난다. 배경 `ocean-700` + `ink-inverse`(6.13) |
| `.glass-panel` | `surface` 72% + `backdrop-filter: blur(14px) saturate(1.3)`. "유리질" 인상 |
| `.hero-kenburns-active` | §6-4 |
| `.text-display-responsive` | §7-1 |

---

## 9. 토큰 사용 금지 규칙

린트와 리뷰에서 잡는다. 근거는 전부 [color-system.md](./color-system.md)의 실측값이다.

| # | 금지 | 이유 |
|---|---|---|
| T1 | 컴포넌트 안에서 `#RRGGBB` 리터럴 사용 | 토큰을 우회하면 대비 검증이 무의미해진다 |
| T2 | `text-accent-500` · `bg-accent-500` 위에 흰 글자 | **2.82.** 채움 전용 — 장식 불릿에만 |
| T3 | `text-accent-600`을 본문 크기에 사용 | **3.74.** 큰 글자만 |
| T4 | `bg-ocean-600` 위에 흰 글자 | **4.40.** 흰 글자 채움은 `ocean-700`(6.13) 이상 |
| T5 | `text-ocean-500`을 텍스트로 사용 | **3.06.** 채움 전용 |
| T5b | 포커스 아웃라인에 `ocean-500` 사용 | `surface-subtle` 위 **2.93**으로 미달. `ocean-600` 이상 |
| T6 | `text-ink-muted`를 `surface-sunken` 위에 사용 | **4.34.** 가라앉은 면에서는 `ink-soft`(6.92) |
| T7 | `border-line`·`border-line-strong`을 **조작 요소** 테두리에 사용 | **1.23 / 1.48.** 조작 요소 경계는 `control-border`(3.62) |
| T7b | `border-control-border`를 장식 선에 사용 | 반대 방향의 오용. 장식은 `line`·`line-strong` |
| T8 | `box-shadow`로 포커스 링 구현 | `overflow: hidden` 카드 안에서 잘린다. `outline` 사용 |
| T9 | 스크럽 타임라인에 `none` 이외의 이징 | 스크롤 되감기 시 위치 어긋남 |
| T10 | 코랄 이외의 유채색 강조 추가 | "강조색은 정확히 하나" 규칙 위반 |
| T11 | z-index 숫자 리터럴 | Hero 레이어 순서가 문서와 어긋난다. `var(--z-…)` 사용 |
| T12 | Hero 카피 `max-w-[640px]` 확대 | 텍스트가 그라디언트 옅은 구간으로 밀려 대비가 깨진다 (§2) |
| T13 | 금액을 강조색으로 칠하기 | 강조색은 "확정"을 연상시킨다. R1 위반 인상 |
