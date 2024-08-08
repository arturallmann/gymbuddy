import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ID = params.id;
  const exercises = await prisma.exercise.findUniqueOrThrow({
    where: {
      id: ID,
    },
  });
  return Response.json({ exercises });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { name, format, bodypart_id } = await req.json();
  const ID = params.id;
  const updatedExercise = await prisma.exercise.update({
    where: {
      id: ID,
    },
    data: {
      name,
      format,
      bodypart_id,
    },
  });
  return Response.json({ updatedExercise });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ID = params.id;
  const exercises = await prisma.exercise.delete({
    where: {
      id: ID,
    },
  });
  return Response.json({ exercises });
}
