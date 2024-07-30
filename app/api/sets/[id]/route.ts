import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ID = params.id;
  const sets = await prisma.set.findUniqueOrThrow({
    where: {
      id: ID,
    },
  });
  return Response.json({ sets });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { weight, duration, repetitions, session_id, exercise_id } =
    await req.json();
  const ID = params.id;
  const updatedSet = await prisma.set.update({
    where: {
      id: ID,
    },
    data: {
      weight,
      duration,
      repetitions,
      session_id,
      exercise_id,
    },
  });
  return Response.json({ updatedSet });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ID = params.id;
  const sets = await prisma.set.delete({
    where: {
      id: ID,
    },
  });
  return Response.json({ sets });
}
