'use client';

// 루트 레이아웃을 대체하므로 globals.css 를 직접 가져와야 한다.
// 빠뜨리면 Tailwind 가 통째로 없는 맨 HTML 이 나온다.
import './globals.css';

/**
 * 루트 레이아웃 자체가 렌더에 실패했을 때의 마지막 방어선.
 *
 * app/error.tsx 와 달리 자기 <html>·<body> 를 직접 그린다. 여기서는 프로젝트의
 * 공용 컴포넌트를 쓰지 않는다 — 그 컴포넌트 때문에 실패했을 수도 있다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <main className="flex min-h-dvh items-center justify-center px-5 py-20">
          <div
            role="alert"
            className="w-full max-w-[480px] rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center sm:p-12"
          >
            <h1 className="text-h2 break-keep text-ink">예기치 못한 문제가 발생했습니다.</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              잠시 후 다시 시도해 주세요.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-7 inline-flex items-center justify-center rounded-[var(--radius-field)] bg-ocean-700 px-6 py-3.5 text-body font-bold text-white"
            >
              다시 시도
            </button>
            {error.digest && (
              <p className="mt-4 text-xs text-ink-muted">오류 식별자 {error.digest}</p>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
