import Link from 'next/link';
import StartWorkout from '@/components/StartWorkout';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-3xl font-bold">Gymbuddy</h1>
      <p className="text-gray-500">Log your workouts. Works offline.</p>
      <div className="mt-6">
        <StartWorkout />
      </div>
      <Link href="/settings" className="mt-6 text-sky-600">
        Settings
      </Link>
    </main>
  );
}
