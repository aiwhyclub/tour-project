'use client';

import { useEffect } from 'react';
import { ERROR_SPECS } from '@/lib/errors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * 렌더 타임 크래시를 잡는 프레임워크 경계.
 *
 * 화면 상태 기계(lib/state/plan-machine.ts)가 담당하는 것은 "계획 생성 플로우"의
 * 로딩·오류다. 이 파일은 그 바깥, 즉 컴포넌트가 렌더 도중 던지는 예외를 잡는다.
 * 중복이 아니라 층이 다르다.
 *
 * error.message 를 절대 렌더하지 않는다 (R2·SEC4). 내부 오류 원문에는 파일 경로나
 * 상류 응답 조각이 섞일 수 있다. 문구는 ERROR_SPECS.INTERNAL 을 그대로 쓴다 —
 * 인앱 오류 화면과 목소리를 하나로 유지한다.
 */
export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 서버 로그로 이미 나간 것과 별개로, 브라우저에서 무슨 일이 있었는지는
    // digest 로만 식별한다. 원문은 남기지 않는다.
    if (error.digest) console.error('render error digest:', error.digest);
  }, [error.digest]);

  const spec = ERROR_SPECS.INTERNAL;

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-5 py-20">
      <Card as="section" className="w-full max-w-[480px] p-8 text-center sm:p-12">
        <div role="alert">
          <h1 className="text-h2 break-keep text-ink">{spec.message}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{spec.detail}</p>
        </div>

        <div className="mt-7 flex flex-col items-center gap-3">
          <Button onClick={reset}>다시 시도</Button>
          {/* Next 가 만든 해시 식별자. 키도 경로도 들어 있지 않다. */}
          {error.digest && <p className="text-xs text-ink-muted">오류 식별자 {error.digest}</p>}
        </div>
      </Card>
    </main>
  );
}
