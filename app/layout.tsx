import type { Metadata } from 'next';
export const metadata: Metadata={title:'핏노트 · 경험에서 시작하는 지원',description:'개발자의 경험과 공고를 출처가 있는 지원서로 연결합니다.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="ko"><body>{children}</body></html>;}
