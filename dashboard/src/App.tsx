import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import {
  ArrowLeft,
  ClipboardList,
  ExternalLink,
  FolderGit2,
  FileText,
  Gauge,
  ListTree,
  Scale,
} from "lucide-react"

import {
  DataGrid,
  DataGridContainer,
} from "@/components/reui/data-grid/data-grid"
import {
  DataGridTable,
  DataGridTableRowExpand,
} from "@/components/reui/data-grid/data-grid-table"
import { Badge } from "@/components/reui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThemeToggle, useTheme } from "@/components/theme-toggle"
import { OpportunitiesKanban } from "@/components/opportunities-kanban"
import {
  loadProjects,
  gradeStyles,
  gradeLabel,
  type Project,
  type ProjectDoc,
  type Claim,
  type TaskGroup,
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
  tone = "primary",
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  tone?: "primary" | "success" | "warning" | "info"
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-lg">
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-semibold text-foreground">{value}</div>
        <div className="truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

type TreeRow =
  | {
      kind: "project"
      id: string
      name: string
      status: string
      docsCount: number
      claimsCount: number
      subRows: TreeRow[]
    }
  | {
      kind: "stream"
      id: string
      projectName: string
      stream: string
      done: number
      total: number
      subRows: TreeRow[]
    }
  | {
      kind: "step"
      id: string
      projectName: string
      stream: string
      step: string
      status: string
      date: string
      notes: string
      link: string
    }

function buildTree(projects: Project[]): TreeRow[] {
  return projects.map((p) => {
    const subRows: TreeRow[] = p.tasks.map((g: TaskGroup) => {
      const total = g.steps.length
      const done = g.steps.filter((s) => /done/i.test(s.status)).length
      return {
        kind: "stream",
        id: `${p.name}::${g.stream}`,
        projectName: p.name,
        stream: g.stream,
        done,
        total,
        subRows: g.steps.map((s, i) => ({
          kind: "step",
          id: `${p.name}::${g.stream}::${i}`,
          projectName: p.name,
          stream: g.stream,
          step: s.step,
          status: s.status,
          date: s.date,
          notes: s.notes,
          link: s.link,
        })),
      }
    })
    return {
      kind: "project",
      id: p.name,
      name: p.name,
      status: p.status,
      docsCount: p.docs.length,
      claimsCount: p.totalClaims,
      subRows,
    }
  })
}

function MasterGrid({
  projects,
  onSelect,
  onOpenStream,
}: {
  projects: Project[]
  onSelect: (p: Project) => void
  onOpenStream: (projectName: string, stream: string) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const data = useMemo(() => buildTree(projects), [projects])
  const columns = useMemo<ColumnDef<TreeRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Project / Task",
        cell: ({ row }) => {
          const r = row.original
          return (
            <div className="flex items-center gap-2">
              <DataGridTableRowExpand row={row} indent={24} />
              {r.kind === "project" && (
                <>
                  <FolderGit2 className="size-4 text-primary" />
                  <span className="font-medium text-foreground">{r.name}</span>
                </>
              )}
              {r.kind === "stream" && (
                <>
                  <ListTree className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-semibold text-foreground">{r.stream}</span>
                  <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    {r.done}/{r.total} done
                  </span>
                </>
              )}
              {r.kind === "step" && (
                <span className="truncate text-muted-foreground">{r.step}</span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const r = row.original
          if (r.kind === "project") return <StatusBadge status={r.status} />
          if (r.kind === "stream") return <span className="text-xs text-muted-foreground">stream</span>
          return <StatusBadge status={r.status} />
        },
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => {
          const r = row.original
          if (r.kind === "step") return <span className="text-xs text-muted-foreground">{r.date}</span>
          if (r.kind === "project") return <span className="text-muted-foreground">{r.docsCount} docs</span>
          return <span className="text-xs text-muted-foreground">—</span>
        },
      },
      {
        accessorKey: "claimsCount",
        header: "Claims",
        cell: ({ row }) => {
          const r = row.original
          if (r.kind === "project") return <span className="text-muted-foreground">{r.claimsCount}</span>
          return null
        },
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => {
          const r = row.original
          if (r.kind === "step" && r.notes)
            return <span className="line-clamp-1 text-xs text-muted-foreground">{r.notes}</span>
          return null
        },
      },
      {
        accessorKey: "result",
        header: "Result",
        cell: ({ row }) => {
          const r = row.original
          if (r.kind !== "step" || !r.link) return null
          return (
            <a
              href={r.link}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs text-primary transition-colors hover:bg-muted"
            >
              Open <ExternalLink className="size-3" />
            </a>
          )
        },
      },
    ],
    [],
  )

  const table = useReactTable({
    data,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded as (updater: unknown) => void,
    getRowId: (row) => row.id,
    getSubRows: (row) => ("subRows" in row ? row.subRows : undefined),
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  })

  return (
    <DataGridContainer>
      <DataGrid
        table={table}
        recordCount={projects.length}
        onRowClick={(row: TreeRow) => {
          if (row.kind === "project") onSelect(projects.find((p) => p.name === row.name)!)
          if (row.kind === "stream") onOpenStream(row.projectName, row.stream)
          if (row.kind === "step") onOpenStream(row.projectName, row.stream)
        }}
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

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-2.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

function MarkdownTable({ header, rows }: { header: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40">
          <tr>
            {header.map((h, i) => (
              <th key={i} className="px-3 py-2 font-medium text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={cn("border-t border-border/60", ri % 2 === 1 && "bg-muted/20")}>
              {row.map((c, ci) => (
                <td key={ci} className="px-3 py-2 text-muted-foreground">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DocBlock({ doc }: { doc: ProjectDoc }) {
  const candidatesSection = doc.sections.find((s) =>
    /candidate|pipeline/i.test(s.title || ""),
  )

  return (
    <div className="space-y-5">
      <SectionCard
        title={doc.title}
        icon={<ClipboardList className="size-4" />}
      >
        {doc.sections
          .filter((s) => s.body.replace(/\s/g, "").length > 0)
          .map((s, i) => {
            const isCandidates = candidatesSection === s
            return (
              <div key={i} className={cn("space-y-3", i > 0 && "mt-5 border-t border-border/60 pt-5")}>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.title}
                </h4>

                {isCandidates && s.tables.length > 0 ? (
                  <OpportunitiesKanban header={s.tables[0].header} rows={s.tables[0].rows} />
                ) : null}

                <div className={cn(isCandidates && s.tables.length > 0 && "hidden")}>
                  <Markdown text={s.body} />
                </div>
              </div>
            )
          })}
      </SectionCard>

      {doc.claims.length > 0 && (
        <SectionCard title={`Evidence Ledger (${doc.claims.length})`} icon={<Scale className="size-4" />}>
          <ClaimsTable claims={doc.claims} />
        </SectionCard>
      )}

      {doc.verdict && (
        <SectionCard title="Verdict" icon={<Gauge className="size-4" />}>
          <Markdown text={doc.verdict} />
        </SectionCard>
      )}

    </div>
  )
}

function ProjectView({
  project,
  projects,
  onBack,
  onSelectProject,
}: {
  project: Project
  projects: Project[]
  onBack: () => void
  onSelectProject: (p: Project | null) => void
}) {
  const totalClaims = project.totalClaims
  const gradeCounts = useMemo(() => {
    const acc = { observed: 0, secondary: 0, unverified: 0, assumption: 0 }
    for (const d of project.docs)
      for (const c of d.claims) acc[c.grade]++
    return acc
  }, [project])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Overview
        </button>
        <Select
          value={project.name}
          onValueChange={(v) => {
            const p = projects.find((x) => x.name === v)
            onSelectProject(p ?? null)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.name} value={p.name}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
        <StatCard icon={<Scale className="size-5" />} label="Claims" value={totalClaims} tone="info" />
        <StatCard icon={<Gauge className="size-5" />} label="Observed" value={gradeCounts.observed} tone="success" />
        <StatCard icon={<Gauge className="size-5" />} label="Secondary" value={gradeCounts.secondary} tone="warning" />
      </div>

      {project.docs.map((doc) => (
        <DocBlock key={doc.file} doc={doc} />
      ))}
    </div>
  )
}

function StreamView({
  project,
  stream,
  onBack,
}: {
  project: Project
  stream: TaskGroup
  onBack: () => void
}) {
  const total = stream.steps.length
  const done = stream.steps.filter((s) => /done/i.test(s.status)).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Overview
        </button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FolderGit2 className="size-4" />
          <span>{project.name}</span>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-foreground">{stream.stream}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Work-stream in {project.name} · {done}/{total} steps done
        </p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-3">
        {stream.steps.map((s, i) => (
          <div key={i} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={s.status} />
                <span className="text-sm font-medium text-foreground">{s.step}</span>
              </div>
              {s.date && <div className="text-xs text-muted-foreground">{s.date}</div>}
              {s.notes && <div className="text-sm text-muted-foreground">{s.notes}</div>}
            </div>
            {s.link && (
              <a
                href={s.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-primary transition-colors hover:bg-muted"
              >
                Open result <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Header({
  projects,
  selected,
  onSelectProject,
  theme,
  onToggleTheme,
}: {
  projects: Project[]
  selected: Project | null
  onSelectProject: (p: Project | null) => void
  theme: "dark" | "light"
  onToggleTheme: () => void
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
        <button
          onClick={() => onSelectProject(null)}
          className="flex items-center gap-2 text-foreground"
        >
          <FolderGit2 className="size-5 text-primary" />
          <span className="text-sm font-semibold">Project Dashboards</span>
        </button>

        <div className="flex items-center gap-2">
          <Select
            value={selected?.name ?? "__overview"}
            onValueChange={(v) => {
              const p = projects.find((x) => x.name === v)
              onSelectProject(p ?? null)
            }}
          >
            <SelectTrigger className="w-44 md:w-52">
              <SelectValue placeholder="Overview" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__overview">Overview</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.name} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  )
}

export default function App() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [selected, setSelected] = useState<Project | null>(null)
  const [streamView, setStreamView] = useState<{ project: Project; stream: TaskGroup } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { theme, toggle } = useTheme()

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
      <div className="flex h-screen items-center justify-center p-8 text-sm text-destructive">
        Failed to load project data: {error}
      </div>
    )

  if (!projects)
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )

  const totalClaims = projects.reduce((a, p) => a + p.totalClaims, 0)

  return (
    <div className="min-h-screen bg-background">
      <Header
        projects={projects}
        selected={selected}
        onSelectProject={(p) => {
          setStreamView(null)
          setSelected(p)
        }}
        theme={theme}
        onToggleTheme={toggle}
      />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {streamView ? (
          <StreamView
            project={streamView.project}
            stream={streamView.stream}
            onBack={() => setStreamView(null)}
          />
        ) : selected ? (
          <ProjectView
            project={selected}
            projects={projects}
            onBack={() => setSelected(null)}
            onSelectProject={setSelected}
          />
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Projects — Master Overview</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Auto-generated from{" "}
                <code className="rounded bg-muted px-1 text-primary">docs/*.md</code>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <StatCard icon={<FolderGit2 className="size-5" />} label="Projects" value={projects.length} />
              <StatCard icon={<Scale className="size-5" />} label="Total Claims" value={totalClaims} tone="info" />
              <StatCard
                icon={<FileText className="size-5" />}
                label="Documents"
                value={projects.reduce((a, p) => a + p.docs.length, 0)}
                tone="warning"
              />
            </div>

            <MasterGrid
              projects={projects}
              onSelect={setSelected}
              onOpenStream={(projectName, streamName) => {
                const project = projects.find((p) => p.name === projectName)
                const stream = project?.tasks.find((t) => t.stream === streamName)
                if (project && stream) setStreamView({ project, stream })
              }}
            />

            <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
              <ListTree className="size-3.5" /> Click a stream or task to open its detail · a project row opens the project
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
