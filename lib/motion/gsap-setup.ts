'use client';

import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

/**
 * GSAP 플러그인 등록.
 * (GSAP 은 Webflow 후원으로 ScrollTrigger·Flip·ScrollTo 포함 전체가 무료다.)
 *
 * 모듈 로드 시점에 등록한다 — useEffect 안에서 등록하면 늦다.
 * React 는 자식의 effect 를 부모보다 먼저 실행하므로, Provider 의 effect 에서
 * 등록하면 그 아래 컴포넌트의 useGSAP 이 이미 실행된 뒤가 된다.
 * 실제로 그렇게 했더니 푸터의 ScrollTrigger 가 조용히 무시되고
 * ("Invalid property scrollTrigger ... Missing plugin?") 스크롤 진입 연출이
 * 마운트 즉시 재생되어 버렸다.
 */
let registered = false;

function register(): void {
  if (registered || typeof window === 'undefined') return;
  gsap.registerPlugin(useGSAP, ScrollTrigger, Flip, ScrollToPlugin);
  // iOS 주소창이 접히며 발생하는 리사이즈로 트리거가 재계산되는 것을 막는다.
  ScrollTrigger.config({ ignoreMobileResize: true });
  registered = true;
}

// 이 모듈을 import 하는 것만으로 등록이 끝난다.
register();

/** 하위 호환용. 이미 등록되어 있으면 아무 일도 하지 않는다. */
export function registerGsap(): void {
  register();
}

export { gsap, ScrollTrigger, Flip, ScrollToPlugin, useGSAP };
