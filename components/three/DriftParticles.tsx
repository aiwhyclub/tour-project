'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Points } from 'three';
import { AdditiveBlending, BufferAttribute, BufferGeometry } from 'three';
import { heroMotion } from '@/lib/motion/scroll-progress';

const COUNT = 900; // 성능 예산: 4,000개 이하

/** 바다 위 물보라 같은 부유 입자. 좌표 데이터가 아니라 순수 장식이다 (R5). */
export function DriftParticles() {
  const ref = useRef<Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      seeds[i] = Math.random();
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    return geo;
  }, []);

  useFrame((state) => {
    const points = ref.current;
    if (!points) return;

    const t = state.clock.elapsedTime;
    const p = heroMotion.progress;

    points.rotation.y = t * 0.02 + p * 0.6;
    points.rotation.x = p * 0.2;
    // 스크롤이 진행될수록 입자가 퍼지며 옅어진다.
    const spread = 1 + p * 0.5 + heroMotion.impulse * 0.35;
    points.scale.set(spread, spread, spread);

    const material = points.material as { opacity: number };
    material.opacity = Math.max(0, 0.5 - p * 0.44);
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.03}
        sizeAttenuation
        color="#ffffff"
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
