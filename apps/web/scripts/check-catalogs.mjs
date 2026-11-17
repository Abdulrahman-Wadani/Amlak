#!/usr/bin/env node
// Checks the Lingui catalogs and the source for translation mistakes.
// Run after `lingui extract --clean` (see the "i18n:check" script):
//   - every msgid appears once per catalog, with no obsolete (#~) entries
//   - en.po and ar.po have the same msgids
//   - every msgstr is filled in, in both catalogs
//   - an Arabic translation keeps the placeholders of its English source
//   - no line is malformed (for example `msgstr:` with a colon)
//   - no Arabic text is written in the source, except where allowed below
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const root = new URL("..", import.meta.url).pathname
const locales = join(root, "src/locales")
const problems = []

function parse(file) {
  const text = readFileSync(join(locales, file), "utf8")
  const entries = new Map()
  const blocks = text.split(/\n\s*\n/)
  for (const block of blocks) {
    for (const line of block.split("\n")) {
      if (line && !/^(#|msgid |msgstr |msgctxt |")/.test(line)) {
        problems.push(`${file}: malformed line: ${line}`)
      }
    }
    if (/^#~ /m.test(block)) {
      problems.push(`${file}: obsolete entry: ${block.split("\n").find((l) => l.startsWith("#~ msgid"))}`)
      continue
    }
    const id = block.match(/^msgid "(.*)"$/m)
    if (!id || id[1] === "") continue
    const str = block.match(/^msgstr "(.*)"$/m)
    if (entries.has(id[1])) problems.push(`${file}: duplicate msgid "${id[1]}"`)
    entries.set(id[1], str ? str[1] : null)
  }
  return entries
}

// The names of placeholders and plural variables, e.g. {0}, {name}, {count, plural, ...}.
function placeholders(message) {
  return [...message.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).sort().join(",")
}

const en = parse("en.po")
const ar = parse("ar.po")

for (const [id, str] of en) {
  if (!ar.has(id)) problems.push(`ar.po: missing msgid "${id}"`)
  if (!str) problems.push(`en.po: empty msgstr for "${id}"`)
}
for (const [id, str] of ar) {
  if (!en.has(id)) problems.push(`ar.po: msgid not in en.po "${id}"`)
  if (!str) problems.push(`ar.po: empty msgstr for "${id}"`)
  else if (placeholders(id) !== placeholders(str)) {
    problems.push(`ar.po: placeholders differ for "${id}": "${str}"`)
  }
}

// Arabic allowed in the source: the language names shown in language
// pickers (each language by its own name), and translator comments.
const allowed = [
  { file: "src/lib/i18n.tsx", line: /^\s*ar: "العربية",$/ },
  { file: null, line: /<Trans comment="/ },
]
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      if (name !== "locales") walk(path)
    } else if (/\.(ts|tsx)$/.test(name) && name !== "routeTree.gen.ts") {
      const file = relative(root, path)
      readFileSync(path, "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (/[؀-ۿ]/.test(line) && !allowed.some((a) => (a.file === null || a.file === file) && a.line.test(line))) {
            problems.push(`${file}:${i + 1}: Arabic text in the source: ${line.trim()}`)
          }
        })
    }
  }
}
walk(join(root, "src"))

if (problems.length > 0) {
  console.error(problems.join("\n"))
  console.error(`\n${problems.length} problem(s).`)
  process.exit(1)
}
console.log(`Catalogs OK: ${en.size} messages, each translated in en.po and ar.po.`)
