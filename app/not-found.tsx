import Link from 'next/link';
import { Card } from '@/components/ui/Card';

/**
 * 404.
 *
 * 액션을 하나만 둔다. 여기서 예약·결제·로그인으로 이어지는 링크를 제안하면
 * 존재하지 않는 기능을 암시하는 것이고 그 자체가 S16 위반이다 (F1·F3).
 */
export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-5 py-20">
      <Card as="section" className="w-full max-w-[480px] p-8 text-center sm:p-12">
        <h1 className="text-h2 break-keep text-ink">찾으시는 페이지가 없습니다.</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          주소가 바뀌었거나 잘못 입력되었을 수 있습니다.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex items-center justify-center rounded-[var(--radius-field)] bg-ocean-700 px-6 py-3.5 text-body font-bold text-white transition-colors hover:bg-ocean-800"
        >
          처음 화면으로
        </Link>
      </Card>
    </main>
  );
}
