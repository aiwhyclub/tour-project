'use client';

import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import { useCallback, useState } from 'react';
import { LowPolyIsland } from './LowPolyIsland';
import { DriftParticles } from './DriftParticles';
import { CameraRig } from './CameraRig';

/**
 * Hero 의 3D 레이어.
 *
 * R5: 좌표·지도 타일·Geo API 를 일절 쓰지 않는 장식 비주얼이다. 지도 연동이 아니다.
 * R2(번들): three / @react-three/* 를 import 하는 것은 components/three/** 뿐이며,
 *           이 파일은 HeroCanvasGate 에서 dynamic(ssr:false) 로만 로드된다.
 *           따라서 초기 번들에 3D 코드가 들어가지 않는다.
 *
 * 성능: 그림자·포스트프로세싱·환경맵 없음. dpr 상한 1.5.
 *       Hero 가 화면 밖이면 frameloop 을 멈춰 GPU 를 놓아준다.
 */
export default function HeroCanvas({ active }: { active: boolean }) {
  const [contextLost, setContextLost] = useState(false);

  const handleCreated = useCallback(
    ({ gl }: { gl: { domElement: HTMLCanvasElement } }) => {
      const canvas = gl.domElement;
      const onLost = (event: Event) => {
        // 기본 동작을 막지 않으면 복구 자체가 불가능해진다.
        event.preventDefault();
        setContextLost(true);
      };
      canvas.addEventListener('webglcontextlost', onLost);
    },
    [],
  );

  // 컨텍스트를 잃으면 캔버스를 통째로 내려 아래의 사진 레이어가 그대로 보이게 한다.
  if (contextLost) return null;

  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.5]}
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      camera={{ fov: 45, position: [0, 0, 6] }}
      onCreated={handleCreated}
      // 캔버스는 클릭을 받아야 3D 오브젝트가 반응한다.
      // z-order 상 텍스트·CTA(z 30)가 캔버스(z 20) 위에 있으므로
      // 버튼 클릭을 가로채지 않는다.
      style={{ pointerEvents: 'auto' }}
    >
      <AdaptiveDpr pixelated />
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 5, 4]} intensity={1.8} color="#ffd9c7" />
      <directionalLight position={[-4, -2, -3]} intensity={0.6} color="#9ad4ff" />

      <CameraRig />
      <DriftParticles />
      <LowPolyIsland />
    </Canvas>
  );
}
