import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ID = params.id;
  const bodyparts = await prisma.bodypart.findUniqueOrThrow({
    where: {
      id: ID,
    },
  });
  return Response.json({ bodyparts });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { name } = await req.json();
  const ID = params.id;
  const updatedBodypart = await prisma.bodypart.update({
    where: {
      id: ID,
    },
    data: {
      name,
    },
  });
  return Response.json({ updatedBodypart });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ID = params.id;
  const bodyparts = await prisma.bodypart.delete({
    where: {
      id: ID,
    },
  });
  return Response.json({ bodyparts });
}
