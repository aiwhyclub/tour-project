'use client';

import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';

/**
 * Flip 플러그인만 따로 떼어 둔 모듈.
 *
 * gsap-setup.ts 는 헤더·푸터·로딩·결과 등 거의 모든 화면이 import 한다. 거기에
 * Flip 을 두면 유일한 소비자가 DayCard 하나인데도 Flip 이 초기 청크에 들어간다.
 * 이 파일을 DayCard 만 import 하므로 Flip 은 결과 화면 청크로 따라간다.
 *
 * 등록을 import 시점에 한다. 플러그인이 등록되지 않아도 GSAP 은 던지지 않고
 * 경고만 내고 넘어가므로, 등록이 늦으면 애니메이션이 "조용히" 사라진다
 * (gsap-setup.ts 주석에 같은 사고가 기록돼 있다).
 */
let registered = false;

if (!registered && typeof window !== 'undefined') {
  gsap.registerPlugin(Flip);
  registered = true;
}

export { Flip };
