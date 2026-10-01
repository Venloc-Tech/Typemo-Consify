import { definePlugin } from "@consify/core/plugins";
import type { ShikiTransformer } from "shiki";

/*
 * The twoslash of consify prints every hover type without truncation, with its whole TSDoc and every `@example`,
 * and highlights all of it. For the fluent API of Typemo (`fn`, the pipeline builder, query builders) one hover is
 * then the type of the whole builder: a small block grew to megabytes, a page to 54 MB, and the build failed its
 * 10-second prerender limit. This transformer runs right after twoslash has produced its result and before anything
 * is highlighted, and keeps every popup readable: the start of a long type, the start of a long documentation text,
 * and the tags without `@example` (the reference pages show the examples).
 */
type TwoslashNode = { type: string; text?: string; docs?: string; tags?: [string, string | undefined][] };

export class TwoslashPopups {
  /** Lines of a multi-line type kept in a popup or a `^?` line. */
  static readonly MAX_TYPE_LINES = 12;
  /** Characters of a type kept when it is one long line. */
  static readonly MAX_TYPE_CHARS = 800;
  /** Characters of the documentation kept in a popup, cut at a paragraph. */
  static readonly MAX_DOCS_CHARS = 1_000;

  static trimType(text: string): string {
    const lines = text.split("\n");
    let out = text;
    if (lines.length > TwoslashPopups.MAX_TYPE_LINES)
      out = `${lines.slice(0, TwoslashPopups.MAX_TYPE_LINES).join("\n")}\n  // … ${lines.length - TwoslashPopups.MAX_TYPE_LINES} more lines`;
    if (out.length > TwoslashPopups.MAX_TYPE_CHARS) out = `${out.slice(0, TwoslashPopups.MAX_TYPE_CHARS)} …`;
    return out;
  }

  static trimDocs(docs: string): string {
    if (docs.length <= TwoslashPopups.MAX_DOCS_CHARS) return docs;
    const paragraphs = docs.split(/\n\s*\n/);
    let out = paragraphs[0] ?? "";
    for (const paragraph of paragraphs.slice(1)) {
      if (out.length + paragraph.length > TwoslashPopups.MAX_DOCS_CHARS) break;
      out += `\n\n${paragraph}`;
    }
    return out.length > TwoslashPopups.MAX_DOCS_CHARS ? `${out.slice(0, TwoslashPopups.MAX_DOCS_CHARS)} …` : out;
  }

  static trim(node: TwoslashNode): void {
    if (node.type !== "hover" && node.type !== "query") return;
    if (node.text) node.text = TwoslashPopups.trimType(node.text);
    if (node.docs) node.docs = TwoslashPopups.trimDocs(node.docs);
    if (node.tags) node.tags = node.tags.filter(([name]) => name !== "example");
  }

  static transformer(): ShikiTransformer {
    return {
      name: "typemo:twoslash-popups",
      /* runs after the preprocess of twoslash, which leaves its result in `meta.twoslash` */
      preprocess() {
        const result = (this.meta as { twoslash?: { nodes?: TwoslashNode[] } }).twoslash;
        for (const node of result?.nodes ?? []) TwoslashPopups.trim(node);
      },
    };
  }
}

export const twoslashPopups = definePlugin({
  name: "typemo-twoslash-popups",
  shiki: { transformers: [TwoslashPopups.transformer()] },
});
