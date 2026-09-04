"use client";

import { FormEvent, useState } from "react";
import { Modal, FormField, FormActions, inputClass } from "@/components/Modal";
import { useAppData } from "@/lib/store";
import { Priority } from "@/lib/types";
import { TODAY } from "@/lib/format";

export function NewPunchItemForm({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { addPunchItem } = useAppData();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [trade, setTrade] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");

  function reset() {
    setTitle("");
    setDescription("");
    setLocation("");
    setTrade("");
    setPriority("normal");
    setAssignedTo("");
    setDueDate("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !trade.trim() || !assignedTo.trim()) return;
    addPunchItem(projectId, {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      trade: trade.trim(),
      priority,
      assignedTo: assignedTo.trim(),
      createdBy: "Elena Ruiz",
      dueDate: dueDate || TODAY,
    });
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Task / Punch Item">
      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          <FormField label="Title">
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Touch-up drywall damage, Level 2 stair" />
          </FormField>
          <FormField label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} placeholder="Additional detail (optional)" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Location">
              <input required value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="e.g. Level 2, Stairwell B" />
            </FormField>
            <FormField label="Trade">
              <input required value={trade} onChange={(e) => setTrade(e.target.value)} className={inputClass} placeholder="e.g. Drywall" />
            </FormField>
            <FormField label="Assigned To">
              <input required value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={inputClass} placeholder="Subcontractor / company" />
            </FormField>
            <FormField label="Priority">
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={inputClass}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </FormField>
            <FormField label="Due Date" className="col-span-2">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </FormField>
          </div>
        </div>
        <FormActions onCancel={onClose} submitLabel="Create Item" />
      </form>
    </Modal>
  );
}
