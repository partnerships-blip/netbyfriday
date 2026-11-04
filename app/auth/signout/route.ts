import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  await createClient().auth.signOut();
  cookies().delete('ci_demo');
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
