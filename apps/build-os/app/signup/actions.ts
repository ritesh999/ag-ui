"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { bootstrapUserAfterAuth } from "@/lib/auth-bootstrap";

export async function signup(_prevState: { error?: string; checkEmail?: boolean } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return { error: error.message };
  }

  // If the Supabase project has "confirm email" enabled (the default),
  // signUp succeeds but returns no session — the user must click the
  // emailed link, which lands on /auth/callback. If confirmation is
  // disabled, a session comes back immediately and we can bootstrap and
  // go straight in.
  if (!data.session) {
    return { checkEmail: true };
  }

  await bootstrapUserAfterAuth(supabase);
  redirect("/projects");
}
