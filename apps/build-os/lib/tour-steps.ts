export interface TourStep {
  selector: string; // matches a data-tour="<value>" attribute
  title: string;
  body: string;
}

// A short, deliberately app-shell-only tour (org switcher + nav + invite)
// rather than one per feature page — those pages only make sense once a
// project/resource/template already exists, and pointing a tour at
// something that isn't on screen yet is worse than not touring it at
// all. Restartable any time via the sidebar's "Take a Tour" link.
export const PRODUCT_TOUR_STEPS: TourStep[] = [
  {
    selector: "org-switcher",
    title: "Your organization",
    body: "Everything in Build OS — projects, your resource library, workbook templates — is scoped to one organization at a time. Switch here if you belong to more than one.",
  },
  {
    selector: "nav-projects",
    title: "Projects",
    body: "Each project gets its own documents, pricing schedule, and procurement plan. A sample project is seeded automatically so there's always something to look at.",
  },
  {
    selector: "nav-resources",
    title: "Resource Library",
    body: "Your organization's standard rates — labour, materials, plant, subcontractors — live here. New projects copy a snapshot of this library, so editing it later never changes an already-priced project.",
  },
  {
    selector: "nav-workbook-templates",
    title: "Workbook Templates",
    body: "Build a reusable estimation sheet with formulas that reference other rows and resources by name, then apply it to any project to generate pricing lines in one step.",
  },
  {
    selector: "invite-teammates",
    title: "Bring your team in",
    body: "Invite a teammate by email — they get access the moment they sign up, no separate account creation step.",
  },
];
