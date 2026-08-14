export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ")
}

export const fmt = (n: number) => n.toLocaleString("en-US")
