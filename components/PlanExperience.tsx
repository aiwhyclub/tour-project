'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePlanMachine } from '@/lib/state/plan-machine';
import type { PlanRequestInput } from '@/lib/validation/plan-request';
import type { PlanResponse } from '@/types/api';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Section } from '@/components/layout/Section';
import { HeroSection } from '@/components/hero/HeroSection';
import { PlanForm } from '@/components/form/PlanForm';
import { LoadingView } from '@/components/state/LoadingView';
import { ErrorView } from '@/components/state/ErrorView';
import { ResultView } from '@/components/result/ResultView';
import { ScrollTrigger } from '@/lib/motion/gsap-setup';

/**
 * 클라이언트 트리의 최상단. 화면 상태 기계를 소유한다.
 *
 * app/layout.tsx 와 app/page.tsx 는 서버 컴포넌트로 남고,
 * 클라이언트 JS 비용은 여기부터 발생한다.
 */
export function PlanExperience() {
  const { state, submit, succeed, fail, editConditions, retry, cancel } = usePlanMachine();
  const abortRef = useRef<AbortController | null>(null);

  const runGeneration = useCallback(
    async (request: PlanRequestInput) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        const payload = (await response.json()) as PlanResponse;

        if (payload.ok) {
          succeed(payload.data);
        } else {
          fail({
            code: payload.error.code,
            message: payload.error.message,
            retryable: payload.error.retryable,
            fields: payload.error.fields,
          });
        }
      } catch {
        // 취소로 인한 중단은 오류가 아니다.
        if (controller.signal.aborted) return;
        fail({
          code: 'INTERNAL',
          message: '네트워크 연결을 확인해 주세요.',
          retryable: true,
          fields: null,
        });
      }
    },
    [succeed, fail],
  );

  const handleSubmit = useCallback(
    (request: PlanRequestInput) => {
      submit(request);
      void runGeneration(request);
    },
    [submit, runGeneration],
  );

  const handleRetry = useCallback(() => {
    if (!state.lastRequest) return;
    retry();
    void runGeneration(state.lastRequest);
  }, [state.lastRequest, retry, runGeneration]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    cancel();
  }, [cancel]);

  const scrollToForm = useCallback(() => {
    // Hero CTA 가 이동을 담당하므로 여기서는 상태만 보장한다.
    if (state.phase !== 'input') editConditions();
  }, [state.phase, editConditions]);

  // 화면 상태가 바뀌면 문서 높이가 크게 달라진다.
  //  - ScrollTrigger.refresh(): 갱신하지 않으면 아래쪽 트리거 위치가 어긋난다 (R3)
  //  - 스크롤 재배치: 입력 폼(긴 화면)에서 로딩(짧은 화면)으로 바뀌면 문서가 줄어들어
  //    기존 스크롤 위치가 푸터에 걸린다. 사용자가 로딩·결과 대신 푸터를 보게 되므로
  //    상태 전환 때마다 해당 영역을 화면에 올려 준다.
  const firstRender = useRef(true);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      ScrollTrigger.refresh();

      if (firstRender.current) {
        firstRender.current = false;
        return;
      }

      const anchorId = state.phase === 'result' ? '#result' : '#plan-form';
      const anchor = document.querySelector(anchorId);
      if (!anchor) return;

      const top = anchor.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      });
    });
    return () => cancelAnimationFrame(id);
  }, [state.phase]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <MotionProvider>
      <SiteHeader />

      <main id="main">
        <HeroSection onStart={scrollToForm} />

        <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
          {state.phase === 'input' && (
            <Section
              id="plan-form"
              title="어떤 여행을 계획하고 계신가요?"
              description="조건을 채우고 버튼을 누르면 일자별 코스와 예상 예산표, 준비물, 우천 시 대안을 한 번에 만들어 드립니다."
            >
              <PlanForm
                initial={state.lastRequest}
                serverFieldErrors={state.error?.fields ?? null}
                submitting={false}
                onSubmit={handleSubmit}
              />
            </Section>
          )}

          {state.phase === 'loading' && (
            <Section id="plan-form">
              <LoadingView onCancel={handleCancel} />
            </Section>
          )}

          {state.phase === 'error' && state.error && (
            <Section id="plan-form">
              <ErrorView
                error={state.error}
                onRetry={handleRetry}
                onEdit={editConditions}
              />
            </Section>
          )}

          {state.phase === 'result' && state.plan && (
            <Section id="result">
              <ResultView
                plan={state.plan}
                onEdit={editConditions}
                onRegenerate={handleRetry}
                busy={false}
              />
            </Section>
          )}
        </div>
      </main>

      <SiteFooter />
    </MotionProvider>
  );
}
