/*
 * `bun run sync`: copies the documentation of the Typemo checkout into `content/` and generates the data the
 * custom components read (`custom/generated/`). Nothing synced is committed: the Typemo repository is the only
 * source of the pages, the site only renders them.
 *
 *  - docs/ru/v1            → content/ru/docs/v1 (the version folder gets `"root": "version"`)
 *  - BsonTypeTable         → custom/generated/value-forms.json (<ValueForms />)
 *  - appendix/glossary.mdx → custom/generated/glossary.json (<Term />)
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, posix, resolve } from "node:path";
import { TypemoSource } from "./typemo-source.ts";

const SITE = resolve(import.meta.dirname, "..");
const LANGUAGES = ["ru"] as const;
const VERSION = "v1";
const GENERATED = resolve(SITE, "custom/generated");

type FormKey = "hydrated" | "lean" | "object" | "plain" | "json";

interface ValueFormsRow {
  key: string;
  alias: string;
  forms: Record<FormKey, string>;
}

interface GlossaryEntry {
  title: string;
  definition: string;
  href: string | null;
}

class DocsSync {
  static writeJson(path: string, value: unknown): void {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  }

  static copyPages(language: string): void {
    const from = TypemoSource.path("docs", language, VERSION);
    const docs = resolve(SITE, "content", language, "docs");
    rmSync(docs, { recursive: true, force: true });
    cpSync(from, resolve(docs, VERSION), { recursive: true, filter: (path) => !path.endsWith(".gitkeep") });

    /* consify finds a version by `"root": "version"` in the meta.json of its folder. */
    const metaPath = resolve(docs, VERSION, "meta.json");
    const meta = JSON.parse(readFileSync(metaPath, "utf8")) as Record<string, unknown>;
    DocsSync.writeJson(metaPath, { ...meta, title: VERSION, root: "version" });
    DocsSync.writeJson(resolve(docs, "meta.json"), { pages: [VERSION] });
  }

  /*
   * `$toObject()` keeps the lean values and turns maps back into `Map` (docs: reference/values/value-forms.mdx),
   * so its column is derived from the lean one instead of being a sixth hand-written form.
   */
  static objectForm(key: string, lean: string): string {
    if (key === "map") return "Map<string, ObjectFormOf<V>>";
    return lean.replaceAll("LeanValue", "ObjectFormOf");
  }

  static async valueForms(): Promise<ValueFormsRow[]> {
    const { BsonTypeTable } = (await import(TypemoSource.path("packages/typemo/src/index.ts"))) as {
      BsonTypeTable: {
        keys: readonly string[];
        scalars: Record<string, { key: string; alias: string; forms: Record<Exclude<FormKey, "object">, string> }>;
        containers: Record<string, { key: string; alias: string; forms: Record<Exclude<FormKey, "object">, string> }>;
      };
    };
    return BsonTypeTable.keys.map((key) => {
      const row = BsonTypeTable.scalars[key] ?? BsonTypeTable.containers[key];
      if (!row) throw new Error(`BsonTypeTable has no row ${key}`);
      return { key: row.key, alias: row.alias, forms: { ...row.forms, object: DocsSync.objectForm(row.key, row.forms.lean) } };
    });
  }

  /* An entry is `### Title`, then a paragraph that ends with "Ключ: `key`." and an optional "Подробнее: [..](..)." */
  static glossary(language: string): Record<string, GlossaryEntry> {
    const page = `docs/${language}/${VERSION}/appendix/glossary.mdx`;
    const text = readFileSync(TypemoSource.path(page), "utf8");
    const entries: Record<string, GlossaryEntry> = {};
    for (const match of text.matchAll(/^### (.+)\n\n(.+)$/gm)) {
      const [, rawTitle = "", body = ""] = match;
      /* the explicit id of the heading (`### Документ [#document]`) is not part of the title */
      const title = rawTitle.replace(/\s*\[#[^\]]+\]\s*$/, "");
      const key = /Ключ: `([^`]+)`/.exec(body)?.[1];
      if (!key) continue;
      if (entries[key]) throw new Error(`${page}: the key ${key} is used twice`);
      const link = /Подробнее: \[[^\]]*\]\(([^)]+)\)/.exec(body)?.[1];
      entries[key] = {
        title: title.trim(),
        definition: body.slice(0, body.indexOf(" Ключ:")).trim(),
        href: link ? DocsSync.pageUrl(language, "appendix/glossary.mdx", link) : null,
      };
    }
    if (Object.keys(entries).length === 0) throw new Error(`${page}: no entries with "Ключ:" found`);
    return entries;
  }

  /** A relative `.mdx` link of a page → the address of the site (`/ru/docs/v1/...`). */
  static pageUrl(language: string, fromPage: string, href: string): string {
    const [path = "", anchor] = href.split("#");
    const target = posix.normalize(posix.join(posix.dirname(fromPage), path)).replace(/(^|\/)index\.mdx$/, "").replace(/\.mdx$/, "");
    return `/${language}/docs/${VERSION}${target ? `/${target}` : ""}${anchor ? `#${anchor}` : ""}`;
  }

  static async run(): Promise<void> {
    TypemoSource.assertPresent();
    /* the twoslash cache is keyed by block text only: other Typemo sources mean other types */
    rmSync(resolve(SITE, ".next/cache/twoslash"), { recursive: true, force: true });
    for (const language of LANGUAGES) DocsSync.copyPages(language);
    DocsSync.writeJson(resolve(GENERATED, "value-forms.json"), await DocsSync.valueForms());
    DocsSync.writeJson(
      resolve(GENERATED, "glossary.json"),
      Object.fromEntries(LANGUAGES.map((language) => [language, DocsSync.glossary(language)])),
    );
    const commit = existsSync(TypemoSource.path(".git"))
      ? execFileSync("git", ["-C", TypemoSource.root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim()
      : "unknown";
    DocsSync.writeJson(resolve(GENERATED, "source.json"), { commit });
    console.log(`synced docs of Typemo ${commit.slice(0, 7)} from ${TypemoSource.root}`);
  }
}

await DocsSync.run();
