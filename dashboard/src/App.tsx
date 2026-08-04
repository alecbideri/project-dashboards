import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowLeft, ArrowUpDown, FolderGit2, FileText, Scale } from "lucide-react"

import {
  DataGrid,
  DataGridContainer,
} from "@/components/reui/data-grid/data-grid"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import { Badge } from "@/components/reui/badge"
import {
  loadProjects,
  gradeStyles,
  gradeLabel,
  type Project,
  type ProjectDoc,
  type Claim,
} from "@/lib/data"
import { Markdown } from "@/lib/markdown"
import { cn } from "@/lib/utils"

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "Pursuing"
      ? "success-light"
      : status === "Shortlisted"
        ? "info-light"
        : status === "Dropped"
          ? "destructive-light"
          : "secondary"
  return <Badge variant={variant}>{status}</Badge>
}

function GradeBadge({ grade }: { grade: Claim["grade"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        gradeStyles[grade],
      )}
    >
      {gradeLabel[grade]}
    </span>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

function MasterGrid({ projects, onSelect }: { projects: Project[]; onSelect: (p: Project) => void }) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Project",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 font-medium text-foreground">
            <FolderGit2 className="size-4 text-primary" />
            {row.original.name}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "docs",
        header: "Docs",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.docs.length}</span>
        ),
      },
      {
        accessorKey: "totalClaims",
        header: "Claims",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.totalClaims}</span>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: projects,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <DataGridContainer>
      <DataGrid
        table={table}
        recordCount={projects.length}
        onRowClick={onSelect}
        tableLayout={{
          headerSticky: true,
          headerBackground: true,
          rowBorder: true,
          rowRounded: true,
          columnsResizable: false,
        }}
      >
        <DataGridTable />
      </DataGrid>
    </DataGridContainer>
  )
}

function ClaimsTable({ claims }: { claims: Claim[] }) {
  const columns = useMemo<ColumnDef<Claim>[]>(
    () => [
      {
        accessorKey: "grade",
        header: "Grade",
        cell: ({ row }) => <GradeBadge grade={row.original.grade} />,
      },
      {
        accessorKey: "claim",
        header: "Claim",
        cell: ({ row }) => <span className="text-foreground">{row.original.claim}</span>,
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.source}</span>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: claims,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <DataGridContainer>
      <DataGrid
        table={table}
        recordCount={claims.length}
        tableLayout={{
          dense: true,
          headerSticky: true,
          headerBackground: true,
          rowBorder: true,
          columnsResizable: false,
        }}
      >
        <DataGridTable />
      </DataGrid>
    </DataGridContainer>
  )
}

function DocBlock({ doc }: { doc: ProjectDoc }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground">{doc.title}</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{doc.claims.length} claims</Badge>
        </div>
      </div>

      {doc.claims.length > 0 && (
        <div className="mb-5">
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">Evidence Ledger</h4>
          <ClaimsTable claims={doc.claims} />
        </div>
      )}

      {doc.verdict && (
        <div className="mb-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <h4 className="mb-1 text-sm font-semibold text-primary">Verdict</h4>
          <Markdown text={doc.verdict} />
        </div>
      )}

      {doc.handoff && (
        <div className="mb-5 rounded-lg border border-muted bg-muted/30 p-4">
          <h4 className="mb-1 text-sm font-semibold text-muted-foreground">Handoff Context</h4>
          <Markdown text={doc.handoff} />
        </div>
      )}

      {doc.sections.map((s, i) =>
        s.body.replace(/\s/g, "").length === 0 ? null : (
          <div key={i} className={cn("py-2", i > 0 && "border-t border-border/60")}>
            <Markdown text={`### ${s.title}\n\n${s.body}`} />
          </div>
        ),
      )}
    </section>
  )
}

function ProjectView({ project, onBack }: { project: Project; onBack: () => void }) {
  const totalClaims = project.totalClaims
  const gradeCounts = useMemo(() => {
    const acc = { observed: 0, secondary: 0, unverified: 0, assumption: 0 }
    for (const d of project.docs)
      for (const c of d.claims) acc[c.grade]++
    return acc
  }, [project])

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to projects
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.docs.length} documents · {totalClaims} graded claims
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<FileText className="size-5" />} label="Docs" value={project.docs.length} />
        <StatCard icon={<Scale className="size-5" />} label="Claims" value={totalClaims} />
        <StatCard icon={<Scale className="size-5" />} label="Observed" value={gradeCounts.observed} />
        <StatCard icon={<Scale className="size-5" />} label="Secondary" value={gradeCounts.secondary} />
      </div>

      {project.docs.map((doc) => (
        <DocBlock key={doc.file} doc={doc} />
      ))}
    </div>
  )
}

export default function App() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [selected, setSelected] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setProjects(await loadProjects())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (error)
    return (
      <div className="p-8 text-sm text-destructive">
        Failed to load project data: {error}
      </div>
    )

  if (!projects)
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )

  if (selected) return <ProjectView project={selected} onBack={() => setSelected(null)} />

  const totalClaims = projects.reduce((a, p) => a + p.totalClaims, 0)

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects — Master Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-generated from <code className="rounded bg-muted px-1 text-primary">docs/*.md</code>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard icon={<FolderGit2 className="size-5" />} label="Projects" value={projects.length} />
          <StatCard icon={<Scale className="size-5" />} label="Total Claims" value={totalClaims} />
          <StatCard icon={<FileText className="size-5" />} label="Documents" value={projects.reduce((a, p) => a + p.docs.length, 0)} />
        </div>

        <MasterGrid projects={projects} onSelect={setSelected} />

        <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
          <ArrowUpDown className="size-3.5" /> Click a header to sort · click a row to open
        </div>
      </div>
    </div>
  )
}
