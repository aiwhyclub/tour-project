'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { heroMotion, pulseHero } from '@/lib/motion/scroll-progress';

/**
 * 저폴리 섬 오브젝트.
 *
 * 사용자 요구(조건 1-1): 클릭하면 동적으로 반응해야 한다.
 * 클릭 시 회전 목표값을 더하고 heroMotion.impulse 를 밀어 올려
 * 주변 입자까지 함께 퍼지게 한다.
 *
 * R5: 실제 지형·좌표가 아니라 원뿔과 구로 만든 장식 형상이다.
 */
export function LowPolyIsland() {
  const group = useRef<Group>(null);
  const spinTarget = useRef(0);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    const t = state.clock.elapsedTime;
    const p = heroMotion.progress;

    // 클릭으로 쌓인 회전 목표를 부드럽게 소비한다.
    const spinStep = spinTarget.current * Math.min(1, delta * 3.2);
    spinTarget.current -= spinStep;

    g.rotation.y += delta * 0.18 + spinStep;
    // 물 위에 떠 있는 듯한 상하 운동
    g.position.y = Math.sin(t * 0.7) * 0.12 - p * 1.2;
    g.rotation.z = Math.sin(t * 0.5) * 0.04;

    // 장식 액센트이므로 화면을 지배하지 않는 크기로 유지한다.
    const base = 0.5;
    const scale = base * (hovered ? 1.06 : 1) * (1 + heroMotion.impulse * 0.12) * (1 - p * 0.25);
    g.scale.setScalar(Math.max(0.05, scale));

    // 충격은 매 프레임 감쇠시킨다.
    heroMotion.impulse *= 1 - Math.min(1, delta * 2.5);
    if (heroMotion.impulse < 0.001) heroMotion.impulse = 0;
  });

  const handleClick = () => {
    spinTarget.current += Math.PI * 2;
    pulseHero(1);
  };

  return (
    <group
      ref={group}
      position={[2.45, -0.15, 0]}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      // 캔버스 전체는 pointer-events:none 이고 이 그룹만 클릭을 받는다.
      onPointerMissed={() => setHovered(false)}
    >
      {/* 땅 — 아래가 넓은 절단 원뿔이라야 섬으로 읽힌다.
          (coneGeometry 두 개를 위아래로 붙이면 모래시계처럼 보인다) */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.78, 1.2, 0.9, 7]} />
        <meshStandardMaterial color="#1f77e0" flatShading roughness={0.65} metalness={0.05} />
      </mesh>

      {/* 물가의 모래 치마 */}
      <mesh position={[0, -0.72, 0]}>
        <cylinderGeometry args={[1.24, 1.34, 0.16, 7]} />
        <meshStandardMaterial color="#ffe9d6" flatShading roughness={0.9} />
      </mesh>

      {/* 봉우리 */}
      <mesh position={[0, 0.58, 0]}>
        <coneGeometry args={[0.62, 0.86, 6]} />
        <meshStandardMaterial color="#3897f0" flatShading roughness={0.55} />
      </mesh>

      {/* 강조색 한 방울 — 정상 표식 */}
      <mesh position={[0, 1.12, 0]}>
        <icosahedronGeometry args={[0.17, 0]} />
        <meshStandardMaterial
          color="#ff6b4a"
          flatShading
          emissive="#ff6b4a"
          emissiveIntensity={hovered ? 0.9 : 0.4}
        />
      </mesh>

      {/* 주변을 도는 위성 조각 */}
      <mesh position={[1.75, 0.75, -0.5]}>
        <icosahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color="#bfe2fe" flatShading />
      </mesh>
      <mesh position={[-1.65, 1.05, 0.35]}>
        <icosahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color="#ffffff" flatShading />
      </mesh>
    </group>
  );
}
