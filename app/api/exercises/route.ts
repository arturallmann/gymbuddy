import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const exercises = await prisma.exercise.findMany();
  console.log(exercises);
  return Response.json({ exercises });
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const exercise = await prisma.exercise.create({
    data: {
      name: body.name,
      format: body.format,
      bodypart_id: body.bodypart_id,
    },
  });
  return Response.json({ exercise });
}
