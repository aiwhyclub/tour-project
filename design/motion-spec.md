# 모션 사양 — 여행 큐레이션

| 항목 | 내용 |
|---|---|
| 문서 | design/motion-spec.md |
| 구현 수단 | GSAP 3.15.0 + ScrollTrigger + Flip + ScrollToPlugin, `@gsap/react` 2.1.2의 `useGSAP` |
| 3D | React Three Fiber 9.7.0 + drei 10.7.8 (Three.js 0.185.1) |
| 불변 규칙 | R5(3D는 좌표를 쓰지 않는 장식) · R7(모션 저감 시 전면 해제) |
| 관련 | [design-tokens.md](./design-tokens.md) §6 · [screen-states.md](./screen-states.md) · [footer-spec.md](./footer-spec.md) |

---

## 1. 모션 원칙

| # | 원칙 | 이유 |
|---|---|---|
| M1 | 모션은 **위치와 인과**를 설명할 때만 쓴다 | 장식 목적의 움직임은 정보 탐색을 방해한다 |
| M2 | 스크롤 구동 모션의 이징은 항상 `none` | 스크롤을 되감을 때 위치가 어긋나 보인다 |
| M3 | 프레임마다 React state를 갱신하지 않는다 | 60fps × 리렌더는 INP 예산을 그대로 태운다. §7의 브리지 참조 |
| M4 | 모든 능력 판정은 `useEffect` 안에서만 | 서버는 항상 정적(calm) 변형을 렌더하고 클라이언트가 마운트 후 승격한다. 하이드레이션 불일치 방지 |
| M5 | 모션이 꺼져도 **정보는 100% 그대로** | 모션으로만 드러나는 콘텐츠를 만들지 않는다 |
| M6 | 언마운트 시 트윈·ScrollTrigger를 남기지 않는다 | `useGSAP`이 컨텍스트를 자동 revert한다 |
| M7 | 이벤트 핸들러 안의 트윈은 `contextSafe()`로 감싼다 | 감싸지 않으면 컨텍스트 밖에서 생성돼 revert 대상에서 누락된다 |

---

## 2. 지속 시간·이징 매핑

| 목적 | 토큰 | ms | GSAP 이징 |
|---|---|---|---|
| 버튼 눌림, 칩 토글 | `--duration-fast` | 120 | `power2.out` |
| 호버, 색·그림자 전이, 포커스 | `--duration-base` | 240 | `power2.inOut` |
| 카드 Flip 확장, 패널 열기 | `--duration-slow` | 420 | `power3.inOut` |
| 섹션 스크롤 진입 | `--duration-slow` | 550 | `ease-out-soft` |
| Hero 최초 등장 | `--duration-slow` 기반, GSAP에서 직접 지정 | ~900 | `ease-out-soft` |
| 파티클 임펄스 감쇠 | — | ~900 | `power2.out` (`useFrame` 내 수동 감쇠) |
| 스크럽 타임라인 전체 | — | scrub 1 | `none` |
| 모션 저감 시 | 전역 `0.01ms` 강제 (`@media (prefers-reduced-motion: reduce)`) | ~0 | — |

**스태거**: 체크리스트 0.04s · 결과 블록/예산표 행 0.08s · 푸터 컬럼 0.12s.

---

## 3. 플러그인 등록

플러그인은 **애플리케이션 전체에서 정확히 한 번** 등록한다.

```ts
// lib/motion/gsap-setup.ts
'use client';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(useGSAP, ScrollTrigger, Flip, ScrollToPlugin);

// iOS/Android에서 주소창 표시·숨김에 따른 뷰포트 높이 변화로
// ScrollTrigger가 재계산되며 pin이 튀는 현상을 막는다.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, useGSAP, ScrollTrigger, Flip, ScrollToPlugin };
```

| 규칙 | 내용 |
|---|---|
| 등록 위치 | 이 파일 단 하나. 다른 곳에서 `registerPlugin` 호출 금지 |
| import 경로 | 모든 컴포넌트는 `gsap`을 직접 import하지 않고 `lib/motion/gsap-setup`에서 가져온다 |
| `useGSAP` 등록 이유 | 트리셰이킹 도구가 `useGSAP`을 미사용으로 판단해 제거하는 것을 막는다 |
| React StrictMode | `useGSAP`은 개발 모드 이중 호출에서 컨텍스트를 revert 후 재생성하므로 트윈이 중복되지 않는다 |

---

## 4. 능력 판정 매트릭스

`gsap.matchMedia()`로 세 조건을 정의한다. matchMedia는 **리사이즈 시 자동으로 해당 컨텍스트를 revert**하므로 창 크기를 바꿔가며 테스트해도 트윈이 누적되지 않는다.

```ts
const mm = gsap.matchMedia();
mm.add({
  full:   '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
  mobile: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
  calm:   '(prefers-reduced-motion: reduce)',
}, (ctx) => {
  const { full, mobile, calm } = ctx.conditions!;
  /* … */
});
```

| 기능 | `full` (데스크톱 ≥768px) | `mobile` (<768px) | `calm` (모션 저감) |
|---|---|---|---|
| Hero 배경 미디어 | **사진 3장 교차 디졸브 + Ken Burns** | 동일하게 전환 (용량이 작아 모바일에서도 로드한다) | **첫 장에서 정지** |
| R3F Canvas | **마운트** (§6 게이트 통과 시) | **마운트하지 않음** | **마운트하지 않음** |
| Hero pin + scrub | **적용** | 적용하지 않음 | 적용하지 않음 |
| Hero 카피 최초 등장 | 1200ms expo.out, y 24→0 | 640ms expo.out | **없음** (즉시 최종 상태) |
| 섹션 스크롤 진입 | 전체 (y 32→0, opacity, 스태거 0.08) | 축약 (y 12→0, 스태거 0.04, 420ms) | opacity만 · ≤150ms · 스태거 0 |
| 카드 클릭 확장 | Flip 420ms | Flip 420ms (**유지**) | Flip 없이 즉시 토글 |
| 메뉴 클릭 스크롤 | `scrollTo` 800ms + 3D 임펄스 | `scrollTo` 600ms (임펄스 없음) | 네이티브 점프 (`behavior: 'auto'`) |
| 체크리스트 토글 | 스트라이크 스윕 + 스케일 팝 | 동일 | 즉시 상태 변경 |
| 예산 행 클릭 | 근거 스태거 노출 240ms | 동일 | 즉시 표시 |
| 푸터 진입 애니메이션 | 전체 (§5-7) | 축약 | **없음** |
| 스크롤 큐 | 상하 2px 루프 | 표시하되 루프 없음 | 표시하되 루프 없음 |

> **모바일에서 Flip을 유지하는 이유**: 카드 확장은 "장식"이 아니라 **어떤 카드가 어디로 갔는지**를 설명하는 인과 모션이다(M1). 모바일에서 제거하면 확장 후 화면이 통째로 바뀐 것처럼 보인다. 반면 pin·scrub·영상·Canvas는 인과와 무관한 연출이므로 제거한다.

### 4-1. 판정 순서

```
서버 렌더           → 항상 calm 변형 (포스터 이미지, 정적 레이아웃, 최종 상태 스타일)
     ↓ hydration
useEffect 1회       → matchMedia 등록 → full / mobile / calm 결정
     ↓ full 인 경우만
requestIdleCallback → WebGL2 지원 확인 → IntersectionObserver로 hero 가시성 확인
     ↓ 모두 통과
next/dynamic 청크 로드 → Canvas 마운트
```

---

## 5. 인터랙션 스토리보드

각 항목은 **트리거 / 구간 / 대상과 값 / 이징·시간 / 정리 / calm 변형** 순서다.

### 5-1. Hero 마스터 타임라인 (pin + scrub)

| 항목 | 값 |
|---|---|
| 트리거 | `ScrollTrigger` on `#hero` |
| 설정 | `start: 'top top'` · `end: '+=120%'` · `scrub: 1` · `pin: true` · `anticipatePin: 1` |
| 조건 | `full`에서만. `mobile`/`calm`에서는 타임라인 자체를 만들지 않는다 |
| 이징 | 전 트윈 `none` (M2) |
| 정리 | `useGSAP` 컨텍스트 revert 시 ScrollTrigger와 pin-spacer까지 함께 제거 |

**z-order와 스크롤 거동**

| z | 레이어 | 요소 | 진행률 0 → 1 |
|---|---|---|---|
| 0 | 배경 사진 | `HeroMediaLayer` 컨테이너 (`next/image` 3장) | `scale 1 → 1.12` · `opacity 1 → 0.35` · `filter: blur(0px) → blur(6px)` |
| **10** | **R3F Canvas** | `<Canvas>` 투명 배경 | 카메라 `z 6 → 3.2` · 그룹 `rotation.y 0 → 0.9rad` · 파티클 확산 계수 `1 → 1.8` · 파티클 `opacity 0.5 → 0.06` |
| **20** | **스크림** | `div` 두 겹 (수직 + 수평) | **변화 없음 (opacity 1 고정)** |
| 30 | 카피 | `h1` / 보조 카피 / CTA | `y 0 → -80px` · `opacity 1 → 0` — **LCP 요소** |
| 40 | 스크롤 큐 | 화살표 + "스크롤" | `opacity 1 → 0` (진행률 0.15에서 완료) |

| 규칙 | 내용 |
|---|---|
| **pointer-events 계약** | Hero에서 가장 깨지기 쉬운 부분이다. §5-5-1에 따로 적는다 |
| CLS | Hero는 `min-h-[100svh]`로 높이를 미리 잡고 Canvas는 `position: absolute; inset: 0`. 늦게 마운트돼도 레이아웃이 밀리지 않는다 (S15, CLS ≤ 0.05) |
| LCP | z=30 카피는 SSR 시점에 최종 텍스트로 렌더된다. 사진·Canvas 로드와 무관하게 그려진다. 첫 장 사진은 `priority`로 선로드된다 |
| 스크림 | **z=20에 두 겹** — 사진(z=0)과 Canvas(z=10)를 **모두** 덮는다. 수직 `ocean-950/78 → 투명 → /35`, 수평 stop 6개 `0.82@0% → 0.76@42% → 0.60@58% → 0.30@73% → 0.08@87% → 투명@96%`. **opacity 1 고정이며 스크럽하지 않는다.** 스크림을 Canvas 위로 올린 이유와 측정 근거는 [color-system.md](./color-system.md) §5-3 |
| 미디어 사양 | 자체 호스팅 JPEG **3장** · 장당 5,200ms · 교차 디졸브 1,600ms · CSS `hero-kenburns-drift` 9초(scale 1.04→1.16 + 미세 패닝) · 첫 장 `priority` · **오디오 없음** |

**영상 자동재생 거부 폴백은 존재하지 않는다.** 배경이 `<img>`이므로 재생 승인이 필요 없다. 초기 설계안에 있던 이 실패 경로는 미디어를 사진으로 바꾸면서 **사라졌다** ([docs/04_TRD.md](../docs/04_TRD.md) 9-4). 남은 폴백은 WebGL 미지원(§5-5)과 모션 저감(§4)뿐이다.

**사진 로드 실패**: 해당 자리는 `ocean-950` 단색으로 남고 두 겹 스크림이 그대로 얹혀 카피 가독성이 오히려 올라간다.

**Hero 카피 색**: h1·부제·CTA 보조 문구는 전부 **불투명 `text-white`**다. 이전의 `/85`·`/80` 알파는 자기 대비를 깎고 있었고, 알파를 걷어내는 것이 대비를 올리는 가장 싼 수단이었다 ([color-system.md](./color-system.md) §5-4). 오류 문구를 띄우지 않는다.

### 5-2. 섹션 스크롤 진입 (결과 화면 5블록)

| 항목 | 값 |
|---|---|
| 트리거 | 각 블록 `ScrollTrigger` · `start: 'top 82%'` · `once: true` |
| 대상 | 블록 제목 → 본문 컨테이너 → 자식 카드/행 |
| full | `y 32 → 0`, `opacity 0 → 1`, 640ms, `expo.out`, 스태거 0.08s |
| mobile | `y 12 → 0`, `opacity 0 → 1`, 420ms, `expo.out`, 스태거 0.04s |
| calm | `opacity 0 → 1`, 150ms, 스태거 0. y 이동 없음 |
| 정리 | `once: true`라 발화 후 자동 kill. 컨텍스트 revert 시 잔여분 제거 |

> **초기 상태를 CSS로 숨기지 않는다.** `opacity: 0`을 CSS에 두면 JS 실패 시 콘텐츠가 영원히 보이지 않는다. `gsap.from()`으로 JS가 성공했을 때만 시작 상태를 만든다.

### 5-3. 메뉴 클릭 → 섹션 이동 + 3D 임펄스

| 항목 | 값 |
|---|---|
| 트리거 | 섹션 바로가기 버튼 `click` (그리고 `keydown` Enter/Space) |
| 동작 A | `gsap.to(window, { duration: 0.8, ease: 'power3.inOut', scrollTo: { y: '#budget', offsetY: 72 } })` |
| `offsetY: 72` | sticky 섹션 네비 높이. 목표 제목이 네비 아래로 숨는 것을 막는다 |
| 동작 B | `scrollProgress.impulse = 1` 대입 → `useFrame`이 파티클 확산·회전 속도를 일시 가속 후 ~900ms에 걸쳐 0으로 감쇠 |
| mobile | 동작 A만 (600ms). Canvas가 없으므로 동작 B는 no-op |
| calm | `window.scrollTo({ top, behavior: 'auto' })` — GSAP 미사용 |
| 래핑 | `contextSafe()` (M7) |

### 5-4. 일자 카드 클릭 확장 (Flip)

| 순서 | 동작 |
|---|---|
| 1 | `const state = Flip.getState('.day-card, .day-card *')` — 변경 **전** 위치 기록 |
| 2 | React state 토글 → 카드가 접힘/펼침 레이아웃으로 리렌더 |
| 3 | `useLayoutEffect`(또는 `useGSAP` dependency)에서 `Flip.from(state, { duration: 0.42, ease: 'power3.inOut', absolute: true, nested: true, onComplete: () => ScrollTrigger.refresh() })` |
| 4 | `ScrollTrigger.refresh()` — 카드 높이가 바뀌어 아래 섹션들의 `start`/`end` 좌표가 전부 어긋난다. 호출하지 않으면 진입 애니메이션이 엉뚱한 지점에서 발화한다 |

| 조건 | 변형 |
|---|---|
| full / mobile | 위와 동일 (420ms) |
| calm | Flip 없이 state만 토글. 그 뒤 `ScrollTrigger.refresh()`는 **동일하게 호출** (레이아웃 변화는 모션과 무관하게 발생하므로) |
| 접근성 | 카드 헤더는 `<button aria-expanded>`. 펼침 영역은 `id`로 `aria-controls` 연결 |

### 5-5. Hero 3D 오브젝트 클릭

| 항목 | 값 |
|---|---|
| 대상 | Canvas 안의 단일 저폴리 메시 (`LowPolyIsland`) |
| 동작 | `gsap.to(mesh.rotation, { y: '+=6.283', duration: 1.1, ease: 'power2.out' })` + 파티클 버스트(`impulse = 1`) |
| 접근성 | 3D 오브젝트는 키보드 초점을 받지 않는다. **동일 기능의 대체 경로를 제공하지 않는다** — 순수 장식이고 정보가 없기 때문이다 (M5 충족) |
| mobile / calm | Canvas 자체가 없으므로 존재하지 않는다 |
| WebGL 미지원 | Canvas 미마운트. Hero는 사진 시퀀스 + 스크림 + 카피만으로 완결된다 |

#### 5-5-1. pointer-events 계약 — 이 기능을 조용히 죽이는 것

**3D 클릭은 트윈이 아니라 이벤트 도달 여부에서 실패한다.** 실제로 이 기능은 구현된 채로 **한 번도 발화하지 않은 기간이 있었다.** Canvas 위를 덮은 요소가 클릭을 전부 가로챘기 때문이다.

| 요소 | z | pointer-events | 이유 |
|---|---|---|---|
| 배경 사진 `[data-hero-media]` | 0 | (기본) | 클릭 대상 아님 |
| **R3F Canvas** | 10 | **`auto`** | **여기가 클릭을 받아야 한다** |
| **스크림** | 20 | **`none` (필수)** | Canvas 위에 있다. 없으면 Hero 전체 클릭을 삼킨다 |
| **카피 컨테이너** (`max-w-[1200px]`) | 30 | **`none` (필수)** | 폭 1200px이 섬의 x 위치를 덮는다. **투명해도 클릭을 가로챈다** |
| 카피 내부 `[data-hero-copy]` | 30 | **`auto`** | CTA 버튼과 텍스트 선택은 살아 있어야 한다 |

**함정은 카피 컨테이너다.** 눈에 보이는 것은 좌측 640px 텍스트 블록뿐이지만, **레이아웃 컨테이너는 1200px 전폭**이고 z=30이라 그 아래 모든 것을 가린다. 배경이 투명해 화면상으로는 아무 단서가 없다.

**검증 방법 — 눈으로 보지 말고 물어본다.**

```js
document.elementFromPoint(islandX, islandY).tagName   // 'CANVAS' 여야 한다
document.elementFromPoint(ctaX, ctaY).tagName         // 'BUTTON'
document.elementFromPoint(headlineX, headlineY).tagName // 'H1'
```

세 지점이 모두 기대한 태그를 반환해야 계약이 지켜진 것이다. 클릭 반응 자체도 관찰로 확인한다 — 섬 영역의 프레임 간 픽셀 변화량이 텍스트 영역 대조군보다 뚜렷이 커야 한다(실측 48.0 대 14.57; 대조군의 변화는 Ken Burns 표류분이다).

> **z 순서를 바꿀 때마다 이 계약을 다시 확인한다.** 스크림을 Canvas 위로 올리는 변경(§5-1 z-order)에서 스크림에 `pointer-events-none`을 넣지 않았다면 3D 클릭이 다시 죽었을 것이다.

### 5-6. 예산 행 클릭 → 근거 노출

| 항목 | 값 |
|---|---|
| 트리거 | 예산표 행 `<button>` click |
| full/mobile | 행 아래 `basis` + `verifyHint`가 `height: 0 → auto`, `opacity 0 → 1`, 240ms, `power2.out`, 항목 간 스태거 0.08s |
| calm | 즉시 표시 (150ms opacity만) |
| 규칙 | `height: auto` 트윈은 GSAP이 픽셀로 계산한다. 애니메이션 종료 후 `clearProps: 'height'`로 되돌려 반응형 높이를 회복시킨다 |

### 5-7. 체크리스트 항목 토글

| 항목 | 값 |
|---|---|
| full/mobile | ① 취소선 스윕: `::after` 의사요소 `scaleX 0 → 1`, `transform-origin: left`, 240ms, `power2.out` ② 체크 아이콘 스케일 팝: `scale 0.6 → 1`, 120ms, `back.out(1.4)` |
| calm | 취소선·색 변화만 즉시 적용 |
| 상태 | 체크 상태는 클라이언트 로컬. 서버로 보내지 않는다(로그인 없음) |

### 5-8. 공통 카드 호버·포커스 (`InteractiveCard`)

| 상태 | 변화 | 시간 |
|---|---|---|
| hover (포인터 기기만) | `y -2px`, `shadow-card → shadow-lift` | `--duration-base` (320ms) `ease-out-soft` |
| active | `scale 0.995` | 120ms `power2.out` |
| focus-visible | `outline: 3px solid ocean-600`, offset 2px | 즉시 |
| calm | hover 시 그림자만 (150ms), y 이동 없음 |
| 규칙 | `@media (hover: hover)` 안에서만 hover 트윈을 건다. 터치 기기에서 hover가 고착되는 것을 막는다 |

### 5-9. 처리 중 화면

| 항목 | 값 |
|---|---|
| 진입 | 오버레이 `opacity 0 → 1` 240ms |
| 진행 표시 | 결정적 진행률을 알 수 없으므로 **퍼센트를 표시하지 않는다.** 무한 진행 바 (`--gradient` 좌→우 루프 1.4s `linear`) |
| 단계 문구 | 0s "여행 조건을 정리하고 있어요" → 4s "일정을 짜고 있어요" → 9s "예산을 계산하고 있어요" → 20s "조금만 더 기다려 주세요". `setTimeout` 기반, 모션이 아니라 텍스트 교체 |
| calm | 진행 바 루프 제거. 정적 바 + 단계 문구만. `aria-live="polite"`로 단계 변화를 읽힘 |
| 취소 | [취소] 버튼 → `AbortController.abort()` → 입력 화면으로 복귀, 입력값 보존 |

### 5-10. 오류 화면 진입

| 항목 | 값 |
|---|---|
| full/mobile | 오류 카드 `y 16 → 0`, `opacity 0 → 1`, 420ms, `expo.out` |
| calm | opacity만 150ms |
| 금지 | 흔들림(shake) 애니메이션. 실패를 조롱하는 인상을 주고 전정 자극에 취약한 사용자에게 해롭다 |
| 접근성 | 오류 컨테이너에 `role="alert"`. 진입 시 자동 읽힘 |

### 5-11. 푸터 진입 애니메이션

[footer-spec.md](./footer-spec.md) §5에 상세를 둔다. 요약:

| 조건 | 동작 |
|---|---|
| full | 스테이트먼트 행 단위 마스크 리빌(`clip-path` 상 → 하, 640ms `expo.out`, 행 스태거 0.08) → 그리드 컬럼 `y 20 → 0` 스태거 0.12 → 하단 고지 `opacity` |
| mobile | 스테이트먼트 `opacity + y 12`, 420ms. 컬럼 스태거 0.06 |
| calm | 전부 최종 상태로 즉시 표시 |
| 트리거 | `start: 'top 88%'` · `once: true` |

---

## 6. R3F Canvas 마운트 게이트

Canvas는 아래 **다섯 조건이 모두 참일 때만** 마운트한다. 하나라도 거짓이면 Canvas 청크를 요청조차 하지 않는다.

| # | 조건 | 확인 방법 |
|---|---|---|
| G1 | 뷰포트 ≥ 768px | `matchMedia('(min-width: 768px)')` |
| G2 | `prefers-reduced-motion: no-preference` | `matchMedia` |
| G3 | WebGL2 사용 가능 | `document.createElement('canvas').getContext('webgl2') !== null` |
| G4 | Hero가 뷰포트에 보임 | `IntersectionObserver` |
| G5 | `load` 이후 유휴 시점 도달 | `requestIdleCallback` (미지원 시 `setTimeout(1500)`) |

G5가 LCP 보호 장치다. **3D 청크는 LCP 이후에 요청된다.**

```tsx
// components/hero/HeroCanvasGate.tsx — 'use client'
// 이 파일이 next/dynamic(..., { ssr: false })가 등장하는 유일한 위치다.
const HeroScene = dynamic(() => import('@/components/three/HeroScene'), {
  ssr: false,
  loading: () => null,
});
```

| 규칙 | 내용 |
|---|---|
| `ssr: false` 위치 | Server Component에서 호출하면 Next 15에서 에러가 난다. 반드시 `'use client'` 파일 안에서만 |
| `three` import 경계 | `components/three/**`만 `three` / `@react-three/*`를 import할 수 있다. ESLint `no-restricted-imports`로 강제 |
| 컨텍스트 손실 | `<canvas>`의 `webglcontextlost` 이벤트 → `preventDefault()` 없이 Canvas 언마운트 → 포스터 상태로 복귀. 복구 시도하지 않는다 |

### 6-1. Canvas 구성

```tsx
<Canvas
  frameloop={heroVisible ? 'always' : 'never'}
  dpr={[1, 1.5]}
  gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
  camera={{ position: [0, 0, 6], fov: 45 }}
>
  <AdaptiveDpr pixelated />
  {/* … */}
</Canvas>
```

| 설정 | 값 | 이유 |
|---|---|---|
| `frameloop` | Hero 이탈 시 `'never'` | 결과 화면을 보는 동안 GPU가 계속 도는 것을 막는다 |
| `dpr` | `[1, 1.5]` | Retina 2x/3x 전체 해상도는 픽셀 수가 4~9배가 된다. 장식 비주얼에 그 비용을 쓰지 않는다 |
| `antialias` | `false` | MSAA 비용 제거. 파티클·저폴리 형태라 계단현상이 눈에 띄지 않는다 |
| `alpha` | `true` | 배경 사진 위에 얹히므로 배경 투명 필수 |
| `AdaptiveDpr pixelated` | 사용 | 프레임이 떨어지면 drei가 해상도를 자동으로 낮춘다 |
| 그림자 | **없음** | 섀도 맵 렌더 패스 하나가 파티클 전체보다 비싸다 |
| 후처리 | **없음** | `@react-three/postprocessing` 미도입. 번들·GPU 비용 대비 얻는 것이 없다 |
| HDR 환경맵 | **없음** | 수 MB 텍스처. 예산 위반 |

### 6-2. 씬 예산

| 항목 | 상한 |
|---|---|
| 파티클 | 4,000개 (단일 `Points` + `BufferGeometry`) |
| 삼각형 | 20,000 |
| 머티리얼 | 2종 (`PointsMaterial` 1 + `MeshStandardMaterial` 1) |
| 텍스처 | 512×512 이하 |
| 조명 | `ambientLight` 1 + `directionalLight` 1 (그림자 off) |
| 지오메트리 | 저폴리 결정 형태. **좌표·지도 타일·Geo API 일절 사용 없음** (R5) |

---

## 7. GSAP → R3F 브리지

**문제**: 스크롤 진행률을 React state로 두면 스크럽 1회당 리렌더가 발생한다. 60fps 스크롤 5초 = 300회 리렌더.

**해결**: 평범한 가변 모듈 객체를 공유 채널로 쓴다. GSAP이 쓰고 `useFrame`이 읽는다. React는 이 값의 존재를 모른다.

```ts
// lib/motion/scroll-progress.ts
// React state가 아니다. 의도적으로 가변 싱글턴이다.
export const scrollProgress = {
  /** Hero 마스터 타임라인 진행률 0–1. GSAP onUpdate가 쓴다. */
  progress: 0,
  /** 클릭 임펄스 0–1. 이벤트 핸들러가 1로 올리고 useFrame이 감쇠시킨다. */
  impulse: 0,
};
```

```ts
// 쓰는 쪽 — Hero 타임라인
ScrollTrigger.create({
  /* … */
  onUpdate: (self) => { scrollProgress.progress = self.progress; },
});
```

```ts
// 읽는 쪽 — components/three/HeroScene.tsx
useFrame((_, delta) => {
  const p = scrollProgress.progress;
  camera.position.z = 6 - p * 2.8;          // 6 → 3.2
  group.current.rotation.y = p * 0.9;
  points.current.scale.setScalar(1 + p * 0.8);
  // 임펄스 감쇠: 900ms에 걸쳐 0으로
  scrollProgress.impulse = Math.max(0, scrollProgress.impulse - delta / 0.9);
});
```

| 성질 | 결과 |
|---|---|
| 스크롤 중 React 리렌더 | **0회** |
| 값 전달 지연 | 없음 (같은 프레임 내 읽기) |
| SSR 안전성 | 모듈 초기값이 상수라 서버에서 import돼도 문제없다 |
| 정리 | Canvas 언마운트 시 `progress`/`impulse`는 다음 마운트에서 다시 쓰이므로 초기화 불필요. 필요하면 gate의 cleanup에서 0으로 되돌린다 |

**대안을 쓰지 않는 이유**

| 대안 | 기각 사유 |
|---|---|
| `useState` + `setProgress` | 프레임당 리렌더. R3F 트리 전체가 재조정된다 |
| Zustand/Jotai 등 외부 스토어 | 구독자 알림 비용과 의존성 하나가 추가된다. 값 하나를 프레임 단위로 넘기는 데 스토어는 과하다 |
| React Context | 값 변경 시 하위 전체 리렌더. 가장 나쁜 선택 |
| `drei`의 `<ScrollControls>` | 스크롤 소유권을 R3F가 가져간다. 우리 페이지의 스크롤은 GSAP ScrollTrigger가 소유해야 한다 (pin·refresh 일관성) |

---

## 8. 정리(cleanup) 계약

| 대상 | 정리 방법 | 담당 |
|---|---|---|
| 트윈·타임라인 | `useGSAP` 컨텍스트 자동 revert | `@gsap/react` |
| ScrollTrigger 인스턴스 | 동일 컨텍스트에서 생성 시 자동 kill | `@gsap/react` |
| pin-spacer DOM | ScrollTrigger kill 시 함께 제거 | GSAP |
| `matchMedia` 컨텍스트 | 조건 불일치 시 자동 revert | `gsap.matchMedia()` |
| 이벤트 핸들러 트윈 | `contextSafe()`로 감싸 컨텍스트에 귀속 | 개발자 (M7) |
| `IntersectionObserver` | `useEffect` cleanup에서 `disconnect()` | 개발자 |
| `requestIdleCallback` | cleanup에서 `cancelIdleCallback` | 개발자 |
| Three.js 지오메트리·머티리얼 | R3F가 언마운트 시 자동 dispose | `@react-three/fiber` |
| WebGL 컨텍스트 | Canvas 언마운트 시 R3F가 해제 | `@react-three/fiber` |
| `setTimeout` (처리 중 단계 문구) | cleanup에서 `clearTimeout` | 개발자 |

---

## 9. 모션 금지 규칙

| # | 금지 | 이유 |
|---|---|---|
| MX1 | `useEffect` 밖(렌더 본문)에서 `window`/`matchMedia` 접근 | 하이드레이션 불일치 |
| MX2 | Server Component에서 `next/dynamic(..., { ssr: false })` | Next 15에서 런타임 에러 |
| MX3 | `components/three/**` 밖에서 `three` import | 3D 코드가 초기 번들로 섞여 들어간다 (S13·성능 예산 위반) |
| MX4 | `useFrame` 안에서 `setState` | 프레임당 리렌더 |
| MX5 | CSS로 초기 `opacity: 0` 후 JS로 복원 | JS 실패 시 콘텐츠 영구 소실 |
| MX6 | 레이아웃 변경 후 `ScrollTrigger.refresh()` 누락 | 이후 모든 트리거 좌표가 어긋난다 |
| MX7 | 이벤트 핸들러 트윈을 `contextSafe()` 없이 생성 | 언마운트 후에도 살아남아 메모리를 잡는다 |
| MX8 | 배경 미디어에 오디오 트랙 포함 | 브라우저가 자동재생을 차단하고, 용량이 늘고, 사용자에게 무례하다. 현재 배경은 사진이라 해당 사항이 없지만, 영상으로 되돌릴 경우 이 규칙이 되살아난다 |
| MX9 | shake·bounce 등 전정 자극 모션 | 어지럼증 유발. WCAG 2.3.3 |
| MX10 | 스크럽 타임라인에 `none` 이외 이징 | 되감기 시 위치 어긋남 |
