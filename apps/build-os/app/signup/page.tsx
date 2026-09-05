"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signup } from "./actions";
import { Button, Card, FormField, Input } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useFormState(signup, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <Card className="w-full max-w-sm">
        {state?.checkEmail ? (
          <>
            <h1 className="mb-1 text-heading-sm font-semibold tracking-tight text-ink">Check your email</h1>
            <p className="text-sm text-mid-gray">
              We sent you a confirmation link. Click it to finish setting up your account — if you were invited to
              an existing organization, you&apos;ll land there automatically; otherwise a new one is created for
              you.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-heading-sm font-semibold tracking-tight text-ink">Create your account</h1>
            <p className="mb-6 text-sm text-mid-gray">
              If you were invited to an organization, use the email address the invite was sent to.
            </p>

            <form action={formAction} className="space-y-4">
              <FormField label="Email">
                <Input type="email" name="email" required autoComplete="email" placeholder="you@company.com" />
              </FormField>
              <FormField label="Password">
                <Input type="password" name="password" required minLength={8} autoComplete="new-password" />
              </FormField>

              {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

              <SubmitButton />
            </form>

            <p className="mt-6 text-center text-sm text-mid-gray">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
                Sign in
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
