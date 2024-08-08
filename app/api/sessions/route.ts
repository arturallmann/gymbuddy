import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const sessions = await prisma.session.findMany();
  console.log(sessions);
  return Response.json({ sessions });
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const session = await prisma.session.create({
    data: {
      date: body.date,
    },
  });
  return Response.json({ session });
}
