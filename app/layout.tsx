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
      <head>
        {/*
          프리로드는 LCP 직결이라 선택이 아니다. LCP 요소가 Hero 텍스트이고
          @font-face 는 CSS 파싱 뒤에야 발견되므로, 여기서 먼저 받아 두지 않으면
          swap 구간이 그만큼 길어진다.

          crossOrigin 은 같은 출처라도 반드시 있어야 한다 — 폰트는 CORS 모드로
          가져오므로, 빠지면 프리로드한 것과 별개로 한 번 더 받는다.
        */}
        <link
          rel="preload"
          href="/fonts/PretendardVariable.subset.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <a href="#main" className="skip-link">
          본문으로 건너뛰기
        </a>
        {children}
      </body>
    </html>
  );
}
