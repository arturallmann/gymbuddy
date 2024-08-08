import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const bodyparts = await prisma.bodypart.findMany();
  console.log(bodyparts);
  return Response.json({ bodyparts });
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const bodypart = await prisma.bodypart.create({
    data: {
      name: body.name,
    },
  });
  return Response.json({ bodypart });
}
