'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { heroMotion } from '@/lib/motion/scroll-progress';

/**
 * 스크롤 진행도로 카메라를 당긴다.
 *
 * heroMotion 은 GSAP 타임라인이 쓰는 평범한 가변 객체다.
 * 여기서 읽기만 하므로 스크롤 중 React 렌더가 한 번도 일어나지 않는다.
 */
export function CameraRig() {
  const { camera } = useThree();

  useFrame(() => {
    const p = heroMotion.progress;
    // z 6 -> 3.2 로 다가가며 살짝 내려다본다.
    camera.position.z = 6 - p * 2.8;
    camera.position.y = p * 0.5;
    camera.lookAt(0, 0, 0);
  });

  return null;
}
