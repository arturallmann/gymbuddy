import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const sessions = await prisma.session.findMany();
  console.log(sessions);
  return Response.json({ sessions });
}
export async function POST(req: NextRequest) {
  const body = await req.json();

  return new Response('OK');
}
