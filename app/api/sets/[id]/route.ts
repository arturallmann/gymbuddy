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
