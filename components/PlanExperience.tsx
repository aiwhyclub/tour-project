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
import { Reveal } from '@/components/motion/Reveal';
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
  //  - 스크롤 재배치: 결과가 도착하면 그 영역을 화면에 올려 준다.
  const firstRender = useRef(true);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      ScrollTrigger.refresh();

      if (firstRender.current) {
        firstRender.current = false;
        return;
      }

      // 로딩은 fixed 오버레이라 스크롤할 대상이 없다. 게다가 오버레이 뒤를
      // 몰래 스크롤해 두면 취소했을 때 엉뚱한 위치에서 깨어난다.
      if (state.phase === 'loading') return;

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

  const loading = state.phase === 'loading';

  // 오버레이 뒤에 무엇을 남길지. 로딩 중에도 아래 화면을 언마운트하지 않는다
  // — 그래야 폼의 입력값이 실제로 보존되고(S4), 뒤 화면이 오버레이의 배경이 된다.
  const showForm = state.phase === 'input' || (loading && state.returnTo === 'input');
  const showResult =
    state.plan !== null &&
    (state.phase === 'result' || (loading && state.returnTo === 'result'));

  return (
    <MotionProvider>
      {/*
        inert 하나가 포커스 트랩이다. React 19 가 boolean prop 으로 지원하며,
        상호작용과 접근성 트리를 통째로 막아 준다. 키다운을 가로채 Tab 을
        순환시키는 코드를 쓰지 않는다 — 그 방식은 늘 첫/마지막 포커스 가능
        요소를 잘못 계산하는 사고가 난다.
      */}
      <div inert={loading}>
        <a href="#main" className="skip-link">
          본문으로 건너뛰기
        </a>

        <SiteHeader />

        <main id="main">
          <HeroSection onStart={scrollToForm} />

          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
            {showForm && (
              <Section
                id="plan-form"
                title="어떤 여행을 계획하고 계신가요?"
                description="조건을 채우고 버튼을 누르면 일자별 코스와 예상 예산표, 준비물, 우천 시 대안을 한 번에 만들어 드립니다."
              >
                {/* 스크롤 진입 연출 (E1-S09 · F-35). gsap.from 이라 JS 가 실패해도 폼은 보인다. */}
                <Reveal>
                  <PlanForm
                    initial={state.lastRequest}
                    serverFieldErrors={state.error?.fields ?? null}
                    submitting={loading}
                    onSubmit={handleSubmit}
                  />
                </Reveal>
              </Section>
            )}

            {state.phase === 'error' && state.error && (
              <Section id="plan-form">
                <ErrorView
                  error={state.error}
                  request={state.lastRequest}
                  onRetry={handleRetry}
                  onEdit={editConditions}
                />
              </Section>
            )}

            {showResult && state.plan && (
              <Section id="result">
                <ResultView
                  plan={state.plan}
                  onEdit={editConditions}
                  onRegenerate={handleRetry}
                  busy={loading}
                />
              </Section>
            )}
          </div>
        </main>

        <SiteFooter />
      </div>

      {/* 오버레이는 inert 서브트리 "밖"의 형제여야 한다. 안에 있으면 자기 자신도 막힌다. */}
      {loading && <LoadingView request={state.lastRequest} onCancel={handleCancel} />}
    </MotionProvider>
  );
}
