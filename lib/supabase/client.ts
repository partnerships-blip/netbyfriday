'use client';
import { createBrowserClient } from '@supabase/ssr';

/** Browser client. Only used for auth state; business data is always read and written on the server. */
export const createClient = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
