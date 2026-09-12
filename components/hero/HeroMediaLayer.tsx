'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

/**
 * Hero 배경 미디어 레이어 (z 0).
 *
 * 원래 계획은 오픈소스 배경 영상이었으나, 빌드 환경에서 Pexels 영상 CDN 이
 * 403, Pixabay 영상 경로가 404 로 접근 불가했다 (public/assets-manifest.json 의
 * notObtained 항목 참고). 그래서 같은 목적(움직이는 첫인상)을
 * GSAP·CSS 로 구동하는 Ken Burns 사진 시퀀스로 구현했다.
 *
 * 이 대체가 오히려 유리한 점:
 *   - 용량이 영상보다 훨씬 작아 성능 예산에 여유가 생긴다
 *   - 자동재생 거부(iOS 저전력 모드 등) 실패 경로가 아예 없다
 *   - LCP 요소인 Hero 텍스트를 가리지 않는다
 *
 * 영상으로 교체하려면 HERO_FRAMES 를 video 로 바꾸고
 * public/assets-manifest.json 에 출처·라이선스를 추가하면 된다.
 */
const HERO_FRAMES = [
  {
    src: '/images/hero-01-tropical-beach.jpg',
    alt: '',
    origin: 'center 55%',
  },
  {
    src: '/images/hero-02-palm-shore.jpg',
    alt: '',
    origin: 'center 60%',
  },
  {
    src: '/images/hero-03-bali-gate.jpg',
    alt: '',
    origin: 'center 45%',
  },
] as const;

const FRAME_MS = 5200;

export function HeroMediaLayer({ animate }: { animate: boolean }) {
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // 모션 저감 요청 시에는 첫 장에서 정지한다 (R7).
    if (!animate) {
      setIndex(0);
      return;
    }
    timer.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % HERO_FRAMES.length);
    }, FRAME_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [animate]);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ zIndex: 'var(--z-hero-video)' }}
      aria-hidden="true"
    >
      {HERO_FRAMES.map((frame, i) => {
        const isActive = i === index;
        return (
          <div
            key={frame.src}
            // overflow-hidden: Ken Burns 가 이미지를 1.16 배로 키우므로 여기서 잘라 둔다.
            // 상위 컨테이너의 클리핑에 의존하면 나중에 그 클리핑이 사라질 때 조용히 깨진다.
            className="absolute inset-0 overflow-hidden transition-opacity ease-[var(--ease-out-soft)]"
            style={{
              opacity: isActive ? 1 : 0,
              transitionDuration: animate ? '1600ms' : '0ms',
            }}
          >
            <Image
              src={frame.src}
              alt={frame.alt}
              fill
              // 첫 장은 LCP 경로에 있으므로 우선 로드한다.
              priority={i === 0}
              sizes="100vw"
              quality={72}
              className={
                'object-cover ' +
                (animate ? 'hero-kenburns' : '') +
                (isActive && animate ? ' hero-kenburns-active' : '')
              }
              style={{ objectPosition: frame.origin }}
            />
          </div>
        );
      })}
    </div>
  );
}
