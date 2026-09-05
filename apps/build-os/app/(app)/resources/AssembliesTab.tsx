"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Badge, Button, Card, FormField, Input } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { addAssembly, addAssemblyComponent, removeAssemblyComponent, deleteAssembly } from "./actions";
import type { AssemblyRow, AssemblyComponentRow, ResourceRow } from "./ResourcesExplorer";

export function AssembliesTab({
  organizationId,
  assemblies,
  components,
  resources,
}: {
  organizationId: string;
  assemblies: AssemblyRow[];
  components: AssemblyComponentRow[];
  resources: ResourceRow[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const resourceById = new Map(resources.map((r) => [r.id, r]));

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Assembly
        </Button>
      </div>

      {assemblies.length === 0 ? (
        <Card className="py-16 text-center text-sm text-mid-gray">No assemblies found</Card>
      ) : (
        <div className="space-y-2">
          {assemblies.map((a) => {
            const rows = components.filter((c) => c.assembly_id === a.id);
            const isOpen = expanded.has(a.id);
            return (
              <Card key={a.id} padded={false}>
                <button
                  onClick={() => toggle(a.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="text-sm font-medium text-ink">{a.name}</span>
                    <Badge tone="soft">{a.unit ?? "—"}</Badge>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm text-mid-gray">
                      Derived rate: {a.derived_rate != null ? a.derived_rate.toFixed(2) : "—"}
                    </span>
                    <Trash2
                      className="h-4 w-4 text-mid-gray hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete assembly "${a.name}"?`)) deleteAssembly(a.id);
                      }}
                    />
                  </span>
                </button>

                {isOpen ? (
                  <div className="border-t border-hairline px-4 py-3">
                    <table className="mb-3 w-full text-xs">
                      <thead className="text-left uppercase tracking-wide text-mid-gray">
                        <tr>
                          <th className="py-1.5">Resource</th>
                          <th className="py-1.5">Quantity / Formula</th>
                          <th className="py-1.5">Rate</th>
                          <th className="w-8 py-1.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {rows.map((c) => {
                          const res = resourceById.get(c.component_resource_id);
                          return (
                            <tr key={c.id}>
                              <td className="py-1.5">{res?.description ?? c.component_resource_id}</td>
                              <td className="py-1.5">{c.quantity_or_formula}</td>
                              <td className="py-1.5">{res?.rate_or_value ?? "—"}</td>
                              <td className="py-1.5">
                                <Trash2
                                  className="h-3.5 w-3.5 cursor-pointer text-mid-gray hover:text-destructive"
                                  onClick={() => removeAssemblyComponent(c.id, a.id)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-3 text-center text-mid-gray">
                              No components yet.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                    <AddComponentForm organizationId={organizationId} assemblyId={a.id} resources={resources} />
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <AddAssemblyModal organizationId={organizationId} open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function AddComponentForm({
  organizationId,
  assemblyId,
  resources,
}: {
  organizationId: string;
  assemblyId: string;
  resources: ResourceRow[];
}) {
  const [state, formAction] = useFormState(addAssemblyComponent, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="organization_id" value={organizationId} />
      <input type="hidden" name="assembly_id" value={assemblyId} />
      <div className="w-56">
        <FormField label="Component resource">
          <select
            name="component_resource_id"
            required
            className="h-9 w-full rounded-[var(--radius-inputs)] bg-canvas px-3 text-sm"
          >
            <option value="">Select…</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.description}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <div className="w-40">
        <FormField label="Quantity">
          <Input name="quantity_or_formula" placeholder="e.g. 2.5" required />
        </FormField>
      </div>
      <Button type="submit" variant="outline">
        Add
      </Button>
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
    </form>
  );
}

function AddAssemblyModal({
  organizationId,
  open,
  onClose,
}: {
  organizationId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(addAssembly, undefined);

  useEffect(() => {
    if (state && !state.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title="Add Assembly">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="organization_id" value={organizationId} />
        <FormField label="Name">
          <Input name="name" required placeholder="e.g. Suspended Slab Assembly" />
        </FormField>
        <FormField label="Unit">
          <Input name="unit" placeholder="e.g. m3" />
        </FormField>
        <FormField label="Comments">
          <Input name="comments" placeholder="Optional" />
        </FormField>
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit" className="w-full">
          Add Assembly
        </Button>
      </form>
    </Modal>
  );
}
