import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import BackButtonListener from '@/components/app/BackButtonListener'
import DatabaseProvider from '@/components/app/DatabaseProvider'
import LibraryUpdater from '@/components/app/LibraryUpdater'
import SettingsProvider from '@/components/app/SettingsProvider'
import SetupGate from '@/components/app/SetupGate'

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
        <BackButtonListener />
        <DatabaseProvider>
          <LibraryUpdater />
          <SettingsProvider>
            <SetupGate>{children}</SetupGate>
          </SettingsProvider>
        </DatabaseProvider>
      </body>
    </html>
  )
}
