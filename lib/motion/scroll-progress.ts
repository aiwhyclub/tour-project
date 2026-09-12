/**
 * GSAP → R3F 브리지.
 *
 * 핵심 결정: 스크롤마다 React state 를 갱신하면 프레임당 리렌더가 발생한다.
 * 대신 평범한 가변 모듈 객체를 두고 GSAP 타임라인이 여기에 쓰고,
 * useFrame 이 여기서 읽는다. 스크롤 중 React 렌더는 0 회이며,
 * 영상·3D·텍스트가 하나의 스크럽 타임라인을 공유하므로 위상이 절대 어긋나지 않는다.
 */
export const heroMotion = {
  /** 0~1. Hero 스크럽 진행도 */
  progress: 0,
  /** 클릭 등으로 주는 순간 충격. useFrame 에서 감쇠시킨다. */
  impulse: 0,
};

export function pulseHero(strength = 1): void {
  heroMotion.impulse = Math.min(1.5, heroMotion.impulse + strength);
}

export function resetHeroMotion(): void {
  heroMotion.progress = 0;
  heroMotion.impulse = 0;
}
