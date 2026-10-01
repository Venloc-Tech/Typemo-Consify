/*
 * `bun run check:twoslash [page.mdx | dir ...]`: compiles every ```ts twoslash block of the synced pages with the
 * twoslash of consify (the same transformer, TypeScript and compiler options as the site build), and lists every
 * block that fails, instead of stopping at the first one like the build does. Exit code 1 when a block fails. It also
 * fills the twoslash cache the build reads.
 *
 * The blocks are compiled by worker threads, one block at a time as each worker gets free (a slow page does not hold
 * the others back). Each worker has its own compiler with the types of Typemo loaded (about 1.1 GB), so the default
 * is the number of cores, at most 4; TWOSLASH_WORKERS sets it. Progress is printed every 100 blocks.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { availableParallelism } from "node:os";
import { join, relative, resolve } from "node:path";
import { isMainThread, parentPort, Worker } from "node:worker_threads";

const SITE = resolve(import.meta.dirname, "..");
const ROOT = resolve(SITE, "content");

/** One block to compile: where it is (for the report) and its code. */
interface Block {
  readonly where: string;
  readonly code: string;
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

  /** The ```ts twoslash blocks of a page, with the line each one starts at. */
  static blocksOf(file: string): Block[] {
    const blocks: Block[] = [];
    const lines = readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
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
    const blocks = files.flatMap(TwoslashCheck.blocksOf);
    const count = TwoslashCheck.workerCount(blocks.length);
    const started = Date.now();
    console.log(`${blocks.length} twoslash blocks in ${files.length} pages, ${count} worker(s)`);

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
              failures.push(`${blocks[answer.index]?.where}: ${answer.error}`);
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
