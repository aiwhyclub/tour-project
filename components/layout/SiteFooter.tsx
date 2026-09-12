'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/gsap-setup';

/**
 * 사이트 푸터.
 *
 * footer.design 의 분류 체계를 기준으로 설계했다:
 *   Typographic — 대형 타이포 스테이트먼트가 푸터의 주인공이다
 *   Grid        — 링크·정보를 그리드 컬럼으로 나눈다
 *   Animated    — 스크롤 진입 시 글자와 컬럼이 순차로 올라온다
 *   Bright      — 어두운 푸터가 아니라 밝은 배경을 유지해 본문과 이어지게 한다
 *
 * 푸터를 "페이지 끝에 붙이는 것"이 아니라 독립 설계 대상으로 다룬다는 것이
 * footer.design 이 주장하는 바이고, 이 파일은 그 주장을 따른다.
 *
 * 내용 원칙: 제공하지 않는 기능(예약·결제·로그인)으로 가는 가짜 링크를 두지 않는다.
 * 대신 무엇을 제공하지 않는지 명시한다.
 */

const NAV_COLUMNS = [
  {
    title: '서비스',
    links: [
      { label: '여행 계획 만들기', href: '#plan-form' },
      { label: '결과 예시 보기', href: '#result' },
      { label: '맨 위로', href: '#hero' },
    ],
  },
  {
    title: '결과에 담기는 것',
    links: [
      { label: '여행 요약', href: '#result' },
      { label: '일자별 코스', href: '#result' },
      { label: '예상 예산표', href: '#result' },
      { label: '준비물 · 우천 대안', href: '#result' },
    ],
  },
] as const;

const NOT_PROVIDED = ['예약', '결제', '실시간 가격 보장', '지도 연동', '로그인'] as const;

export function SiteFooter() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          calm: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const { calm } = ctx.conditions as Record<string, boolean>;

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: scope.current,
              start: 'top 85%',
              once: true,
            },
          });

          // 대형 타이포가 줄 단위로 올라온다 — footer.design 의 Typographic + Animated
          tl.from('[data-footer-line]', {
            yPercent: calm ? 0 : 110,
            opacity: calm ? 0 : 1,
            duration: calm ? 0.15 : 0.85,
            stagger: calm ? 0 : 0.09,
            ease: 'power3.out',
          }).from(
            '[data-footer-col]',
            {
              opacity: 0,
              y: calm ? 0 : 18,
              duration: calm ? 0.15 : 0.5,
              stagger: calm ? 0 : 0.07,
              ease: 'power2.out',
            },
            calm ? 0 : '-=0.45',
          );
        },
      );

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <footer
      ref={scope}
      className="mt-24 border-t border-line bg-surface-subtle"
      aria-labelledby="footer-statement"
    >
      <div className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
        {/* --- 대형 타이포 스테이트먼트 --- */}
        <h2 id="footer-statement" className="mb-14 sm:mb-20">
          <span className="block overflow-hidden">
            <span
              data-footer-line
              className="block text-[clamp(2rem,7vw,4.5rem)] font-extrabold leading-[1.1] tracking-[-0.035em] text-ink"
            >
              다음 여행지는
            </span>
          </span>
          <span className="block overflow-hidden">
            <span
              data-footer-line
              className="block text-[clamp(2rem,7vw,4.5rem)] font-extrabold leading-[1.1] tracking-[-0.035em] text-ocean-600"
            >
              어디인가요?
            </span>
          </span>
        </h2>

        {/* --- 그리드 컬럼 --- */}
        <div className="grid gap-10 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4">
          <div data-footer-col className="lg:col-span-1">
            <p className="text-sm font-extrabold tracking-tight text-ink">여행 큐레이션</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              조건을 넣으면 검토·수정할 수 있는 일정 초안을 만들어 드립니다. 결정을 대신하지
              않고, 결정할 재료를 정돈해 드립니다.
            </p>
          </div>

          {NAV_COLUMNS.map((column) => (
            <nav data-footer-col key={column.title} aria-label={column.title}>
              <p className="mb-4 text-xs font-bold tracking-wider text-ink-muted">
                {column.title}
              </p>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ocean-700 hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div data-footer-col>
            <p className="mb-4 text-xs font-bold tracking-wider text-ink-muted">
              제공하지 않는 것
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {NOT_PROVIDED.map((item) => (
                <li
                  key={item}
                  className="rounded-[var(--radius-chip)] border border-line-strong bg-surface px-2.5 py-1 text-xs text-ink-muted"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              결과에 표시되는 금액과 시간은 모두 추정값이며 보장되지 않습니다.
            </p>
          </div>
        </div>

        {/* --- 하단 바: 에셋 출처 --- */}
        <div
          data-footer-col
          className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            사진 출처{' '}
            <a
              href="https://www.pexels.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-ocean-700"
            >
              Pexels
            </a>{' '}
            · Pexels License (출처 표기 의무 없음, 자발적 표기)
          </p>
          <p>AI가 생성한 참고용 일정입니다. 중요한 항목은 직접 확인해 주세요.</p>
        </div>
      </div>
    </footer>
  );
}
