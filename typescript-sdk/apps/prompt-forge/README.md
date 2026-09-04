# Prompt Forge

A single-page app that turns a prompting technique + a short form into a well-structured,
copy-ready prompt. Everything runs client-side — no backend, no auth, no database.

## Local setup

```bash
cd typescript-sdk/apps/prompt-forge
npm install
npm run dev       # starts the Vite dev server
npm run build      # type-checks and produces a static bundle in dist/
npm run preview    # serves the production build locally
```

Requires Node 18+.

## How it works

1. **Choose a technique** — five cards (Zero-shot, Few-shot, Chain of Thought, Chain of
   Draft, PICCO), each with a name, one-line description, and a "best for" tag.
2. **Fill the form** — common fields (Role, Task, Context, Audience, Tone, Output format,
   Constraints, Success criteria) plus fields specific to the chosen technique.
3. **Read the live preview** — a monospace panel assembles the prompt on every keystroke,
   with a character/token estimate, Copy, Download (.txt / .md), Save to library, and Reset.

State lives in React hooks. The prompt library persists to `localStorage` under
`promptforge:library`; every read/write is wrapped in try/catch (see `src/lib/storage.ts`)
so the app keeps working — in memory — even with storage disabled, and shows a dismissible
notice when that happens.

## Assembly-function architecture

Every technique is defined in exactly one file under `src/techniques/`, exporting a single
`TechniqueDefinition` (see `src/techniques/types.ts`):

```ts
interface TechniqueDefinition<TExtra> {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  usesCommonFields: boolean;      // false only for techniques that replace the common form (e.g. PICCO)
  fields: FieldSchema[];          // declarative extra-field schema, or the full schema when usesCommonFields is false
  createDefaultExtra: () => TExtra;
  assemble: (common: CommonFields, extra: TExtra) => string;   // pure function: form state -> prompt text
  validate?: (common, extra) => ValidationWarning | null;      // e.g. few-shot's "add an example" warning
  infoTooltip?: string;                                        // shown on the technique card
  showCompletenessMeter?: boolean;
  completeness?: (common, extra) => { percent: number; missing: string[] };
  CustomFormComponent?: ComponentType<TechniqueFormProps<TExtra>>; // only for techniques whose editor
                                                                    // can't be expressed as a flat field list
}
```

`assemble` is a **pure function**: given the common fields and the technique's own extra
state, it returns the final prompt string. Every section helper in
`src/techniques/shared.ts` (`section`, `bulletList`, `roleLine`, …) skips its heading
entirely when the underlying field is empty, so the output never has a dangling `##
Context` with nothing under it.

Most techniques (Zero-shot, Few-shot, Chain of Thought, Chain of Draft) declare their extra
fields as a `FieldSchema[]` — the generic `ExtraFieldsForm` component
(`src/components/ExtraFieldsForm.tsx`) renders text/textarea/select/toggle/number/
repeatable-text/repeatable-pair inputs straight from that schema, so **the UI needs no
changes to support a new technique's fields**. PICCO is the one exception: it replaces the
common form outright and needs an editable-labels settings panel and a completeness meter,
so it supplies its own `CustomFormComponent` (`src/components/PiccoForm.tsx`) instead.

The registry in `src/techniques/index.ts` is just an array of these definitions.

### Adding a sixth technique

1. Create `src/techniques/myTechnique.ts`:

   ```ts
   import type { TechniqueDefinition } from "./types";
   import { commonTailParts, joinParts, roleLine, section } from "./shared";

   interface MyTechniqueExtra {
     someToggle: boolean;
   }

   const myTechnique: TechniqueDefinition<MyTechniqueExtra> = {
     id: "my-technique",
     name: "My Technique",
     description: "One line describing what it does.",
     bestFor: "The kind of task it's good for",
     usesCommonFields: true,
     fields: [{ key: "someToggle", label: "Some toggle", type: "toggle" }],
     createDefaultExtra: () => ({ someToggle: true }),
     assemble: (common, extra) =>
       joinParts([
         roleLine(common),
         section("Task", common.task),
         section("Context", common.context),
         extra.someToggle ? "## My section\nSome extra instructions." : "",
         ...commonTailParts(common),
       ]),
   };

   export default myTechnique;
   ```

2. Add it to the array in `src/techniques/index.ts`:

   ```ts
   import myTechnique from "./myTechnique";
   // ...
   export const techniques = [zeroShot, fewShot, chainOfThought, chainOfDraft, picco, myTechnique];
   ```

That's it — the technique picker, form, live preview, and library all pick it up
automatically. No other file needs to change unless the technique needs a field type the
generic renderer doesn't support yet, in which case supply a `CustomFormComponent` instead
of (or in addition to) `fields`.

## Prompt library

- "Save to library" stores `{ id, name, technique, common, extra, generatedPrompt,
  createdAt, updatedAt }` in `localStorage` (`src/lib/library.ts`).
- The Library drawer (top-right button) lists saved prompts newest first, with search by
  name and a technique filter.
- Each entry can be loaded back into the editor, duplicated, renamed, copied, or deleted.

## "Improve this prompt" (not shipped)

The spec's optional LLM-powered "Improve this prompt" feature needs a server-side call so
an API key is never exposed in client code — this app has no backend in v1, so it isn't
implemented. Wiring it up later means adding a server route (or edge function) that holds
the key, and a small "coming soon"-gated panel in `PromptPreview` that calls it.

## Deploying

`npm run build` produces a static bundle in `dist/` — deploy it as-is to Vercel, Netlify, or
any static host. No environment variables or server routes are required.
