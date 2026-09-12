'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/motion/gsap-setup';
import { Button } from '@/components/ui/Button';
import { InputSummary } from '@/components/state/InputSummary';
import type { PlanRequestInput } from '@/lib/validation/plan-request';

/**
 * 처리 중 오버레이 (E2-S06 · design/screen-states.md §3).
 *
 * 전체 화면을 덮되 뒤의 화면을 언마운트하지 않는다. 포커스 가둠은
 * PlanExperience 가 형제 요소에 걸어 주는 `inert` 가 담당한다 — React 19 의
 * 네이티브 boolean prop 이라 키다운을 순환시키는 코드를 한 줄도 쓰지 않는다.
 *
 * 단계 문구는 setTimeout 으로 돌린다. 모션이 아니라 콘텐츠이기 때문이다.
 * 이전 구현은 GSAP 오퍼시티 stagger 였는데 두 가지가 틀렸다.
 *   (1) 1.1초 간격 페이드일 뿐 사양의 0/4/9/20초 전환이 아니었다.
 *   (2) 동작 줄이기에서 GSAP 분기를 통째로 건너뛰어 문구가 영영 진행되지 않았다
 *       (4개 중 3개가 opacity 0.25 로 고정). S12 는 모션을 꺼도 콘텐츠가
 *       동일할 것을 요구한다.
 */
const STEPS = [
  { at: 0, text: '조건을 정리하고 있어요' },
  { at: 4_000, text: '일자별 동선을 잡고 있어요' },
  { at: 9_000, text: '예산을 계산하고 있어요' },
  { at: 20_000, text: '준비물과 우천 대안을 챙기고 있어요' },
] as const;

export function LoadingView({
  request,
  onCancel,
}: {
  request: PlanRequestInput | null;
  onCancel: () => void;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [stepIndex, setStepIndex] = useState(0);

  // 오버레이가 열리면 포커스를 안으로 가져오고, 닫히면 원래 자리로 돌려준다.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const timers = STEPS.slice(1).map((step, i) =>
      window.setTimeout(() => setStepIndex(i + 1), step.at),
    );
    return () => timers.forEach(window.clearTimeout);
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.to('[data-loading-dot]', {
          y: -8,
          duration: 0.5,
          stagger: { each: 0.12, repeat: -1, yoyo: true },
          ease: 'power1.inOut',
        });
      });
      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-title"
      // inset-0 + px-5 만 쓴다. 고정 폭이나 음수 마진을 두면 390px 에서
      // 가로 스크롤이 생긴다 (S9).
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--color-surface)_96%,transparent)] px-5 py-16 backdrop-blur-[8px]"
    >
      <div
        ref={scope}
        className="mx-auto flex min-h-full max-w-[640px] flex-col items-center justify-center gap-7 text-center"
      >
        {/* 퍼센트를 표시하지 않는다. 모델 진행률을 알 수 없으므로 숫자를 지어내면 거짓말이 된다. */}
        <div className="flex gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              data-loading-dot
              className="h-3 w-3 rounded-full bg-ocean-500"
            />
          ))}
        </div>

        <div>
          <h2 id="loading-title" className="text-h2 break-keep text-ink">
            여행 계획을 만들고 있어요
          </h2>
          <p className="mt-2 text-sm text-ink-soft">보통 10초에서 30초 정도 걸립니다.</p>
        </div>

        <p className="text-sm text-ink-muted" role="status" aria-live="polite">
          {STEPS[stepIndex]?.text}
        </p>

        <InputSummary request={request} />

        <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}
