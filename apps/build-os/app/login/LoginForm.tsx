"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login } from "./actions";
import { Button, Card, FormField, Input } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(login, undefined);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect_to") ?? "/projects";

  return (
    <Card className="w-full max-w-sm">
      <h1 className="mb-1 text-heading-sm font-semibold tracking-tight text-ink">Sign in</h1>
      <p className="mb-6 text-sm text-mid-gray">Welcome back to Build OS.</p>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <FormField label="Email">
          <Input type="email" name="email" required autoComplete="email" placeholder="you@company.com" />
        </FormField>
        <FormField label="Password">
          <Input type="password" name="password" required autoComplete="current-password" />
        </FormField>

        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-mid-gray">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-primary hover:text-primary-hover">
          Sign up
        </Link>
      </p>
    </Card>
  );
}
