'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/gsap-setup';

/**
 * 사이트 푸터 — 덧붙임이 아니라 독립 설계 대상이다 (design/footer-spec.md).
 *
 * footer.design 분류: Typographic × Grid × Animated × Bright.
 *   Typographic — 상단에서 사진·3D 로 시각 자극을 다 썼으므로 하단은 대형 타이포로 닫는다
 *   Grid        — 내용 범주가 뚜렷해 카드로 또 나누지 않는다
 *   Animated    — 스크롤 진입 1회. 루프 모션은 페이지 끝에서 산만하다
 *   Bright      — Hero 가 이 페이지의 유일한 어두운 면이다. 푸터까지 어두우면 액자가 된다
 *
 * 링크 대상에 대하여. 사양 §4-1 이 제안한 앵커(/#intro, /#how, ...)는 이 앱에
 * 존재하지 않고, #plan-form·#result 는 화면 상태에 따라 있다 없다 한다. 죽은 앵커는
 * F3("존재하지 않는 문서 링크")과 같은 죄다. 그렇다고 11개 섹션을 새로 만드는 것은
 * 새 기능이다. 그래서 링크 컬럼은 "목차"로 두고, 목적지를 푸터 자신의 안내 영역에
 * 만들었다 — F-46 이 이미 요구하는 범위 고지와 에셋 출처를 항목별로 펼친 것이다.
 * 문구는 전부 프로젝트에 이미 있는 사실에서 가져왔고 새 제품 기능은 0건이다.
 */

const COLUMNS = [
  {
    title: '여행 큐레이션',
    links: [
      { label: '서비스 소개', href: '#footer-intro' },
      { label: '만드는 방식', href: '#footer-how' },
      { label: '다루지 않는 것', href: '#footer-scope' },
    ],
  },
  {
    title: '결과에 대하여',
    links: [
      { label: '추정값이란', href: '#footer-estimate' },
      { label: '확신도 표시 읽는 법', href: '#footer-confidence' },
      { label: '예산 계산 방식', href: '#footer-budget-method' },
    ],
  },
  {
    title: '만든 재료',
    links: [
      { label: '사용한 오픈소스', href: '#footer-oss' },
      // 기계 판독용 원본. 사람 판독용 표기는 아래 안내 영역에 있다 (R6).
      { label: '이미지 출처', href: '/assets-manifest.json' },
      { label: '글꼴 라이선스', href: '#footer-font-license' },
    ],
  },
  {
    title: '접근성',
    links: [
      { label: '모션 저감 지원', href: '#footer-reduced-motion' },
      { label: '키보드 조작', href: '#footer-keyboard' },
      { label: '대비 기준', href: '#footer-contrast' },
    ],
  },
] as const;

interface Note {
  id: string;
  term: string;
  body: string;
  /** 라이선스·출처처럼 줄 단위로 나열하는 부가 목록 */
  rows?: readonly string[];
  link?: { label: string; href: string };
}

const NOTE_GROUPS: readonly { title: string; notes: readonly Note[] }[] = [
  {
    title: '여행 큐레이션',
    notes: [
      {
        id: 'footer-intro',
        term: '서비스 소개',
        body: '여행지·일정·인원·예산·취향을 넣으면 일자별 코스와 예상 예산표, 준비물 체크리스트, 우천 시 대안을 한 번에 정리해 드립니다.',
      },
      {
        id: 'footer-how',
        term: '만드는 방식',
        body: '입력한 조건을 생성 모델에 넘겨 초안을 받고, 서버가 금액과 합계를 다시 계산해 확신도를 붙입니다. 결정을 대신하지 않고 결정할 재료를 정돈합니다.',
      },
      {
        id: 'footer-scope',
        term: '다루지 않는 것',
        body: '예약·결제·지도·로그인 기능을 제공하지 않습니다. 실시간 가격과 운영시간도 조회하지 않습니다.',
      },
    ],
  },
  {
    title: '결과에 대하여',
    notes: [
      {
        id: 'footer-estimate',
        term: '추정값이란',
        body: '표시된 모든 금액과 시간은 추정값입니다. 실제 가격은 시기·업체·인원에 따라 달라지므로 예약 전 직접 확인해 주세요.',
      },
      {
        id: 'footer-confidence',
        term: '확신도 표시 읽는 법',
        body: '금액과 시간에는 추정·일반 시세·미확인 중 하나가 배지로 붙습니다. "확정"은 없습니다 — 이 서비스는 가격을 보장하지 않습니다.',
      },
      {
        id: 'footer-budget-method',
        term: '예산 계산 방식',
        body: '예산표의 총계·1인당·비중은 모델이 아니라 서버가 항목 금액에서 다시 계산합니다. 1인당 금액은 요금을 내지 않는 유아를 제외한 인원으로 나눕니다.',
      },
    ],
  },
  {
    title: '만든 재료',
    notes: [
      {
        id: 'footer-oss',
        term: '사용한 오픈소스',
        body: '',
        rows: [
          'Next.js · Vercel · MIT',
          'React · Meta · MIT',
          'Tailwind CSS · Tailwind Labs · MIT',
          'GSAP · GreenSock · 표준 라이선스 (무료)',
          'Three.js · mrdoob · MIT',
          'React Three Fiber · drei · pmndrs · MIT',
          'Zod · colinhacks · MIT',
        ],
      },
      {
        id: 'footer-assets',
        term: '이미지 출처',
        body: '',
        rows: ['Hero 배경 사진 3장 · Pexels · Pexels License · 리사이즈(w=1200)·압축만 적용'],
        link: { label: '전체 목록 → assets-manifest.json', href: '/assets-manifest.json' },
      },
      {
        id: 'footer-font-license',
        term: '글꼴 라이선스',
        body: 'Pretendard · Kil Hyung-jin · SIL Open Font License 1.1. 한글 2,350자로 서브셋해 저장소에서 직접 호스팅합니다.',
        link: { label: '라이선스 전문', href: '/fonts/LICENSE.txt' },
      },
    ],
  },
  {
    title: '접근성',
    notes: [
      {
        id: 'footer-reduced-motion',
        term: '모션 저감 지원',
        body: 'OS 의 "동작 줄이기"를 켜면 스크롤 고정·패럴랙스·3D·자동 전환이 모두 꺼지고 정지 화면으로 바뀝니다. 보이는 내용과 항목 수는 그대로입니다.',
      },
      {
        id: 'footer-keyboard',
        term: '키보드 조작',
        body: 'Tab 만으로 조건 입력부터 결과 탐색까지 끝낼 수 있습니다. 처리 중 화면에서는 포커스가 오버레이 안에 머무릅니다.',
      },
      {
        id: 'footer-contrast',
        term: '대비 기준',
        body: '모든 텍스트가 WCAG AA(4.5:1) 이상입니다. Hero 텍스트는 계산값이 아니라 사진·3D 가 깔린 실제 렌더 화면에서 측정했습니다.',
      },
    ],
  },
];

/** 링크 스타일. hover 는 밑줄만 — ink-soft 가 이미 7.24 라 더 어두워질 여지가 없다 (§4-2). */
const linkClass =
  'inline-flex min-h-[44px] items-center text-sm text-ink-soft underline-offset-4 hover:underline ' +
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ocean-600';

export function SiteFooter() {
  const scope = useRef<HTMLElement>(null);

  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // calm 분기에는 타임라인 자체를 만들지 않는다 (§5-3).
      // ScrollTrigger 를 생성하지 않으므로 스크롤 중 계산 비용도 0 이다.
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: scope.current, start: 'top 88%', once: true },
        });

        // 마스크 리빌은 clip-path 로 한다. overflow:hidden 부모 + translateY 조합은
        // text-wrap·line-height 와 상호작용해 글자 위아래가 잘리는 사고가 잦다 (§5-1).
        //
        // gsap.from 만 쓴다. CSS 로 초기 opacity:0 을 두면 JS 가 실패했을 때
        // 라이선스 고지와 범위 고지가 영영 사라진다 (F7·§5-4).
        tl.from('[data-footer-line]', {
          clipPath: 'inset(100% 0 0 0)',
          y: 18,
          duration: 0.64,
          stagger: 0.08,
          ease: 'expo.out',
        })
          .from(
            '[data-footer-col]',
            { y: 20, opacity: 0, duration: 0.42, stagger: 0.12, ease: 'expo.out' },
            '-=0.4',
          )
          .from(
            '[data-footer-note]',
            { opacity: 0, duration: 0.42, stagger: 0.08, ease: 'power2.out' },
            '-=0.2',
          )
          .from('[data-footer-bar]', { opacity: 0, duration: 0.24, ease: 'power2.out' }, '-=0.2');
      });

      return () => mm.revert();
    },
    { scope },
  );

  const toTop = contextSafe(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      gsap.to(window, { duration: 0.8, ease: 'power3.inOut', scrollTo: 0 });
    }

    // A9: 스크롤만 시키고 포커스를 푸터에 남기면 키보드 사용자는 제자리다.
    // preventScroll 로 포커스가 스크롤을 가로채지 않게 해 위 트윈을 방해하지 않는다.
    document.querySelector<HTMLAnchorElement>('.skip-link')?.focus({ preventScroll: true });
  });

  return (
    <footer
      ref={scope}
      role="contentinfo"
      aria-label="푸터"
      className="mt-24 border-t border-line bg-surface-subtle"
    >
      <div className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
        {/*
          B — 대형 타이포 스테이트먼트.
          <h2> 가 아니라 <p> 다. 스테이트먼트는 제목이 아니며 문서 개요를 오염시키면 안 된다 (A2).
          제품이 "하지 않는 것"을 먼저 말한다. 이 제품의 신뢰는 범위를 정확히 말하는 데서 나온다.
        */}
        <p className="mb-14 break-keep font-bold tracking-[-0.025em] text-ink sm:mb-20 md:font-extrabold md:tracking-[-0.03em]">
          <span
            data-footer-line
            className="block text-[30px] leading-[1.25] md:text-[clamp(2rem,7vw,4.5rem)] md:leading-[1.1]"
          >
            예약도 결제도 하지 않습니다.
          </span>
          <span
            data-footer-line
            className="block text-[30px] leading-[1.25] md:text-[clamp(2rem,7vw,4.5rem)] md:leading-[1.1]"
          >
            여행을 정하기 전에 필요한
          </span>
          <span
            data-footer-line
            className="block text-[30px] leading-[1.25] md:text-[clamp(2rem,7vw,4.5rem)] md:leading-[1.1]"
          >
            {/* 강조색이 텍스트로 나타나는 유일한 자리다 (F9). surface-subtle 대비 5.10 */}
            <span className="text-accent-700">초안 한 벌</span>만 드립니다.
          </span>
        </p>

        {/* C — 링크 컬럼: 768px 이상 그리드 */}
        <nav
          aria-label="푸터"
          className="hidden border-t border-line pt-10 md:grid md:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:gap-10"
        >
          {COLUMNS.map((column) => (
            <div data-footer-col key={column.title}>
              <h3 className="text-xs font-bold tracking-wider text-ink-muted">{column.title}</h3>
              <ul className="mt-2 flex flex-col">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className={linkClass}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/*
          C — 링크 컬럼: 768px 미만 아코디언.
          <details open> 를 CSS 로 강제하지 않고 폭별로 다른 마크업을 렌더한다 (§6-1).
          open 속성 강제는 JS 없이 되돌릴 수 없다. aria-expanded 는 브라우저가 관리하므로
          수동 ARIA 를 덧붙이지 않는다 (A4).
        */}
        <nav aria-label="푸터" className="border-t border-line md:hidden">
          {COLUMNS.map((column) => (
            <details data-footer-col key={column.title} className="group border-b border-line">
              <summary className="flex h-12 cursor-pointer list-none items-center justify-between text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
                {column.title}
                {/* ＋ / − 문자 대신 직접 그린다. 서브셋 폰트에 없는 글자에 기대지 않는다. */}
                <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true">
                  <rect x="0" y="6" width="14" height="2" rx="1" fill="currentColor" />
                  <rect
                    x="6"
                    y="0"
                    width="2"
                    height="14"
                    rx="1"
                    fill="currentColor"
                    className="group-open:hidden"
                  />
                </svg>
              </summary>
              <ul className="flex flex-col pb-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className={linkClass}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </nav>

        {/*
          D + E — 안내와 에셋 출처. 위 링크 컬럼의 목적지이자, F-46 이 요구하는
          범위 고지와 사람 판독용 출처 표기(R6)를 겸한다.
          아이콘은 쓰지 않는다 — 결과 화면 면책 블록에서 이미 썼고 여기서 반복하면
          경고 피로를 만든다 (§7).
        */}
        <div className="mt-14 grid gap-x-10 gap-y-10 border-t border-line pt-10 md:grid-cols-2">
          {NOTE_GROUPS.map((group) => (
            <section data-footer-note key={group.title}>
              <h3 className="text-xs font-bold tracking-wider text-ink-muted">{group.title}</h3>
              <dl className="mt-4 flex flex-col gap-4">
                {group.notes.map((note) => (
                  // scroll-mt: 고정 헤더(64px)가 앵커 도착 지점을 가리지 않게 한다
                  <div key={note.id} id={note.id} className="scroll-mt-24">
                    <dt className="text-sm font-bold text-ink">{note.term}</dt>
                    {note.body && (
                      <dd className="mt-1 break-keep text-sm leading-relaxed text-ink-soft">
                        {note.body}
                      </dd>
                    )}
                    {note.rows && (
                      <dd className="mt-1">
                        <ul className="flex flex-col gap-0.5">
                          {note.rows.map((row) => (
                            <li key={row} className="text-xs leading-relaxed text-ink-muted">
                              {row}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    )}
                    {note.link && (
                      <dd className="mt-1">
                        <a href={note.link.href} className={linkClass + ' min-h-0 text-xs'}>
                          {note.link.label}
                        </a>
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        {/* F — 하단 바. 별도 배경 없이 border-t 로만 구분한다 (§9). */}
        <div
          data-footer-bar
          className="mt-12 flex items-center justify-between gap-4 border-t border-line pt-6"
        >
          {/* 저작권 기호와 "All rights reserved" 를 쓰지 않는다 — 그런 주장을 하지 않는다 (§9). */}
          <p className="text-xs text-ink-soft">여행 큐레이션 · 2026</p>

          <button
            type="button"
            onClick={toTop}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-ink-soft underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ocean-600"
          >
            맨 위로
            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
              <path
                d="M6 10V2M2.5 5.5L6 2l3.5 3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
