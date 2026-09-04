"use client";

import { FormEvent, useState } from "react";
import { Modal, FormField, FormActions, inputClass } from "@/components/Modal";
import { useAppData } from "@/lib/store";
import { TODAY } from "@/lib/format";

const submittalTypes = ["Shop Drawing", "Product Data", "Sample", "Closeout Document", "Mix Design", "Test Report"];

export function NewSubmittalForm({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { addSubmittal } = useAppData();
  const [title, setTitle] = useState("");
  const [specSection, setSpecSection] = useState("");
  const [type, setType] = useState(submittalTypes[0]);
  const [submittedBy, setSubmittedBy] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [dueDate, setDueDate] = useState("");

  function reset() {
    setTitle("");
    setSpecSection("");
    setType(submittalTypes[0]);
    setSubmittedBy("");
    setReviewer("");
    setDueDate("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !specSection.trim() || !reviewer.trim()) return;
    addSubmittal(projectId, {
      title: title.trim(),
      specSection: specSection.trim(),
      type,
      submittedBy: submittedBy.trim() || "Elena Ruiz",
      reviewer: reviewer.trim(),
      dueDate: dueDate || TODAY,
    });
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Submittal">
      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          <FormField label="Title">
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Structural Steel Shop Drawings — Level 3" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Spec Section">
              <input required value={specSection} onChange={(e) => setSpecSection(e.target.value)} className={inputClass} placeholder="e.g. 05 12 00" />
            </FormField>
            <FormField label="Type">
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                {submittalTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Reviewer">
              <input required value={reviewer} onChange={(e) => setReviewer(e.target.value)} className={inputClass} placeholder="Architect / engineer name" />
            </FormField>
            <FormField label="Submitted By">
              <input value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} className={inputClass} placeholder="Your name" />
            </FormField>
            <FormField label="Due Date" className="col-span-2">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </FormField>
          </div>
        </div>
        <FormActions onCancel={onClose} submitLabel="Create Submittal" />
      </form>
    </Modal>
  );
}
