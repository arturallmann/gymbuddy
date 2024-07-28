import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const sets = await prisma.set.findMany();
  console.log(sets);
  return Response.json({ sets });
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const set = await prisma.set.create({
    data: {
      weight: body.weight,
      duration: body.duration,
      repetitions: body.repetitions,
      session_id: body.session_id,
      exercise_id: body.exercise_id,
    },
  });

  return Response.json({ set });
}
