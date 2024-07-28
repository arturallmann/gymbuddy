import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const sets = await prisma.set.findMany();
  console.log(sets);
  return Response.json({ sets });
}
export async function POST(req: NextRequest) {
  const body = await req.json();

  return new Response('OK');
}
