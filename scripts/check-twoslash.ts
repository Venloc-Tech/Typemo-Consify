/*
 * `bun run check:twoslash [page.mdx | dir ...]`: compiles every ```ts twoslash block of the synced pages — written
 * in the page or inserted by a `<Snippet id="…" twoslash />` tag from snippets/<version>/ — with the
 * twoslash of consify (the same transformer, TypeScript and compiler options as the site build), and lists every
 * block that fails, instead of stopping at the first one like the build does. Exit code 1 when a block fails. It also
 * fills the twoslash cache the build reads.
 *
 * Only what the build would compile is compiled. The pages of every language insert the same snippet files, so a
 * block is compiled once however many pages show it, and a block already in the cache is skipped: the cache is keyed
 * by the text of a block, and `bun run sync` empties it whenever the Typemo sources change.
 *
 * The blocks are compiled by worker threads, one block at a time as each worker gets free (a slow page does not hold
 * the others back). Each worker has its own compiler with the types of Typemo loaded (about 1.1 GB), so the default
 * is the number of cores, at most 4; TWOSLASH_WORKERS sets it. Progress is printed every 100 blocks.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { availableParallelism } from "node:os";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";
import { isMainThread, parentPort, Worker } from "node:worker_threads";

const SITE = resolve(import.meta.dirname, "..");
const ROOT = resolve(SITE, "content");
/* The folder of createFileSystemTypesCache (fumadocs-twoslash/cache-fs), which the build reads too. */
const CACHE = resolve(SITE, ".next/cache/twoslash");

/** One block to compile: where it is (for the report) and its code. */
interface Block {
  readonly where: string;
  readonly code: string;
}

/** The blocks with the same code: compiled once, reported at every place. */
interface Unique {
  readonly code: string;
  readonly where: string[];
}

/** What a worker answers for a block: `null` when it compiled, the first line of the error otherwise. */
interface Answer {
  readonly index: number;
  readonly error: string | null;
}

class TwoslashCheck {
  static readonly PROGRESS_EVERY = 100;
  static readonly MAX_DEFAULT_WORKERS = 4;

  static collect(path: string): string[] {
    if (statSync(path).isDirectory()) return readdirSync(path).flatMap((name) => TwoslashCheck.collect(join(path, name)));
    return path.endsWith(".mdx") ? [path] : [];
  }

  /**
   * The code of a `<Snippet>` tag, the way consify inserts it: the variant of the page language
   * (`snippets/<version>/<lang>/<id>`) or the common file, a `#region` when the id names one.
   */
  static snippetCode(file: string, id: string): string {
    const page = /content\/([^/]+)\/docs\/([^/]+)\//.exec(file.replaceAll("\\", "/"));
    const [lang = "", version = "WITHOUT_VERSION"] = page ? [page[1], page[2]] : [];
    const [path = "", region] = id.split("#");
    const candidates = [lang ? `${version}/${lang}/${path}` : "", `${version}/${path}`]
      .filter(Boolean)
      .flatMap((base) => [".ts", ".tsx"].map((ext) => resolve(SITE, "snippets", base + ext)));
    const found = candidates.find((candidate) => existsSync(candidate));
    if (!found) throw new Error(`${relative(SITE, file)}: snippet ${id} not found (tried ${candidates.map((c) => relative(SITE, c)).join(", ")})`);
    const text = readFileSync(found, "utf8").replace(/\n$/, "");
    if (region === undefined) return text;
    const lines = text.split("\n");
    const start = lines.findIndex((l) => new RegExp(`#region ${region}\\b`).test(l));
    const end = lines.findIndex((l, i) => i > start && /#endregion/.test(l));
    if (start < 0 || end < 0) throw new Error(`${relative(SITE, file)}: region ${region} not found in ${relative(SITE, found)}`);
    return lines.slice(start + 1, end).join("\n");
  }

  /** The twoslash blocks of a page (fenced or `<Snippet … twoslash />`), with the line each one starts at. */
  static blocksOf(file: string): Block[] {
    const blocks: Block[] = [];
    const lines = readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const tag = /^\s*<Snippet\s([^>]*)\/>\s*$/.exec(lines[i] ?? "");
      const id = tag ? /\bid="([^"]+)"/.exec(tag[1] ?? "")?.[1] : undefined;
      if (tag && id && /(^|\s)twoslash(\s|$)/.test(tag[1] ?? "")) {
        blocks.push({ where: `${relative(SITE, file)}:${i + 1} (${id})`, code: TwoslashCheck.snippetCode(file, id) });
        continue;
      }
      const open = /^(\s*)```ts twoslash\b/.exec(lines[i] ?? "");
      if (!open) continue;
      const indent = open[1]?.length ?? 0;
      const start = i + 1;
      while (i + 1 < lines.length && !/^\s*```\s*$/.test(lines[i + 1] ?? "")) i++;
      const code = lines
        .slice(start, i + 1)
        .map((l) => l.slice(indent))
        .join("\n");
      blocks.push({ where: `${relative(SITE, file)}:${start}`, code });
      i++;
    }
    return blocks;
  }

  /** The file the cache keeps a block in: the first 12 hex digits of the SHA-256 of its code, as cache-fs names it. */
  static cached(code: string): boolean {
    return existsSync(join(CACHE, `${createHash("SHA256").update(code).digest("hex").slice(0, 12)}.json`));
  }

  /** The blocks grouped by code, without those the cache already holds. */
  static toCompile(blocks: readonly Block[]): Unique[] {
    const byCode = new Map<string, string[]>();
    for (const block of blocks) {
      const places = byCode.get(block.code);
      if (places) places.push(block.where);
      else byCode.set(block.code, [block.where]);
    }
    return [...byCode].filter(([code]) => !TwoslashCheck.cached(code)).map(([code, where]) => ({ code, where }));
  }

  static workerCount(blocks: number): number {
    const fromEnv = Number(process.env.TWOSLASH_WORKERS);
    const wanted =
      Number.isInteger(fromEnv) && fromEnv > 0
        ? fromEnv
        : Math.min(availableParallelism(), TwoslashCheck.MAX_DEFAULT_WORKERS);
    return Math.max(1, Math.min(wanted, blocks));
  }

  static async main(): Promise<void> {
    const targets = process.argv.slice(2);
    const files = (targets.length > 0 ? targets.map((t) => resolve(t)) : [ROOT]).flatMap(TwoslashCheck.collect);
    const all = files.flatMap(TwoslashCheck.blocksOf);
    const unique = new Set(all.map((block) => block.code)).size;
    const blocks = TwoslashCheck.toCompile(all);
    const started = Date.now();
    console.log(
      `${all.length} twoslash blocks in ${files.length} pages, ${unique} different, ${unique - blocks.length} cached, ${blocks.length} to compile`,
    );
    if (blocks.length === 0) process.exit(0);
    const count = TwoslashCheck.workerCount(blocks.length);
    console.log(`${count} worker(s)`);

    const failures: string[] = [];
    let next = 0;
    let done = 0;
    await Promise.all(
      Array.from({ length: count }, () => {
        const worker = new Worker(new URL(import.meta.url));
        const give = (): void => {
          if (next < blocks.length) {
            const index = next++;
            worker.postMessage({ index, code: blocks[index]?.code });
          } else void worker.terminate();
        };
        return new Promise<void>((done_, fail) => {
          worker.on("message", (answer: Answer) => {
            done++;
            if (answer.error !== null) {
              failures.push(`${blocks[answer.index]?.where.join(", ")}: ${answer.error}`);
              console.log(failures.at(-1));
            }
            if (done % TwoslashCheck.PROGRESS_EVERY === 0 || done === blocks.length)
              console.log(`  ${done}/${blocks.length} (${Math.round((Date.now() - started) / 1000)} s)`);
            give();
          });
          worker.on("error", fail);
          worker.on("exit", () => done_());
          give();
        });
      }),
    );

    const seconds = Math.round((Date.now() - started) / 1000);
    console.log(`\n${blocks.length} twoslash blocks, ${failures.length} failed, ${seconds} s`);
    process.exit(failures.length > 0 ? 1 : 0);
  }

  /* A worker: one compiler for all its blocks, the same transformers and cache as the build. */
  static async worker(): Promise<void> {
    const port = parentPort;
    if (!port) throw new Error("check-twoslash: a worker without a parent");
    const [{ transformerTwoslash }, { createFileSystemTypesCache }, { codeToHast }, { default: ts }] = await Promise.all([
      import("fumadocs-twoslash"),
      import("fumadocs-twoslash/cache-fs"),
      import("shiki"),
      import("typescript"),
    ]);
    const { TwoslashPopups } = await import("../custom/plugins/twoslash-popups.ts");
    const { TypemoTwoslash } = await import("../custom/twoslash.ts");

    /* The options of docs.config.ts are tsconfig JSON; the compiler takes them parsed, as consify core converts them. */
    const parsed = ts.convertCompilerOptionsFromJson(TypemoTwoslash.compilerOptions(), SITE);
    if (parsed.errors.length > 0)
      throw new Error(parsed.errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n")).join("; "));
    /* The same cache as the build (docs.config.ts `cache: true`): checking first leaves the build only cached blocks. */
    const transformer = transformerTwoslash({
      twoslashOptions: { compilerOptions: parsed.options },
      typesCache: createFileSystemTypesCache({ cwd: SITE }),
    });

    port.on("message", async ({ index, code }: { index: number; code: string }) => {
      let error: string | null = null;
      try {
        await codeToHast(code, {
          lang: "ts",
          themes: { light: "github-light", dark: "github-dark" },
          meta: { __raw: "twoslash" },
          transformers: [transformer, TwoslashPopups.transformer()],
        });
      } catch (caught) {
        error = String((caught as { description?: string }).description ?? caught).split("\n")[0] ?? "error";
      }
      port.postMessage({ index, error } satisfies Answer);
    });
  }
}

await (isMainThread ? TwoslashCheck.main() : TwoslashCheck.worker());
