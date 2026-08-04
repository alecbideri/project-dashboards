import { Fragment, type ReactNode } from "react"

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {tok.slice(2, -2)}
        </strong>,
      )
    } else {
      parts.push(
        <code
          key={key++}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-primary"
        >
          {tok.slice(1, -1)}
        </code>,
      )
    }
    last = m.index + tok.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function parseTableLines(lines: string[]): { header: string[]; rows: string[][] } {
  const cells = (l: string) =>
    l
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim())
  const header = cells(lines[0])
  const rows = lines.slice(2).filter((l) => l.trim()).map(cells)
  return { header, rows }
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/)
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  let tableLines: string[] | null = null
  let key = 0

  const flushList = () => {
    if (!list) return
    const items = list.items
    const Tag = list.ordered ? "ol" : "ul"
    blocks.push(
      <Tag key={key++} className={`${list.ordered ? "list-decimal" : "list-disc"} space-y-1.5 pl-5 text-sm text-muted-foreground`}>
        {items.map((it, i) => (
          <li key={i}>{renderInline(it)}</li>
        ))}
      </Tag>,
    )
    list = null
  }

  const flushTable = () => {
    if (!tableLines) return
    const { header, rows } = parseTableLines(tableLines)
    blocks.push(
      <div key={key++} className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              {header.map((h, i) => (
                <th key={i} className="px-3 py-2 font-medium text-muted-foreground">
                  {renderInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-t border-border/60">
                {row.map((c, ci) => (
                  <td key={ci} className="px-3 py-2 text-muted-foreground">
                    {renderInline(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    )
    tableLines = null
  }

  for (const raw of lines) {
    const line = raw.replace(/\r$/, "")

    if (tableLines) {
      if (line.includes("|")) {
        tableLines.push(line)
        continue
      }
      flushTable()
    }

    const hm = line.match(/^(#{1,3})\s+(.*)$/)
    if (hm) {
      flushList()
      const Tag = hm[1].length === 1 ? "h2" : "h3"
      blocks.push(
        <Tag key={key++} className={`${hm[1].length === 1 ? "mt-6 mb-3 text-lg font-semibold" : "mt-4 mb-2 text-base font-semibold"} text-foreground`}>
          {renderInline(hm[2])}
        </Tag>,
      )
      continue
    }

    if (/^\s*(\|.*\|)\s*$/.test(line) && lines[lines.indexOf(raw) + 1]?.replace(/\r$/, "").match(/^\s*\|[\s:-|]+\|\s*$/)) {
      flushList()
      tableLines = [line]
      continue
    }

    const lm = line.match(/^\s*[-*+]\s+(.+)$/)
    if (lm) {
      if (!list) list = { ordered: false, items: [] }
      list.items.push(lm[1])
      continue
    }
    const om = line.match(/^\s*\d+[.)]\s+(.+)$/)
    if (om) {
      if (!list) list = { ordered: true, items: [] }
      list.items.push(om[1])
      continue
    }
    flushList()

    if (line.trim() === "---") {
      blocks.push(<hr key={key++} className="my-4 border-border" />)
      continue
    }

    if (line.trim() === "") {
      continue
    }

    if (line.trim().startsWith("```")) {
      const code: string[] = []
      while (lines.length > 0 && !lines[0].replace(/\r$/, "").trim().startsWith("```")) {
        code.push(lines.shift()!.replace(/\r$/, ""))
      }
      blocks.push(
        <pre key={key++} className="overflow-x-auto rounded-lg bg-muted/50 p-3 font-mono text-sm text-foreground">
          {code.join("\n")}
        </pre>,
      )
      continue
    }

    const fm = line.match(/^\s*\*\*(.+?)\*\*:\s*(.+)$/)
    if (fm) {
      blocks.push(
        <div key={key++} className="py-0.5 text-sm text-muted-foreground">
          <strong className="font-semibold text-foreground">{renderInline(fm[1])}:</strong>{" "}
          {renderInline(fm[2])}
        </div>,
      )
      continue
    }

    if (line.trim().startsWith("- ")) continue

    blocks.push(
      <p key={key++} className="py-1 text-sm text-muted-foreground">
        {renderInline(line)}
      </p>,
    )
  }
  flushList()
  flushTable()

  return <Fragment>{blocks}</Fragment>
}
