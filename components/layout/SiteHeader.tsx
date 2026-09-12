'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/gsap-setup';
import { pulseHero } from '@/lib/motion/scroll-progress';

/**
 * 상단 메뉴.
 *
 * 사용자 요구(조건 1-1): 메뉴를 클릭하면 동적으로 반응해야 한다.
 * ScrollTo 로 부드럽게 이동하면서 Hero 의 3D 오브젝트에 충격을 준다.
 */
const MENU = [
  { label: '소개', href: '#hero' },
  { label: '조건 입력', href: '#plan-form' },
  { label: '결과', href: '#result' },
] as const;

export function SiteHeader() {
  const scope = useRef<HTMLElement>(null);

  const { contextSafe } = useGSAP({ scope });

  const go = contextSafe((href: string) => {
    const target = document.querySelector(href);
    if (!target) return;
    pulseHero(0.8);
    gsap.to(window, {
      duration: 0.85,
      ease: 'power2.inOut',
      scrollTo: { y: href, offsetY: 72 },
    });
  });

  return (
    <header
      ref={scope}
      className="fixed inset-x-0 top-0 z-50 border-b border-white/10 backdrop-blur-md"
      style={{
        // 밝은 해변 사진 위에서도 흰 글자가 읽히도록 어둡게 깐다.
        background:
          'linear-gradient(to bottom, rgb(10 32 56 / 0.72), rgb(10 32 56 / 0.38))',
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-5 sm:px-8">
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            go('#hero');
          }}
          className="text-sm font-extrabold tracking-tight text-white drop-shadow-sm"
        >
          여행 큐레이션
        </a>

        <nav aria-label="주요 메뉴">
          <ul className="flex items-center gap-1 sm:gap-2">
            {MENU.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    go(item.href);
                  }}
                  className="rounded-[var(--radius-chip)] px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/15 hover:text-white"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
