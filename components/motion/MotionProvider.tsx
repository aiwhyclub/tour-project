'use client';

import { useEffect, type ReactNode } from 'react';
import { registerGsap } from '@/lib/motion/gsap-setup';

/**
 * GSAP 플러그인 등록 지점.
 * 클라이언트 트리 최상단에서 정확히 한 번만 실행된다.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerGsap();
  }, []);

  return <>{children}</>;
}
