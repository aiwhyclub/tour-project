'use client';

import dynamic from 'next/dynamic';

/**
 * 3D 청크의 유일한 진입점.
 *
 * next/dynamic({ ssr: false }) 는 Next 15 의 서버 컴포넌트에서 호출하면 throw 한다.
 * 이 파일이 'use client' 를 달고 그 호출을 독점하므로 그 사고가 구조적으로 막힌다.
 *
 * 아래에는 이미 사진 레이어가 깔려 있으므로 로딩 중에는 아무것도 그리지 않는다.
 */
const HeroCanvas = dynamic(() => import('@/components/three/HeroCanvas'), {
  ssr: false,
  loading: () => null,
});

export function HeroCanvasGate({ active }: { active: boolean }) {
  return (
    <div
      data-hero-canvas
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 'var(--z-hero-canvas)' }}
      aria-hidden="true"
    >
      {/* 캔버스 자체는 클릭을 받아야 하므로 내부에서 다시 켠다 */}
      <div className="pointer-events-auto h-full w-full">
        <HeroCanvas active={active} />
      </div>
    </div>
  );
}
