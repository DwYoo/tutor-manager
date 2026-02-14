import './globals.css'
import AuthProvider from '@/components/AuthProvider'

export const metadata = {
  title: '과외 매니저',
  description: '과외 선생님을 위한 올인원 관리 도구',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}