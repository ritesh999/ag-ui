import {
  BudgetLineItem,
  DailyLog,
  DocumentItem,
  Project,
  PunchItem,
  Rfi,
  Submittal,
  TeamMember,
} from "./types";

export const projects: Project[] = [
  {
    id: "riverside-medical",
    name: "Riverside Medical Center Expansion",
    jobNumber: "24-1042",
    client: "Riverside Health Network",
    address: "1200 Riverside Dr",
    city: "Portland, OR",
    status: "active",
    stage: "Structural / MEP Rough-in",
    startDate: "2025-01-13",
    targetCompletion: "2026-11-30",
    contractValue: 48_250_000,
    percentComplete: 62,
    superintendent: "Marcus Webb",
    projectManager: "Elena Ruiz",
    accentColor: "#3178f6",
  },
  {
    id: "maple-street-apartments",
    name: "Maple Street Apartments",
    jobNumber: "25-0117",
    client: "Cardinal Point Development",
    address: "480 Maple St",
    city: "Austin, TX",
    status: "active",
    stage: "Foundations",
    startDate: "2025-04-01",
    targetCompletion: "2027-02-15",
    contractValue: 21_900_000,
    percentComplete: 34,
    superintendent: "Dana Kowalski",
    projectManager: "James Okafor",
    accentColor: "#12b76a",
  },
  {
    id: "harbor-point-retail",
    name: "Harbor Point Retail Plaza",
    jobNumber: "23-0894",
    client: "Harbor Point Ventures LLC",
    address: "88 Harbor Point Blvd",
    city: "Tampa, FL",
    status: "active",
    stage: "Interior Finishes",
    startDate: "2024-06-10",
    targetCompletion: "2026-01-20",
    contractValue: 15_400_000,
    percentComplete: 88,
    superintendent: "Ray Sandoval",
    projectManager: "Priya Nair",
    accentColor: "#f79009",
  },
  {
    id: "downtown-transit-hub",
    name: "Downtown Transit Hub",
    jobNumber: "24-0511",
    client: "Metro Transit Authority",
    address: "5 Civic Center Plaza",
    city: "Denver, CO",
    status: "on-hold",
    stage: "Design Development",
    startDate: "2025-02-01",
    targetCompletion: "2028-05-01",
    contractValue: 96_000_000,
    percentComplete: 15,
    superintendent: "TBD",
    projectManager: "Sam Whitfield",
    accentColor: "#98a2b3",
  },
  {
    id: "lakeside-elementary",
    name: "Lakeside Elementary School Renovation",
    jobNumber: "22-0339",
    client: "Lakeside Unified School District",
    address: "701 Lakeside Ave",
    city: "Madison, WI",
    status: "closeout",
    stage: "Punch List & Closeout",
    startDate: "2023-06-01",
    targetCompletion: "2025-09-30",
    contractValue: 9_750_000,
    percentComplete: 97,
    superintendent: "Kelly Ahn",
    projectManager: "Elena Ruiz",
    accentColor: "#7a5af8",
  },
];

export const team: TeamMember[] = [
  { id: "t1", name: "Elena Ruiz", role: "Project Manager", company: "Vantage Construction", initials: "ER" },
  { id: "t2", name: "Marcus Webb", role: "Superintendent", company: "Vantage Construction", initials: "MW" },
  { id: "t3", name: "Dana Kowalski", role: "Superintendent", company: "Vantage Construction", initials: "DK" },
  { id: "t4", name: "James Okafor", role: "Project Manager", company: "Vantage Construction", initials: "JO" },
  { id: "t5", name: "Ray Sandoval", role: "Superintendent", company: "Vantage Construction", initials: "RS" },
  { id: "t6", name: "Priya Nair", role: "Project Manager", company: "Vantage Construction", initials: "PN" },
  { id: "t7", name: "Sam Whitfield", role: "Project Executive", company: "Vantage Construction", initials: "SW" },
  { id: "t8", name: "Kelly Ahn", role: "Superintendent", company: "Vantage Construction", initials: "KA" },
  { id: "t9", name: "Nate Brooks", role: "MEP Coordinator", company: "Vantage Construction", initials: "NB" },
  { id: "t10", name: "Lauren Chase", role: "Architect", company: "Bright Line Architecture", initials: "LC" },
  { id: "t11", name: "Victor Ibanez", role: "Structural Engineer", company: "Ibanez Structural", initials: "VI" },
  { id: "t12", name: "Devon Marsh", role: "Electrical Sub", company: "Marsh Electric", initials: "DM" },
];

export const rfis: Rfi[] = [
  {
    id: "rfi-1",
    projectId: "riverside-medical",
    number: "RFI-0142",
    subject: "Conflict between structural beam and duct routing at Gridline C4",
    question:
      "MEP drawing M-402 shows a 24x14 supply duct crossing structural beam B-14 at el. 128'-6\" with insufficient clearance. Please advise on routing or beam depth revision.",
    status: "open",
    priority: "high",
    specSection: "23 31 00",
    submittedBy: "Nate Brooks",
    assignedTo: "Victor Ibanez",
    createdAt: "2026-08-18",
    dueDate: "2026-09-08",
    costImpact: true,
    scheduleImpact: true,
  },
  {
    id: "rfi-2",
    projectId: "riverside-medical",
    number: "RFI-0141",
    subject: "Fire-rated assembly at imaging suite shear wall",
    question:
      "Detail 7/A-501 does not specify the fire rating for the shear wall separating the MRI suite from the corridor. Confirm 2-hour rating applies per life-safety plan LS-101.",
    answer:
      "Confirmed: 2-hour rated assembly per UL U419 required at all imaging suite walls. Revised detail to follow in ASI-014.",
    status: "closed",
    priority: "normal",
    specSection: "07 84 00",
    submittedBy: "Elena Ruiz",
    assignedTo: "Lauren Chase",
    createdAt: "2026-08-02",
    dueDate: "2026-08-16",
    costImpact: false,
    scheduleImpact: false,
  },
  {
    id: "rfi-3",
    projectId: "riverside-medical",
    number: "RFI-0143",
    subject: "Generator pad footing depth vs. geotech report",
    question:
      "Structural drawing S-210 calls for 3'-0\" footing depth at emergency generator pad. Geotech report recommends 4'-0\" minimum due to fill soil at that location. Please confirm.",
    status: "pending-response",
    priority: "high",
    specSection: "03 30 00",
    submittedBy: "Marcus Webb",
    assignedTo: "Victor Ibanez",
    createdAt: "2026-08-27",
    dueDate: "2026-09-03",
    costImpact: true,
    scheduleImpact: false,
  },
  {
    id: "rfi-4",
    projectId: "riverside-medical",
    number: "RFI-0138",
    subject: "Curtain wall anchor embed conflict with waterproofing",
    question:
      "Curtain wall shop drawings show anchor embeds penetrating the below-grade waterproofing membrane at the north entry. Need direction on flashing detail.",
    status: "overdue",
    priority: "critical",
    specSection: "08 44 00",
    submittedBy: "Nate Brooks",
    assignedTo: "Lauren Chase",
    createdAt: "2026-07-30",
    dueDate: "2026-08-13",
    costImpact: true,
    scheduleImpact: true,
  },
  {
    id: "rfi-5",
    projectId: "maple-street-apartments",
    number: "RFI-0031",
    subject: "Retaining wall rebar lap splice length",
    question:
      "Confirm lap splice length for #6 vertical bars at retaining wall RW-3 — S-302 detail is ambiguous on whether Class A or Class B splice applies.",
    status: "open",
    priority: "normal",
    specSection: "03 20 00",
    submittedBy: "Dana Kowalski",
    assignedTo: "Victor Ibanez",
    createdAt: "2026-08-22",
    dueDate: "2026-09-05",
    costImpact: false,
    scheduleImpact: false,
  },
  {
    id: "rfi-6",
    projectId: "maple-street-apartments",
    number: "RFI-0030",
    subject: "Underground electrical conduit crossing storm line",
    question:
      "Civil C-101 and electrical E-001 show primary electrical duct bank crossing the 24\" storm line with only 6\" clearance. Confirm minimum separation requirement.",
    status: "closed",
    priority: "high",
    specSection: "26 05 00",
    submittedBy: "James Okafor",
    assignedTo: "Devon Marsh",
    answer: "Minimum 12\" vertical clearance required; duct bank to be lowered per revised civil detail C-101.1.",
    createdAt: "2026-08-05",
    dueDate: "2026-08-19",
    costImpact: false,
    scheduleImpact: true,
  },
  {
    id: "rfi-7",
    projectId: "harbor-point-retail",
    number: "RFI-0208",
    subject: "Storefront glazing spec substitution",
    question:
      "Glazing sub proposes substituting specified low-E coating with an equivalent product due to lead time. Requesting approval of submitted equivalency data.",
    status: "pending-response",
    priority: "low",
    specSection: "08 80 00",
    submittedBy: "Ray Sandoval",
    assignedTo: "Lauren Chase",
    createdAt: "2026-08-25",
    dueDate: "2026-09-04",
    costImpact: false,
    scheduleImpact: true,
  },
  {
    id: "rfi-8",
    projectId: "harbor-point-retail",
    number: "RFI-0205",
    subject: "Ceiling grid layout conflict at tenant #6 demising wall",
    question:
      "Reflected ceiling plan shows grid line running through the tenant demising wall centerline at unit 6. Please provide adjusted layout.",
    status: "closed",
    priority: "low",
    specSection: "09 51 00",
    submittedBy: "Priya Nair",
    assignedTo: "Lauren Chase",
    answer: "Adjusted RCP issued — grid shifted 4\" north, see ASI-021.",
    createdAt: "2026-08-01",
    dueDate: "2026-08-08",
    costImpact: false,
    scheduleImpact: false,
  },
  {
    id: "rfi-9",
    projectId: "lakeside-elementary",
    number: "RFI-0087",
    subject: "Playground equipment anchor bolt pattern",
    question:
      "As-delivered playground structure anchor pattern does not match foundation plan issued for construction. Requesting revised layout for as-built footings.",
    status: "open",
    priority: "normal",
    specSection: "11 68 00",
    submittedBy: "Kelly Ahn",
    assignedTo: "Lauren Chase",
    createdAt: "2026-08-20",
    dueDate: "2026-09-10",
    costImpact: false,
    scheduleImpact: false,
  },
];

export const submittals: Submittal[] = [
  {
    id: "sub-1",
    projectId: "riverside-medical",
    number: "SUB-0210",
    title: "Structural Steel Shop Drawings — Levels 3-5",
    specSection: "05 12 00",
    type: "Shop Drawing",
    status: "in-review",
    submittedBy: "Victor Ibanez",
    reviewer: "Lauren Chase",
    submittedDate: "2026-08-20",
    dueDate: "2026-09-03",
    revision: 1,
  },
  {
    id: "sub-2",
    projectId: "riverside-medical",
    number: "SUB-0206",
    title: "Medical Gas Piping — Product Data",
    specSection: "22 62 00",
    type: "Product Data",
    status: "approved-as-noted",
    submittedBy: "Nate Brooks",
    reviewer: "Lauren Chase",
    submittedDate: "2026-08-05",
    dueDate: "2026-08-19",
    revision: 1,
  },
  {
    id: "sub-3",
    projectId: "riverside-medical",
    number: "SUB-0198",
    title: "Curtain Wall System — Shop Drawings & Samples",
    specSection: "08 44 00",
    type: "Shop Drawing",
    status: "revise-resubmit",
    submittedBy: "Devon Marsh",
    reviewer: "Lauren Chase",
    submittedDate: "2026-07-22",
    dueDate: "2026-08-05",
    revision: 2,
  },
  {
    id: "sub-4",
    projectId: "riverside-medical",
    number: "SUB-0212",
    title: "Emergency Generator — Product Data & O&M",
    specSection: "26 32 13",
    type: "Product Data",
    status: "draft",
    submittedBy: "Nate Brooks",
    reviewer: "Lauren Chase",
    submittedDate: "2026-08-29",
    dueDate: "2026-09-12",
    revision: 1,
  },
  {
    id: "sub-5",
    projectId: "maple-street-apartments",
    number: "SUB-0044",
    title: "Precast Concrete Plank — Shop Drawings",
    specSection: "03 41 00",
    type: "Shop Drawing",
    status: "in-review",
    submittedBy: "Dana Kowalski",
    reviewer: "Victor Ibanez",
    submittedDate: "2026-08-24",
    dueDate: "2026-09-07",
    revision: 1,
  },
  {
    id: "sub-6",
    projectId: "maple-street-apartments",
    number: "SUB-0038",
    title: "Waterproofing Membrane — Product Data",
    specSection: "07 13 00",
    type: "Product Data",
    status: "approved",
    submittedBy: "James Okafor",
    reviewer: "Lauren Chase",
    submittedDate: "2026-08-01",
    dueDate: "2026-08-15",
    revision: 1,
  },
  {
    id: "sub-7",
    projectId: "harbor-point-retail",
    number: "SUB-0311",
    title: "Storefront Glazing — Equivalency Data",
    specSection: "08 80 00",
    type: "Product Data",
    status: "in-review",
    submittedBy: "Ray Sandoval",
    reviewer: "Lauren Chase",
    submittedDate: "2026-08-26",
    dueDate: "2026-09-09",
    revision: 1,
  },
  {
    id: "sub-8",
    projectId: "harbor-point-retail",
    number: "SUB-0298",
    title: "Interior Paint & Wallcovering — Samples",
    specSection: "09 90 00",
    type: "Sample",
    status: "approved",
    submittedBy: "Priya Nair",
    reviewer: "Lauren Chase",
    submittedDate: "2026-08-03",
    dueDate: "2026-08-17",
    revision: 1,
  },
  {
    id: "sub-9",
    projectId: "lakeside-elementary",
    number: "SUB-0152",
    title: "Playground Equipment — Closeout O&M Manual",
    specSection: "11 68 00",
    type: "Closeout Document",
    status: "in-review",
    submittedBy: "Kelly Ahn",
    reviewer: "Elena Ruiz",
    submittedDate: "2026-08-15",
    dueDate: "2026-08-29",
    revision: 1,
  },
];

export const dailyLogs: DailyLog[] = [
  {
    id: "log-1",
    projectId: "riverside-medical",
    date: "2026-09-03",
    weather: "Clear, light breeze",
    tempHighF: 74,
    tempLowF: 56,
    conditions: "clear",
    crewCount: 86,
    workPerformed: [
      "Structural steel erection Level 5, gridlines A-F",
      "MEP rough-in continuing Levels 3-4",
      "Concrete slab pour Level 2 mechanical room",
    ],
    delays: "None",
    visitors: ["City inspector — framing walkthrough", "Owner rep — Riverside Health Network"],
    safetyIncidents: 0,
    author: "Marcus Webb",
  },
  {
    id: "log-2",
    projectId: "riverside-medical",
    date: "2026-09-02",
    weather: "Overcast, scattered showers",
    tempHighF: 68,
    tempLowF: 54,
    conditions: "rain",
    crewCount: 71,
    workPerformed: ["Steel erection halted after 1pm due to rain", "Interior framing Level 1 continued"],
    delays: "Afternoon rain halted crane operations for structural steel crew (~3 hrs lost).",
    visitors: [],
    safetyIncidents: 0,
    author: "Marcus Webb",
  },
  {
    id: "log-3",
    projectId: "riverside-medical",
    date: "2026-09-01",
    weather: "Clear",
    tempHighF: 77,
    tempLowF: 58,
    conditions: "clear",
    crewCount: 82,
    workPerformed: ["Structural steel erection Level 4-5", "Underground electrical duct bank", "Fireproofing Level 2"],
    delays: "None",
    visitors: [],
    safetyIncidents: 1,
    author: "Marcus Webb",
  },
  {
    id: "log-4",
    projectId: "maple-street-apartments",
    date: "2026-09-03",
    weather: "Hot, sunny",
    tempHighF: 96,
    tempLowF: 74,
    conditions: "clear",
    crewCount: 34,
    workPerformed: ["Foundation excavation Building B", "Rebar placement retaining wall RW-3"],
    delays: "None",
    visitors: ["Geotech engineer — soil verification"],
    safetyIncidents: 0,
    author: "Dana Kowalski",
  },
  {
    id: "log-5",
    projectId: "maple-street-apartments",
    date: "2026-09-02",
    weather: "Hot, sunny",
    tempHighF: 98,
    tempLowF: 75,
    conditions: "clear",
    crewCount: 29,
    workPerformed: ["Underground electrical duct bank installation", "Erosion control maintenance"],
    delays: "Heat advisory — added extra water breaks, no lost time.",
    visitors: [],
    safetyIncidents: 0,
    author: "Dana Kowalski",
  },
  {
    id: "log-6",
    projectId: "harbor-point-retail",
    date: "2026-09-03",
    weather: "Partly cloudy",
    tempHighF: 89,
    tempLowF: 78,
    conditions: "cloudy",
    crewCount: 41,
    workPerformed: ["Interior framing tenant units 4-6", "Ceiling grid install unit 2", "Paint prep unit 1"],
    delays: "None",
    visitors: ["Tenant rep — unit 6 walkthrough"],
    safetyIncidents: 0,
    author: "Ray Sandoval",
  },
  {
    id: "log-7",
    projectId: "lakeside-elementary",
    date: "2026-09-02",
    weather: "Clear",
    tempHighF: 71,
    tempLowF: 50,
    conditions: "clear",
    crewCount: 12,
    workPerformed: ["Punch list corrections — gym flooring", "Final cleaning classrooms 100-110"],
    delays: "None",
    visitors: ["School district facilities director"],
    safetyIncidents: 0,
    author: "Kelly Ahn",
  },
];

export const punchItems: PunchItem[] = [
  {
    id: "pi-1",
    projectId: "riverside-medical",
    title: "Touch-up drywall damage in stairwell B, Level 2",
    description: "Impact damage from material handling; approx. 3 sq ft patch needed before paint.",
    location: "Stairwell B, Level 2",
    trade: "Drywall",
    status: "open",
    priority: "low",
    assignedTo: "Structure Wall Systems",
    createdBy: "Marcus Webb",
    createdAt: "2026-08-28",
    dueDate: "2026-09-10",
  },
  {
    id: "pi-2",
    projectId: "riverside-medical",
    title: "Fire damper access panel missing, mechanical room 214",
    description: "Access panel for fire damper FD-14 was not installed after ductwork closeout.",
    location: "Mechanical Room 214",
    trade: "Mechanical",
    status: "in-progress",
    priority: "high",
    assignedTo: "Apex Mechanical",
    createdBy: "Elena Ruiz",
    createdAt: "2026-08-25",
    dueDate: "2026-09-05",
  },
  {
    id: "pi-3",
    projectId: "riverside-medical",
    title: "Temporary power drop needed at Level 5 east stair",
    description: "Electrical sub requests temp power for upcoming rough-in work.",
    location: "Level 5, East Stair",
    trade: "Electrical",
    status: "closed",
    priority: "normal",
    assignedTo: "Marsh Electric",
    createdBy: "Nate Brooks",
    createdAt: "2026-08-15",
    dueDate: "2026-08-22",
  },
  {
    id: "pi-4",
    projectId: "maple-street-apartments",
    title: "Silt fence repair along south property line",
    description: "Silt fence damaged in last storm event, needs repair prior to next inspection.",
    location: "South property line",
    trade: "Sitework",
    status: "open",
    priority: "high",
    assignedTo: "Groundworks Sitework",
    createdBy: "Dana Kowalski",
    createdAt: "2026-09-01",
    dueDate: "2026-09-04",
  },
  {
    id: "pi-5",
    projectId: "maple-street-apartments",
    title: "Rebar inspection hold — footing F-22",
    description: "Awaiting third-party special inspector sign-off before pour.",
    location: "Footing F-22, Building B",
    trade: "Concrete",
    status: "in-review",
    priority: "normal",
    assignedTo: "Coastal Inspection Services",
    createdBy: "Dana Kowalski",
    createdAt: "2026-08-30",
    dueDate: "2026-09-05",
  },
  {
    id: "pi-6",
    projectId: "harbor-point-retail",
    title: "Adjust storefront door closer, Unit 3 entry",
    description: "Door closer too aggressive, slamming on close. Needs adjustment.",
    location: "Unit 3 Entry",
    trade: "Doors/Hardware",
    status: "open",
    priority: "low",
    assignedTo: "Precision Door & Hardware",
    createdBy: "Ray Sandoval",
    createdAt: "2026-08-27",
    dueDate: "2026-09-06",
  },
  {
    id: "pi-7",
    projectId: "harbor-point-retail",
    title: "Paint touch-up, common corridor near Unit 5",
    description: "Scuffs and roller marks noted during owner walkthrough.",
    location: "Common Corridor",
    trade: "Painting",
    status: "closed",
    priority: "low",
    assignedTo: "Coastal Finishes",
    createdBy: "Priya Nair",
    createdAt: "2026-08-10",
    dueDate: "2026-08-17",
  },
  {
    id: "pi-8",
    projectId: "lakeside-elementary",
    title: "Replace cracked ceiling tile, Room 108",
    description: "Ceiling tile cracked during HVAC balancing work.",
    location: "Room 108",
    trade: "Ceilings",
    status: "in-progress",
    priority: "normal",
    assignedTo: "Midwest Interiors",
    createdBy: "Kelly Ahn",
    createdAt: "2026-08-26",
    dueDate: "2026-09-04",
  },
  {
    id: "pi-9",
    projectId: "lakeside-elementary",
    title: "Gym floor gouge repair near center court",
    description: "Minor gouge in refinished gym floor, needs spot repair before handover.",
    location: "Gymnasium",
    trade: "Flooring",
    status: "open",
    priority: "high",
    assignedTo: "Midwest Interiors",
    createdBy: "Kelly Ahn",
    createdAt: "2026-08-29",
    dueDate: "2026-09-06",
  },
  {
    id: "pi-10",
    projectId: "lakeside-elementary",
    title: "Label electrical panels, Building C",
    description: "Panel schedules need final typed labels per closeout requirements.",
    location: "Building C Electrical Room",
    trade: "Electrical",
    status: "closed",
    priority: "low",
    assignedTo: "Marsh Electric",
    createdBy: "Elena Ruiz",
    createdAt: "2026-08-12",
    dueDate: "2026-08-20",
  },
];

export const documents: DocumentItem[] = [
  { id: "doc-1", projectId: "riverside-medical", name: "S-210 Foundation Plan Rev 4.pdf", category: "Structural Drawings", version: "Rev 4", uploadedBy: "Victor Ibanez", uploadedAt: "2026-08-28", sizeKb: 8240, fileType: "pdf" },
  { id: "doc-2", projectId: "riverside-medical", name: "M-402 MEP Coordination.dwg", category: "MEP Drawings", version: "Rev 2", uploadedBy: "Nate Brooks", uploadedAt: "2026-08-26", sizeKb: 15680, fileType: "dwg" },
  { id: "doc-3", projectId: "riverside-medical", name: "Owner Contract Agreement.pdf", category: "Contracts", version: "Executed", uploadedBy: "Elena Ruiz", uploadedAt: "2025-01-10", sizeKb: 1120, fileType: "pdf" },
  { id: "doc-4", projectId: "riverside-medical", name: "Steel Erection Photos - Wk35.jpg", category: "Photos", version: "-", uploadedBy: "Marcus Webb", uploadedAt: "2026-08-30", sizeKb: 4520, fileType: "jpg" },
  { id: "doc-5", projectId: "riverside-medical", name: "Project Schedule - Baseline 3.xlsx", category: "Schedule", version: "v3", uploadedBy: "Elena Ruiz", uploadedAt: "2026-07-01", sizeKb: 340, fileType: "xlsx" },
  { id: "doc-6", projectId: "riverside-medical", name: "ASI-014 Fire Rated Assembly.pdf", category: "ASIs", version: "Issued", uploadedBy: "Lauren Chase", uploadedAt: "2026-08-17", sizeKb: 610, fileType: "pdf" },
  { id: "doc-7", projectId: "maple-street-apartments", name: "C-101 Civil Site Plan Rev 2.pdf", category: "Civil Drawings", version: "Rev 2", uploadedBy: "James Okafor", uploadedAt: "2026-08-20", sizeKb: 6210, fileType: "pdf" },
  { id: "doc-8", projectId: "maple-street-apartments", name: "Geotechnical Report - Final.pdf", category: "Reports", version: "Final", uploadedBy: "James Okafor", uploadedAt: "2025-03-15", sizeKb: 2980, fileType: "pdf" },
  { id: "doc-9", projectId: "maple-street-apartments", name: "GMP Contract - Cardinal Point.pdf", category: "Contracts", version: "Executed", uploadedBy: "James Okafor", uploadedAt: "2025-03-28", sizeKb: 1440, fileType: "pdf" },
  { id: "doc-10", projectId: "harbor-point-retail", name: "Interior Finish Schedule.xlsx", category: "Finishes", version: "v5", uploadedBy: "Priya Nair", uploadedAt: "2026-08-22", sizeKb: 210, fileType: "xlsx" },
  { id: "doc-11", projectId: "harbor-point-retail", name: "Tenant Unit 6 Walkthrough Photos.jpg", category: "Photos", version: "-", uploadedBy: "Ray Sandoval", uploadedAt: "2026-08-31", sizeKb: 3870, fileType: "jpg" },
  { id: "doc-12", projectId: "lakeside-elementary", name: "Closeout Punch List Master.docx", category: "Closeout", version: "v2", uploadedBy: "Kelly Ahn", uploadedAt: "2026-08-29", sizeKb: 190, fileType: "docx" },
  { id: "doc-13", projectId: "lakeside-elementary", name: "Certificate of Occupancy - Draft.pdf", category: "Permits", version: "Draft", uploadedBy: "Elena Ruiz", uploadedAt: "2026-08-18", sizeKb: 450, fileType: "pdf" },
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const costCodes: { code: string; description: string; category: string }[] = [
  { code: "01-100", description: "General Conditions", category: "General" },
  { code: "02-200", description: "Site Preparation & Earthwork", category: "Site" },
  { code: "03-300", description: "Cast-in-Place Concrete", category: "Structure" },
  { code: "04-200", description: "Unit Masonry", category: "Structure" },
  { code: "05-120", description: "Structural Steel", category: "Structure" },
  { code: "06-100", description: "Rough Carpentry", category: "Structure" },
  { code: "07-500", description: "Roofing & Waterproofing", category: "Envelope" },
  { code: "08-400", description: "Curtain Wall & Storefront", category: "Envelope" },
  { code: "09-250", description: "Drywall & Framing", category: "Interiors" },
  { code: "09-900", description: "Painting & Coatings", category: "Interiors" },
  { code: "10-000", description: "Specialties", category: "Interiors" },
  { code: "21-000", description: "Fire Suppression", category: "MEP" },
  { code: "22-000", description: "Plumbing", category: "MEP" },
  { code: "23-000", description: "HVAC", category: "MEP" },
  { code: "26-000", description: "Electrical", category: "MEP" },
  { code: "27-000", description: "Communications & Low Voltage", category: "MEP" },
  { code: "31-000", description: "Earthwork & Excavation", category: "Site" },
  { code: "32-100", description: "Paving & Site Concrete", category: "Site" },
  { code: "33-000", description: "Utilities", category: "Site" },
];

function buildBudgetForProject(projectId: string, contractValue: number, percentComplete: number, seed: number): BudgetLineItem[] {
  const rand = seededRandom(seed);
  const weights = costCodes.map(() => 0.4 + rand() * 1.2);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  return costCodes.map((cc, i) => {
    const budgeted = Math.round((contractValue * 0.82 * (weights[i] / weightSum)) / 100) * 100;
    const progressFactor = Math.min(1, Math.max(0, percentComplete / 100 + (rand() - 0.5) * 0.25));
    const spent = Math.round((budgeted * progressFactor) / 100) * 100;
    const committedExtra = Math.round((budgeted * progressFactor * (0.03 + rand() * 0.1)) / 100) * 100;
    const committed = spent + committedExtra;

    return {
      id: `${projectId}-${cc.code}`,
      projectId,
      costCode: cc.code,
      description: cc.description,
      category: cc.category,
      budgeted,
      committed: Math.min(committed, budgeted + Math.round(budgeted * 0.15)),
      spent,
    };
  });
}

export const budgetLineItems: BudgetLineItem[] = projects.flatMap((p, idx) =>
  buildBudgetForProject(p.id, p.contractValue, p.percentComplete, 42 + idx * 17)
);

// ---- selectors ----

export function getProject(id: string) {
  return projects.find((p) => p.id === id);
}

export function getRfisForProject(projectId: string) {
  return rfis.filter((r) => r.projectId === projectId);
}

export function getSubmittalsForProject(projectId: string) {
  return submittals.filter((s) => s.projectId === projectId);
}

export function getDailyLogsForProject(projectId: string) {
  return dailyLogs
    .filter((l) => l.projectId === projectId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPunchItemsForProject(projectId: string) {
  return punchItems.filter((t) => t.projectId === projectId);
}

export function getDocumentsForProject(projectId: string) {
  return documents.filter((d) => d.projectId === projectId);
}

export function getBudgetForProject(projectId: string) {
  return budgetLineItems.filter((b) => b.projectId === projectId);
}

export function projectTotals(projectId: string) {
  const lines = getBudgetForProject(projectId);
  const budgeted = lines.reduce((s, l) => s + l.budgeted, 0);
  const committed = lines.reduce((s, l) => s + l.committed, 0);
  const spent = lines.reduce((s, l) => s + l.spent, 0);
  return { budgeted, committed, spent, variance: budgeted - committed };
}

export function portfolioTotals() {
  return projects.reduce(
    (acc, p) => {
      const t = projectTotals(p.id);
      acc.budgeted += t.budgeted;
      acc.committed += t.committed;
      acc.spent += t.spent;
      acc.contractValue += p.contractValue;
      return acc;
    },
    { budgeted: 0, committed: 0, spent: 0, contractValue: 0 }
  );
}

export function openRfiCount(projectId?: string) {
  const list = projectId ? getRfisForProject(projectId) : rfis;
  return list.filter((r) => r.status === "open" || r.status === "pending-response" || r.status === "overdue").length;
}

export function overdueRfiCount(projectId?: string) {
  const list = projectId ? getRfisForProject(projectId) : rfis;
  return list.filter((r) => r.status === "overdue").length;
}

export function openPunchCount(projectId?: string) {
  const list = projectId ? getPunchItemsForProject(projectId) : punchItems;
  return list.filter((t) => t.status !== "closed").length;
}

export function pendingSubmittalCount(projectId?: string) {
  const list = projectId ? getSubmittalsForProject(projectId) : submittals;
  return list.filter((s) => s.status === "in-review" || s.status === "draft" || s.status === "revise-resubmit").length;
}
