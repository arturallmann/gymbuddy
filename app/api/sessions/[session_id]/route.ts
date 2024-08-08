import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ID = params.id;
  const sessions = await prisma.session.findUniqueOrThrow({
    where: {
      id: ID,
    },
  });
  return Response.json({ sessions });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { date } = await req.json();
  const ID = params.id;
  const updatedSet = await prisma.session.update({
    where: {
      id: ID,
    },
    data: {
      date,
    },
  });
  return Response.json({ updatedSet });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ID = params.id;
  const sessions = await prisma.session.delete({
    where: {
      id: ID,
    },
  });
  return Response.json({ sessions });
}
