import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 서버 종류와 프레임워크를 광고할 이유가 없다. 공격자에게 버전별 알려진 취약점을
  // 골라 볼 힌트를 주는 것 말고는 쓰임이 없다 (보안 검토에서 실측: X-Powered-By: Next.js).
  poweredByHeader: false,
  // 상위 디렉터리의 package-lock.json 때문에 Next 가 워크스페이스 루트를
  // 잘못 추론한다. 이 프로젝트 디렉터리로 고정한다.
  outputFileTracingRoot: __dirname,
  experimental: {
    // drei re-exports a very large surface; tree-shake per-import.
    optimizePackageImports: ['@react-three/drei'],
  },
  async headers() {
    return [
      {
        // Hero media is content-hashed by filename and never mutated in place.
        source: '/:dir(video|images|fonts)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
