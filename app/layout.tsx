import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Test Blog',
  description: 'A statically generated blog — content-automation test harness.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  )
}
