import './globals.css'

export const metadata = {
  title: '과외 매니저',
  description: '과외 선생님을 위한 올인원 관리 도구',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}