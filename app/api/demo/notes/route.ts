import { NextResponse, type NextRequest } from 'next/server';

import { queryDemoNotes, upsertDemoNotes } from '@/utils/query';

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const user = searchParams.get('user');
  if (!user) {
    return new Response(
      JSON.stringify({
        code: 1,
        msg: 'user is required',
      }),
    );
  }
  const data = await queryDemoNotes(user);
  console.log('data', data);

  return new Response(
    JSON.stringify({
      code: 0,
      msg: 'ok',
      data: data,
    }),
  );
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, text, user } = body;
  const data = await upsertDemoNotes({ title, text, user_id: user });
  return new Response(
    JSON.stringify({
      code: 0,
      msg: 'ok',
      data: data,
    }),
  );
}
