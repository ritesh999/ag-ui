import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

// For use in Server Components, Server Actions, and Route Handlers. Server
// Components can't write cookies (Next.js restriction), so the setAll
// no-op there is expected and harmless — middleware.ts is what actually
// refreshes the session cookie on navigation.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component — middleware refreshes the
            // session instead. Safe to ignore.
          }
        },
      },
    }
  );
}
