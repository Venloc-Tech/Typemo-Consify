/*
 * `bun run check:twoslash [page.mdx | dir ...]`: compiles every ```ts twoslash block of the synced pages with the
 * twoslash of consify (the same transformer, TypeScript and compiler options as the site build), and lists every block that
 * fails, instead of stopping at the first one like the build does. Exit code 1 when a block fails. It also fills the
 * twoslash cache the build reads.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { transformerTwoslash } from "fumadocs-twoslash";
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs";
import { codeToHast } from "shiki";
import ts from "typescript";
import { TwoslashPopups } from "../custom/plugins/twoslash-popups.ts";
import { TypemoTwoslash } from "../custom/twoslash.ts";

const SITE = resolve(import.meta.dirname, "..");
const ROOT = resolve(SITE, "content");

const collect = (path: string): string[] =>
  statSync(path).isDirectory()
    ? readdirSync(path).flatMap((name) => collect(join(path, name)))
    : path.endsWith(".mdx")
      ? [path]
      : [];

/** The ```ts twoslash blocks of a page, with the line each one starts at. */
const blocksOf = (text: string): { line: number; code: string }[] => {
  const blocks: { line: number; code: string }[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const open = /^(\s*)```ts twoslash\b/.exec(lines[i] ?? "");
    if (!open) continue;
    const indent = open[1]?.length ?? 0;
    const start = i + 1;
    while (i + 1 < lines.length && !/^\s*```\s*$/.test(lines[i + 1] ?? "")) i++;
    blocks.push({ line: start, code: lines.slice(start, i + 1).map((l) => l.slice(indent)).join("\n") });
    i++;
  }
  return blocks;
};

const targets = process.argv.slice(2);
const files = (targets.length > 0 ? targets.map((t) => resolve(t)) : [ROOT]).flatMap(collect);
/* The options of docs.config.ts are tsconfig JSON; the compiler takes them parsed, as consify core converts them. */
const parsed = ts.convertCompilerOptionsFromJson(TypemoTwoslash.compilerOptions(), SITE);
if (parsed.errors.length > 0)
  throw new Error(parsed.errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n")).join("; "));
/* The same cache as the build (docs.config.ts `cache: true`): checking first leaves the build only cached blocks. */
const transformer = transformerTwoslash({
  twoslashOptions: { compilerOptions: parsed.options },
  typesCache: createFileSystemTypesCache({ cwd: SITE }),
});

const MAX_BLOCK_BYTES = 300_000;
let total = 0;
const warnings: string[] = [];
const failures: string[] = [];
for (const file of files) {
  for (const block of blocksOf(readFileSync(file, "utf8"))) {
    total++;
    try {
      const hast = await codeToHast(block.code, {
        lang: "ts",
        themes: { light: "github-light", dark: "github-dark" },
        meta: { __raw: "twoslash" },
        transformers: [transformer, TwoslashPopups.transformer()],
      });
      /* the HTML of a block ends up in the page twice (HTML and the compiled MDX): keep it small */
      const size = JSON.stringify(hast).length;
      if (size > MAX_BLOCK_BYTES) warnings.push(`${relative(SITE, file)}:${block.line}: ${(size / 1e6).toFixed(1)} MB of HTML`);
    } catch (error) {
      const message = String((error as { description?: string }).description ?? error).split("\n")[0];
      failures.push(`${relative(SITE, file)}:${block.line}: ${message}`);
      console.log(failures.at(-1));
    }
  }
}
for (const warning of warnings) console.log(`warning: ${warning}`);
console.log(`\n${total} twoslash blocks, ${failures.length} failed, ${warnings.length} heavier than ${MAX_BLOCK_BYTES / 1e3} kB`);
process.exit(failures.length > 0 ? 1 : 0);
