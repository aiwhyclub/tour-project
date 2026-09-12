'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/motion/gsap-setup';
import { heroMotion, pulseHero } from '@/lib/motion/scroll-progress';
import { useMotionCapability } from '@/lib/motion/use-motion-capability';
import { HeroMediaLayer } from './HeroMediaLayer';
import { HeroCanvasGate } from './HeroCanvasGate';
import { HeroScrollCue } from './HeroScrollCue';
import { Button } from '@/components/ui/Button';

/**
 * Hero 합성.
 *
 * 레이어 z-order (design/screen-states.md 와 1:1 대응):
 *   0  미디어(사진 시퀀스)  scale 1 -> 1.12, opacity 1 -> 0.35, blur 0 -> 6px
 *   10 스크림(그라디언트)    opacity 0.35 -> 0.92
 *   20 3D 캔버스            카메라 z 6 -> 3.2, 회전, 입자 확산
 *   30 텍스트               y 0 -> -80, opacity 1 -> 0   ← LCP 요소
 *   40 스크롤 큐            progress 0.15 에서 사라짐
 *
 * 하나의 핀 타임라인이 네 레이어를 모두 스크럽하므로 위상이 어긋나지 않는다.
 */
export function HeroSection({ onStart }: { onStart: () => void }) {
  const scope = useRef<HTMLElement>(null);
  const capability = useMotionCapability();
  const [canvasActive, setCanvasActive] = useState(true);

  const { contextSafe } = useGSAP(
    () => {
      if (!capability.ready) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          full: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
          mobile: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
          calm: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const { full, calm } = ctx.conditions as Record<string, boolean>;

          // R7: 모션 저감이면 등장 연출만 짧게, 핀·스크럽은 만들지 않는다.
          if (calm) {
            gsap.set('[data-hero-copy] > *', { opacity: 1, y: 0 });
            gsap.set('[data-hero-scrim]', { opacity: 1 });
            heroMotion.progress = 0;
            return;
          }

          /*
           * 진입 연출 — 제목/부제/CTA 를 차례로 올린다.
           *
           * h1 만 opacity 를 건드리지 않는다. h1 이 LCP 요소인데(실측 확인),
           * opacity 를 0 에서 올리면 브라우저는 페이드가 끝날 때까지 "아직 그려지지
           * 않았다"고 보고 LCP 기록을 미룬다. 실측: 데스크톱 LCP 292ms -> 1,788ms.
           * FCP 는 두 경우 모두 ~285ms 로 같았으니 순전히 연출이 만든 지연이다.
           *
           * design/motion-spec.md 149 행이 "z=30 카피는 SSR 시점에 최종 텍스트로
           * 렌더된다"고 LCP 보호를 명시하는데, opacity 페이드가 그 전제를 깨고 있었다.
           * transform 은 페인트 상태를 바꾸지 않으므로 y 이동은 LCP 에 영향이 없다.
           */
          const copyItems = Array.from(
            scope.current?.querySelectorAll<HTMLElement>('[data-hero-copy] > *') ?? [],
          );
          copyItems.forEach((el, i) => {
            const isLcpElement = el.tagName === 'H1';
            gsap.from(el, {
              y: 26,
              ...(isLcpElement ? {} : { opacity: 0 }),
              duration: 0.85,
              delay: i * 0.12,
              ease: 'power3.out',
            });
          });

          // 모바일은 핀·스크럽 없이 배경만 아주 얕게 움직인다.
          if (!full) {
            gsap.to('[data-hero-scrim]', {
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: scope.current,
                start: 'top top',
                end: 'bottom top',
                scrub: true,
              },
            });
            return;
          }

          // 데스크톱: 핀 + 스크럽 마스터 타임라인
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: scope.current,
              start: 'top top',
              end: '+=120%',
              scrub: 1,
              pin: true,
              pinSpacing: true,
              anticipatePin: 1,
              onUpdate: (self) => {
                // GSAP -> R3F 브리지. React state 를 거치지 않는다.
                heroMotion.progress = self.progress;
              },
              onToggle: (self) => setCanvasActive(self.isActive),
            },
          });

          tl.to('[data-hero-media]', { scale: 1.12, filter: 'blur(6px)', opacity: 0.35, ease: 'none' }, 0)
            .to('[data-hero-scrim]', { opacity: 1, ease: 'none' }, 0)
            .to('[data-hero-copy]', { y: -80, opacity: 0, ease: 'none' }, 0)
            // 캔버스도 함께 빠져야 한다. 빼먹으면 3D 오브젝트만 남아
            // Hero 경계에서 잘린 채 아래 섹션 위로 튀어나온다.
            .to('[data-hero-canvas]', { opacity: 0, ease: 'none' }, 0)
            .to('[data-hero-cue]', { opacity: 0, duration: 0.15, ease: 'none' }, 0);
        },
      );

      return () => mm.revert();
    },
    { scope, dependencies: [capability.ready, capability.reducedMotion, capability.isDesktop] },
  );

  // 이벤트 핸들러에서 만드는 트윈은 contextSafe 로 감싸야 컨텍스트에 등록된다.
  const handleStart = contextSafe(() => {
    pulseHero(1.2);
    onStart();
    gsap.to(window, {
      duration: 0.9,
      ease: 'power2.inOut',
      scrollTo: { y: '#plan-form', offsetY: 72 },
    });
  });

  return (
    <section
      ref={scope}
      id="hero"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-ocean-950"
    >
      <div data-hero-media className="absolute inset-0">
        <HeroMediaLayer animate={capability.allowAmbientMotion} />
      </div>

      {/* 스크림 — 텍스트 대비를 확보한다.
          Hero 텍스트가 LCP 요소(S14)이므로 밝은 해변 사진 위에서도
          본문 4.5:1 을 넘기도록 좌측을 확실히 눌러 준다. */}
      {/* pointer-events-none 필수: 스크림이 이제 캔버스 위에 있으므로
          이게 없으면 3D 오브젝트 클릭이 스크림에 먹힌다. */}
      <div
        data-hero-scrim
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 'var(--z-hero-scrim)', opacity: 1 }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-ocean-950/78 via-transparent to-ocean-950/35" />
        {/* 카피 영역 집중 스크림.
            전역 그라디언트만으로는 부족했다 — 텍스트를 숨기고 배경 픽셀을 전수 조사한 결과
            가장 밝은 프레임에서 h1 2.51:1, 부제 3.40:1 로 기준(3.0 / 4.5)에 미달했다.
            카피 컨테이너 안에 두면 사각 경계가 드러나므로 Hero 전체를 덮는 방사형으로 깐다.
            사진의 오른쪽은 살아 있고 글자가 놓이는 왼쪽만 눌린다. */}
        <div
          className="absolute inset-0"
          style={{
            // 텍스트가 놓이는 폭(h1 은 뷰포트의 약 55% 까지)을 확실히 덮는다.
            // 방사형은 바깥 구간 알파가 낮아 h1 오른쪽 끝에서 대비가 무너졌다.
            // 55% 지점까지 높은 알파를 유지하고 그 뒤에서만 사진을 살린다.
            background:
              'linear-gradient(to right, rgb(10 32 56 / 0.82) 0%, rgb(10 32 56 / 0.76) 42%, rgb(10 32 56 / 0.60) 58%, rgb(10 32 56 / 0.30) 73%, rgb(10 32 56 / 0.08) 87%, transparent 96%)',
          }}
        />
      </div>

      {capability.allow3d && <HeroCanvasGate active={canvasActive} />}

      {/* pointer-events-none 이 없으면 이 컨테이너(폭 1200px)가 캔버스를 덮어
          3D 오브젝트 클릭이 아예 도달하지 못한다. 실제 콘텐츠가 있는
          안쪽 블록에서만 포인터 이벤트를 되살린다. */}
      <div
        className="pointer-events-none relative mx-auto w-full max-w-[1200px] px-5 sm:px-8"
        style={{ zIndex: 'var(--z-hero-copy)' }}
      >
        <div
          data-hero-copy
          className="pointer-events-auto relative flex max-w-[640px] flex-col gap-6"
        >
          <p className="text-sm font-bold tracking-widest text-ocean-200">
            AI 여행 큐레이션
          </p>

          <h1 className="text-display-responsive text-white">
            조건만 넣으면,
            <br />
            일자별 계획이 나옵니다
          </h1>

          <p className="max-w-[520px] text-body leading-relaxed text-white">
            여행지와 일정, 인원, 예산, 취향을 넣어 주세요. 일자별 코스와 예상 예산표,
            준비물 체크리스트, 우천 시 대안까지 한 번에 정리해 드립니다.
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <Button onClick={handleStart} className="w-full sm:w-auto">
              여행 계획 만들기
            </Button>
            <p className="text-xs text-white">
              로그인 없이 바로 사용 · 예약·결제는 제공하지 않습니다
            </p>
          </div>
        </div>
      </div>

      <HeroScrollCue />
    </section>
  );
}
