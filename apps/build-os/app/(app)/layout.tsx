import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOrganizations, resolveCurrentOrgId } from "@/lib/current-org";
import { Sidebar } from "@/components/Sidebar";
import { ProductTour } from "@/components/ProductTour";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-suspenders: middleware.ts already redirects unauthenticated
  // requests, but Server Components shouldn't assume that ran.
  if (!user) redirect("/login");

  const organizations = await getUserOrganizations();

  // Shouldn't happen — bootstrapUserAfterAuth runs on every login/signup
  // and guarantees at least one org — but if it somehow does, sending
  // someone to a route that assumes an org exists would just error.
  if (organizations.length === 0) redirect("/login?error=no_organization");

  const currentOrgId = await resolveCurrentOrgId(organizations);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar organizations={organizations} currentOrgId={currentOrgId!} userEmail={user.email ?? ""} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
      <ProductTour />
    </div>
  );
}
