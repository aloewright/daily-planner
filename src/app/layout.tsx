import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'Daily Planner',
  description: 'Your intelligent daily planning companion',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0f0f0f] text-white min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
