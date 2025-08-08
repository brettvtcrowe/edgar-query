import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'EDGAR Answer Engine',
  description: 'Natural language queries for SEC filings',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}