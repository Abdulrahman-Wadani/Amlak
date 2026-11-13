export function S(str: string): Record<string, string> {
  const o: Record<string, string> = {}
  for (const d of str.split(";")) {
    const i = d.indexOf(":")
    if (i < 0) continue
    const k = d
      .slice(0, i)
      .trim()
      .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    if (k) o[k] = d.slice(i + 1).trim()
  }
  return o
}
