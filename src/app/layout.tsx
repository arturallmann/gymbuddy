import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import DatabaseProvider from '@/components/DatabaseProvider'
import SettingsProvider from '@/components/SettingsProvider'
import SetupGate from '@/components/SetupGate'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gymbuddy',
  description: 'Offline gym tracker for logging workouts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DatabaseProvider>
          <SettingsProvider>
            <SetupGate>{children}</SetupGate>
          </SettingsProvider>
        </DatabaseProvider>
      </body>
    </html>
  )
}
