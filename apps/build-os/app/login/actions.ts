"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { bootstrapUserAfterAuth } from "@/lib/auth-bootstrap";

export async function login(_prevState: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? "/projects");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  await bootstrapUserAfterAuth(supabase);
  redirect(redirectTo || "/projects");
}
