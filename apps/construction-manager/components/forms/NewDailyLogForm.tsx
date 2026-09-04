"use client";

import { FormEvent, useState } from "react";
import { Modal, FormField, FormActions, inputClass } from "@/components/Modal";
import { useAppData } from "@/lib/store";
import { DailyLog } from "@/lib/types";
import { TODAY } from "@/lib/format";

const conditionOptions: DailyLog["conditions"][] = ["clear", "cloudy", "rain", "snow", "wind"];

export function NewDailyLogForm({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { addDailyLog } = useAppData();
  const [date, setDate] = useState(TODAY);
  const [weather, setWeather] = useState("");
  const [conditions, setConditions] = useState<DailyLog["conditions"]>("clear");
  const [tempHighF, setTempHighF] = useState("");
  const [tempLowF, setTempLowF] = useState("");
  const [crewCount, setCrewCount] = useState("");
  const [workPerformed, setWorkPerformed] = useState("");
  const [delays, setDelays] = useState("None");
  const [visitors, setVisitors] = useState("");
  const [safetyIncidents, setSafetyIncidents] = useState("0");
  const [author, setAuthor] = useState("");

  function reset() {
    setDate(TODAY);
    setWeather("");
    setConditions("clear");
    setTempHighF("");
    setTempLowF("");
    setCrewCount("");
    setWorkPerformed("");
    setDelays("None");
    setVisitors("");
    setSafetyIncidents("0");
    setAuthor("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!weather.trim() || !author.trim() || !workPerformed.trim()) return;
    addDailyLog(projectId, {
      date,
      weather: weather.trim(),
      conditions,
      tempHighF: Number(tempHighF) || 0,
      tempLowF: Number(tempLowF) || 0,
      crewCount: Number(crewCount) || 0,
      workPerformed: workPerformed.split("\n").map((s) => s.trim()).filter(Boolean),
      delays: delays.trim() || "None",
      visitors: visitors.split("\n").map((s) => s.trim()).filter(Boolean),
      safetyIncidents: Number(safetyIncidents) || 0,
      author: author.trim(),
    });
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Daily Log">
      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Logged By">
              <input required value={author} onChange={(e) => setAuthor(e.target.value)} className={inputClass} placeholder="Superintendent name" />
            </FormField>
            <FormField label="Weather">
              <input required value={weather} onChange={(e) => setWeather(e.target.value)} className={inputClass} placeholder="e.g. Clear, light breeze" />
            </FormField>
            <FormField label="Conditions">
              <select value={conditions} onChange={(e) => setConditions(e.target.value as DailyLog["conditions"])} className={inputClass}>
                {conditionOptions.map((c) => (
                  <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </FormField>
            <FormField label="High (°F)">
              <input type="number" value={tempHighF} onChange={(e) => setTempHighF(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Low (°F)">
              <input type="number" value={tempLowF} onChange={(e) => setTempLowF(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Crew Count">
              <input type="number" value={crewCount} onChange={(e) => setCrewCount(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Safety Incidents">
              <input type="number" value={safetyIncidents} onChange={(e) => setSafetyIncidents(e.target.value)} className={inputClass} />
            </FormField>
          </div>
          <FormField label="Work Performed (one item per line)">
            <textarea required value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} rows={3} className={inputClass} placeholder={"Structural steel erection Level 5\nMEP rough-in Levels 3-4"} />
          </FormField>
          <FormField label="Delays">
            <input value={delays} onChange={(e) => setDelays(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Visitors (one per line, optional)">
            <textarea value={visitors} onChange={(e) => setVisitors(e.target.value)} rows={2} className={inputClass} placeholder={"City inspector — framing walkthrough"} />
          </FormField>
        </div>
        <FormActions onCancel={onClose} submitLabel="Add Log" />
      </form>
    </Modal>
  );
}
