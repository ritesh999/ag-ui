import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bootstrapUserAfterAuth } from "@/lib/auth-bootstrap";

// Landing point for Supabase's email-confirmation (and, later, magic
// link / OAuth) redirects — exchanges the one-time code for a real
// session, then runs the same post-auth bootstrap as login/signup.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await bootstrapUserAfterAuth(supabase);
      return NextResponse.redirect(`${origin}/projects`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
