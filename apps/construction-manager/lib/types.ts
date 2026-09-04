export type ProjectStatus = "active" | "on-hold" | "closeout" | "complete";

export interface Project {
  id: string;
  name: string;
  jobNumber: string;
  client: string;
  address: string;
  city: string;
  status: ProjectStatus;
  stage: string;
  startDate: string;
  targetCompletion: string;
  contractValue: number;
  percentComplete: number;
  superintendent: string;
  projectManager: string;
  accentColor: string;
}

export type RfiStatus = "open" | "pending-response" | "closed" | "overdue";
export type Priority = "low" | "normal" | "high" | "critical";

export interface Rfi {
  id: string;
  projectId: string;
  number: string;
  subject: string;
  question: string;
  answer?: string;
  status: RfiStatus;
  priority: Priority;
  specSection?: string;
  submittedBy: string;
  assignedTo: string;
  createdAt: string;
  dueDate: string;
  costImpact: boolean;
  scheduleImpact: boolean;
}

export type SubmittalStatus =
  | "draft"
  | "in-review"
  | "approved"
  | "approved-as-noted"
  | "revise-resubmit"
  | "rejected";

export interface Submittal {
  id: string;
  projectId: string;
  number: string;
  title: string;
  specSection: string;
  type: string;
  status: SubmittalStatus;
  submittedBy: string;
  reviewer: string;
  submittedDate: string;
  dueDate: string;
  revision: number;
}

export interface DailyLog {
  id: string;
  projectId: string;
  date: string;
  weather: string;
  tempHighF: number;
  tempLowF: number;
  conditions: "clear" | "cloudy" | "rain" | "snow" | "wind";
  crewCount: number;
  workPerformed: string[];
  delays: string;
  visitors: string[];
  safetyIncidents: number;
  author: string;
}

export type TaskStatus = "open" | "in-progress" | "in-review" | "closed";

export interface PunchItem {
  id: string;
  projectId: string;
  title: string;
  description: string;
  location: string;
  trade: string;
  status: TaskStatus;
  priority: Priority;
  assignedTo: string;
  createdBy: string;
  createdAt: string;
  dueDate: string;
}

export interface DocumentItem {
  id: string;
  projectId: string;
  name: string;
  category: string;
  version: string;
  uploadedBy: string;
  uploadedAt: string;
  sizeKb: number;
  fileType: "pdf" | "dwg" | "xlsx" | "docx" | "jpg";
}

export interface BudgetLineItem {
  id: string;
  projectId: string;
  costCode: string;
  description: string;
  budgeted: number;
  committed: number;
  spent: number;
  category: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  company: string;
  initials: string;
}
