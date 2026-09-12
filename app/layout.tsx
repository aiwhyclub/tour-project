import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '여행 큐레이션 — 조건을 넣으면 일자별 계획이 나옵니다',
  description:
    '여행지, 일정, 인원, 예산, 스타일을 넣으면 일자별 코스와 예상 예산표, 준비물, 우천 시 대안을 한 번에 만들어 드립니다.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a5fbe',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <a href="#main" className="skip-link">
          본문으로 건너뛰기
        </a>
        {children}
      </body>
    </html>
  );
}
