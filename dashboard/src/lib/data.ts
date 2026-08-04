export type Project = {
  name: string
  status: string
  totalClaims: number
  docs: ProjectDoc[]
  tasks: TaskGroup[]
}

export type TaskGroup = {
  stream: string
  status: string
  date: string
  notes: string
  link: string
}

export type ProjectDoc = {
  file: string
  title: string
  claims: Claim[]
  handoff: string | null
  verdict: string | null
  sections: Section[]
  kv: { k: string; v: string }[]
}

export type Claim = {
  claim: string
  source: string
  grade: "observed" | "secondary" | "unverified" | "assumption"
}

export type Section = {
  title: string
  body: string
  tables: { header: string[]; rows: string[][] }[]
}

export const gradeStyles: Record<Claim["grade"], string> = {
  observed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  secondary: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  unverified: "bg-red-500/15 text-red-300 border-red-500/30",
  assumption: "bg-purple-500/15 text-purple-300 border-purple-500/30",
}

export const gradeLabel: Record<Claim["grade"], string> = {
  observed: "Observed",
  secondary: "Secondary",
  unverified: "Unverified",
  assumption: "Assumption",
}

export async function loadProjects(): Promise<Project[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/projects.json`)
  if (!res.ok) throw new Error(`Failed to load projects: ${res.status}`)
  return res.json()
}
