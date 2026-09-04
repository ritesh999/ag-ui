"use client";

import { FormEvent, useState } from "react";
import { Modal, FormField, FormActions, inputClass } from "@/components/Modal";
import { useAppData } from "@/lib/store";
import { Priority } from "@/lib/types";
import { TODAY } from "@/lib/format";

export function NewRfiForm({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { addRfi } = useAppData();
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [dueDate, setDueDate] = useState("");
  const [specSection, setSpecSection] = useState("");
  const [costImpact, setCostImpact] = useState(false);
  const [scheduleImpact, setScheduleImpact] = useState(false);

  function reset() {
    setSubject("");
    setQuestion("");
    setSubmittedBy("");
    setAssignedTo("");
    setPriority("normal");
    setDueDate("");
    setSpecSection("");
    setCostImpact(false);
    setScheduleImpact(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !question.trim() || !assignedTo.trim()) return;
    addRfi(projectId, {
      subject: subject.trim(),
      question: question.trim(),
      submittedBy: submittedBy.trim() || "Elena Ruiz",
      assignedTo: assignedTo.trim(),
      priority,
      dueDate: dueDate || TODAY,
      specSection: specSection.trim() || undefined,
      costImpact,
      scheduleImpact,
    });
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New RFI">
      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          <FormField label="Subject">
            <input required value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} placeholder="e.g. Conflict between beam and duct at Gridline C4" />
          </FormField>
          <FormField label="Question">
            <textarea required value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} className={inputClass} placeholder="Describe the issue and what you need clarified..." />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Assigned To">
              <input required value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={inputClass} placeholder="Reviewer name" />
            </FormField>
            <FormField label="Submitted By">
              <input value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} className={inputClass} placeholder="Your name" />
            </FormField>
            <FormField label="Priority">
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={inputClass}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </FormField>
            <FormField label="Due Date">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Spec Section (optional)" className="col-span-2">
              <input value={specSection} onChange={(e) => setSpecSection(e.target.value)} className={inputClass} placeholder="e.g. 09 51 00" />
            </FormField>
          </div>
          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={costImpact} onChange={(e) => setCostImpact(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              Cost impact
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={scheduleImpact} onChange={(e) => setScheduleImpact(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              Schedule impact
            </label>
          </div>
        </div>
        <FormActions onCancel={onClose} submitLabel="Create RFI" />
      </form>
    </Modal>
  );
}
