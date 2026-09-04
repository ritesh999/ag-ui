"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  rfis as seedRfis,
  submittals as seedSubmittals,
  dailyLogs as seedDailyLogs,
  punchItems as seedPunchItems,
} from "./data";
import {
  DailyLog,
  Priority,
  PunchItem,
  Rfi,
  RfiStatus,
  Submittal,
  SubmittalStatus,
  TaskStatus,
} from "./types";
import { TODAY } from "./format";

const STORAGE_KEY = "siteflow-data-v1";

interface AppState {
  rfis: Rfi[];
  submittals: Submittal[];
  dailyLogs: DailyLog[];
  punchItems: PunchItem[];
}

function seedState(): AppState {
  return {
    rfis: seedRfis,
    submittals: seedSubmittals,
    dailyLogs: seedDailyLogs,
    punchItems: seedPunchItems,
  };
}

function nextNumber(existing: string[], prefix: string, padTo: number) {
  const max = existing.reduce((m, n) => {
    const match = n.match(/(\d+)$/);
    const value = match ? parseInt(match[1], 10) : 0;
    return Math.max(m, value);
  }, 0);
  return `${prefix}-${String(max + 1).padStart(padTo, "0")}`;
}

let uidCounter = 0;
function uid(prefix: string) {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${uidCounter}`;
}

export interface NewRfiInput {
  subject: string;
  question: string;
  submittedBy: string;
  assignedTo: string;
  priority: Priority;
  dueDate: string;
  specSection?: string;
  costImpact: boolean;
  scheduleImpact: boolean;
}

export interface NewSubmittalInput {
  title: string;
  specSection: string;
  type: string;
  submittedBy: string;
  reviewer: string;
  dueDate: string;
}

export interface NewPunchItemInput {
  title: string;
  description: string;
  location: string;
  trade: string;
  priority: Priority;
  assignedTo: string;
  createdBy: string;
  dueDate: string;
}

export interface NewDailyLogInput {
  date: string;
  weather: string;
  tempHighF: number;
  tempLowF: number;
  conditions: DailyLog["conditions"];
  crewCount: number;
  workPerformed: string[];
  delays: string;
  visitors: string[];
  safetyIncidents: number;
  author: string;
}

interface AppContextValue extends AppState {
  addRfi: (projectId: string, input: NewRfiInput) => void;
  updateRfiStatus: (id: string, status: RfiStatus, answer?: string) => void;
  addSubmittal: (projectId: string, input: NewSubmittalInput) => void;
  updateSubmittalStatus: (id: string, status: SubmittalStatus) => void;
  addPunchItem: (projectId: string, input: NewPunchItemInput) => void;
  updatePunchStatus: (id: string, status: TaskStatus) => void;
  addDailyLog: (projectId: string, input: NewDailyLogInput) => void;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => seedState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        setState((prev) => ({
          rfis: parsed.rfis ?? prev.rfis,
          submittals: parsed.submittals ?? prev.submittals,
          dailyLogs: parsed.dailyLogs ?? prev.dailyLogs,
          punchItems: parsed.punchItems ?? prev.punchItems,
        }));
      }
    } catch {
      // ignore malformed/unavailable storage
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota/unavailable storage errors
    }
  }, [state, hydrated]);

  const addRfi = useCallback((projectId: string, input: NewRfiInput) => {
    setState((prev) => {
      const projectRfis = prev.rfis.filter((r) => r.projectId === projectId);
      const number = nextNumber(
        projectRfis.map((r) => r.number),
        "RFI",
        4
      );
      const rfi: Rfi = {
        id: uid("rfi"),
        projectId,
        number,
        status: "open",
        createdAt: TODAY,
        ...input,
      };
      return { ...prev, rfis: [rfi, ...prev.rfis] };
    });
  }, []);

  const updateRfiStatus = useCallback((id: string, status: RfiStatus, answer?: string) => {
    setState((prev) => ({
      ...prev,
      rfis: prev.rfis.map((r) => (r.id === id ? { ...r, status, answer: answer ?? r.answer } : r)),
    }));
  }, []);

  const addSubmittal = useCallback((projectId: string, input: NewSubmittalInput) => {
    setState((prev) => {
      const projectSubmittals = prev.submittals.filter((s) => s.projectId === projectId);
      const number = nextNumber(
        projectSubmittals.map((s) => s.number),
        "SUB",
        4
      );
      const submittal: Submittal = {
        id: uid("sub"),
        projectId,
        number,
        status: "draft",
        submittedDate: TODAY,
        revision: 1,
        ...input,
      };
      return { ...prev, submittals: [submittal, ...prev.submittals] };
    });
  }, []);

  const updateSubmittalStatus = useCallback((id: string, status: SubmittalStatus) => {
    setState((prev) => ({
      ...prev,
      submittals: prev.submittals.map((s) => (s.id === id ? { ...s, status } : s)),
    }));
  }, []);

  const addPunchItem = useCallback((projectId: string, input: NewPunchItemInput) => {
    setState((prev) => {
      const item: PunchItem = {
        id: uid("pi"),
        projectId,
        status: "open",
        createdAt: TODAY,
        ...input,
      };
      return { ...prev, punchItems: [item, ...prev.punchItems] };
    });
  }, []);

  const updatePunchStatus = useCallback((id: string, status: TaskStatus) => {
    setState((prev) => ({
      ...prev,
      punchItems: prev.punchItems.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
  }, []);

  const addDailyLog = useCallback((projectId: string, input: NewDailyLogInput) => {
    setState((prev) => {
      const log: DailyLog = {
        id: uid("log"),
        projectId,
        ...input,
      };
      return { ...prev, dailyLogs: [log, ...prev.dailyLogs] };
    });
  }, []);

  const resetDemoData = useCallback(() => {
    setState(seedState());
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value: AppContextValue = {
    ...state,
    addRfi,
    updateRfiStatus,
    addSubmittal,
    updateSubmittalStatus,
    addPunchItem,
    updatePunchStatus,
    addDailyLog,
    resetDemoData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppData must be used within an AppProvider");
  return ctx;
}
