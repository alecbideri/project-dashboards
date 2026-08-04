import { useMemo, useState } from "react"
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
} from "@/components/reui/kanban"
import { Badge } from "@/components/reui/badge"

export type CandidateRow = string[]

export function OpportunitiesKanban({
  header,
  rows,
}: {
  header: string[]
  rows: string[][]
}) {
  const statusIdx = header.findIndex((h) => h.toLowerCase().includes("status"))
  const companyIdx = header.findIndex((h) => h.toLowerCase().includes("company"))
  const conceptIdx = header.findIndex((h) =>
    h.toLowerCase().includes("concept"),
  )
  const potentialIdx = header.findIndex((h) =>
    h.toLowerCase().includes("potential"),
  )

  const statuses = useMemo(() => {
    const s = new Set<string>()
    for (const row of rows) s.add(statusIdx >= 0 ? row[statusIdx] || "—" : "—")
    return [...s]
  }, [rows, statusIdx])

  const initial = useMemo(() => {
    const acc: Record<string, { id: string; company: string; concept: string; potential: string }[]> = {}
    for (const s of statuses) acc[s] = []
    for (const [i, row] of rows.entries()) {
      const s = statusIdx >= 0 ? row[statusIdx] || "—" : "—"
      acc[s].push({
        id: `row-${i}`,
        company: companyIdx >= 0 ? row[companyIdx] : "",
        concept: conceptIdx >= 0 ? row[conceptIdx] : "",
        potential: potentialIdx >= 0 ? row[potentialIdx] : "",
      })
    }
    return acc
  }, [rows, statuses, statusIdx, companyIdx, conceptIdx, potentialIdx])

  const [columns, setColumns] = useState(initial)

  return (
    <Kanban value={columns} onValueChange={setColumns} getItemValue={(i) => i.id}>
      <KanbanBoard className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statuses.map((s) => (
          <KanbanColumn key={s} value={s} className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-foreground">{s}</span>
              <Badge variant="secondary">{columns[s].length}</Badge>
            </div>
            <KanbanColumnContent value={s} className="min-h-10">
              {columns[s].map((item) => (
                <KanbanItem
                  key={item.id}
                  value={item.id}
                  className="rounded-lg border border-border bg-card p-3 shadow-sm"
                >
                  <div className="text-sm font-medium text-foreground">{item.company}</div>
                  {item.concept && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.concept}</p>
                  )}
                  {item.potential && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">{item.potential}</Badge>
                    </div>
                  )}
                </KanbanItem>
              ))}
            </KanbanColumnContent>
          </KanbanColumn>
        ))}
      </KanbanBoard>
    </Kanban>
  )
}
