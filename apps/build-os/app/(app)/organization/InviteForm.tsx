"use client";

import { useFormState, useFormStatus } from "react-dom";
import { inviteTeammate } from "../actions";
import { Button, FormField, Input } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Inviting…" : "Invite"}
    </Button>
  );
}

export function InviteForm({ organizationId }: { organizationId: string }) {
  const [state, formAction] = useFormState(inviteTeammate, undefined);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <input type="hidden" name="organization_id" value={organizationId} />
      <div className="w-72">
        <FormField label="Invite by email">
          <Input type="email" name="email" required placeholder="teammate@company.com" />
        </FormField>
      </div>
      <SubmitButton />
      {state?.error ? <p className="pb-2 text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="pb-2 text-sm text-mid-gray">{state.success}</p> : null}
    </form>
  );
}
