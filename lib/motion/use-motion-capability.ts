'use client';

import { useEffect, useState } from 'react';

/**
 * 모션 역량 감지.
 *
 * R9(하이드레이션): 감지는 전부 useEffect 안에서만 한다.
 * 서버는 언제나 가장 조용한 변형(calm)을 렌더하고, 브라우저가 마운트 후 승격한다.
 * 렌더 중에 window / matchMedia 를 읽으면 서버-클라이언트 불일치가 생기고
 * Next 15 는 이를 전체 리렌더로 처리해 GSAP 초기 상태가 날아간다.
 */
export interface MotionCapability {
  /** 마운트 전에는 false — 서버 렌더와 동일한 상태 */
  ready: boolean;
  reducedMotion: boolean;
  isDesktop: boolean;
  webgl2: boolean;
  /** 3D 캔버스를 붙여도 되는가 */
  allow3d: boolean;
  /** 배경 시퀀스를 움직여도 되는가 */
  allowAmbientMotion: boolean;
}

const INITIAL: MotionCapability = {
  ready: false,
  reducedMotion: true,
  isDesktop: false,
  webgl2: false,
  allow3d: false,
  allowAmbientMotion: false,
};

function detectWebgl2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

export function useMotionCapability(): MotionCapability {
  const [capability, setCapability] = useState<MotionCapability>(INITIAL);

  useEffect(() => {
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const webgl2 = detectWebgl2();

    const compute = () => {
      const reducedMotion = reduceQuery.matches;
      const isDesktop = desktopQuery.matches;
      setCapability({
        ready: true,
        reducedMotion,
        isDesktop,
        webgl2,
        allow3d: !reducedMotion && isDesktop && webgl2,
        allowAmbientMotion: !reducedMotion,
      });
    };

    compute();
    reduceQuery.addEventListener('change', compute);
    desktopQuery.addEventListener('change', compute);
    return () => {
      reduceQuery.removeEventListener('change', compute);
      desktopQuery.removeEventListener('change', compute);
    };
  }, []);

  return capability;
}
