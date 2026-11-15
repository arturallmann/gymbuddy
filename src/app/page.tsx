import Link from 'next/link';
import HomeMenu from '@/components/HomeMenu';
import CalendarIcon from '@/components/icons/CalendarIcon';
import StartWorkout from '@/components/StartWorkout';
import TodaysWorkouts from '@/components/TodaysWorkouts';
import DumbbellIcon from '@/components/icons/DumbbellIcon';
import GearIcon from '@/components/icons/GearIcon';

// The home page stays clean (decision 035): the app name at the top left, the calendar, the menu and
// the settings at the top right (decision 041), "Start workout" in the middle and today's workouts below it.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-2">
        <h1 className="flex min-w-0 flex-1 items-center gap-2 text-2xl font-bold">
          <span className="text-link">
            <DumbbellIcon />
          </span>
          Gymbuddy
        </h1>
        <Link href="/calendar" aria-label="Calendar" className="rounded-lg p-2 text-link">
          <CalendarIcon />
        </Link>
        <HomeMenu />
        <Link href="/settings" aria-label="Settings" className="rounded-lg p-2 text-link">
          <GearIcon />
        </Link>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <StartWorkout />
        <TodaysWorkouts />
      </div>
    </main>
  );
}
