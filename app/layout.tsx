import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'LogiMap | 물류센터 지도 플랫폼',
  description: '전국 물류센터 정보를 한눈에 확인하는 부동산 인텔리전스 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <Script
          src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=1218f10d9e846d77e85cbcd1ea7f2495&autoload=false"
          strategy="beforeInteractive"
        />
      </head>
      <body style={{ minHeight: '100vh', backgroundColor: '#F5F7FA', color: '#0B2545' }}>
        {children}
      </body>
    </html>
  );
}