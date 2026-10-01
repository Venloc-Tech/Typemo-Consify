import { definePlugin } from "@consify/core/plugins";

/*
 * What the pages of Typemo expect from the build (DOCS-COMPONENTS, part 4) and consify does not do by itself:
 *  - relative links to `.mdx` files become addresses of the site: consify resolves them in Markdown links, but
 *    not in `href` of components (`<Card href="./x.mdx">`), so both are resolved here, the same way;
 *  - a component inside a heading (`## Model.watch <Badge>…</Badge>`) stays out of the anchor and the table of
 *    contents, so adding a label never breaks the links to the element;
 *  - ```package-install tabs start with bun and share one choice across the site;
 *  - a ```tree block becomes a file tree.
 */
type Node = {
  type: string;
  name?: string | null;
  url?: string;
  lang?: string | null;
  value?: string;
  depth?: number;
  attributes?: { type: string; name?: string; value?: unknown }[];
  children?: Node[];
  data?: { hProperties?: Record<string, unknown> } & Record<string, unknown>;
};

type File = { path?: string; history?: string[]; data: Record<string, unknown> };

type TocEntry = { title: unknown; url: string; depth: number };

export class TypemoMarkdown {
  static walk(node: Node, visit: (node: Node, parent: Node | undefined, index: number) => void, parent?: Node): void {
    node.children?.forEach((child, index) => {
      visit(child, parent ?? node, index);
      TypemoMarkdown.walk(child, visit, child);
    });
  }

  /** `/…/content/ru/docs/v1/queries/x.mdx` → `{ lang: "ru", page: "v1/queries/x.mdx" }`. */
  static pageOf(file: File): { lang: string; page: string } | undefined {
    const path = (file.path ?? file.history?.at(-1) ?? "").replaceAll("\\", "/");
    /* consify passes the path relative to the project (`content/ru/docs/…`), a test may pass an absolute one */
    const match = /(?:^|\/)content\/([^/]+)\/docs\/(.+\.mdx?)$/.exec(path);
    return match ? { lang: match[1] as string, page: match[2] as string } : undefined;
  }

  /** A relative `.mdx` link of `page` → `/ru/docs/v1/...#anchor`; anything else is returned as it is. */
  static resolveLink(lang: string, page: string, href: string): string {
    if (/^[a-z]+:|^\/|^#/i.test(href)) return href;
    const [path = "", anchor] = href.split("#");
    if (!/\.mdx?$/.test(path)) return href;
    const parts = page.split("/").slice(0, -1);
    for (const segment of path.split("/")) {
      if (segment === "..") parts.pop();
      else if (segment !== "." && segment !== "") parts.push(segment);
    }
    const last = (parts.pop() ?? "").replace(/\.mdx?$/, "");
    if (last !== "index") parts.push(last);
    return `/${lang}/docs/${parts.join("/")}${anchor ? `#${anchor}` : ""}`;
  }

  static links() {
    return (tree: Node, file: File) => {
      const where = TypemoMarkdown.pageOf(file);
      if (!where) return;
      TypemoMarkdown.walk(tree, (node) => {
        if ((node.type === "link" || node.type === "definition") && node.url)
          node.url = TypemoMarkdown.resolveLink(where.lang, where.page, node.url);
        if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement")
          for (const attribute of node.attributes ?? [])
            if (attribute.type === "mdxJsxAttribute" && attribute.name === "href" && typeof attribute.value === "string")
              attribute.value = TypemoMarkdown.resolveLink(where.lang, where.page, attribute.value);
      });
    };
  }

  /** The anchor rule of the Typemo docs (scripts/docs-check.ts `slug`), applied to the text without components. */
  static slug(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s/g, "-");
  }

  static textOf(node: Node): string {
    if (node.type === "mdxJsxTextElement" || node.type === "mdxJsxFlowElement") return "";
    if (typeof node.value === "string") return node.value;
    return (node.children ?? []).map(TypemoMarkdown.textOf).join("");
  }

  /* Runs after the built-in heading plugin: it fixes the ids it gave and the entries of the table of contents. */
  static headingBadges() {
    return (tree: Node, file: File) => {
      const toc = (file.data.toc ?? []) as TocEntry[];
      TypemoMarkdown.walk(tree, (node) => {
        if (node.type !== "heading" || !node.children?.some((child) => child.type === "mdxJsxTextElement")) return;
        const text = TypemoMarkdown.textOf(node).trim();
        const props = (node.data ??= {}).hProperties ?? (node.data.hProperties = {});
        const before = props.id;
        props.id = TypemoMarkdown.slug(text);
        const entry = toc.find((item) => item.url === `#${String(before)}`);
        if (entry) {
          entry.url = `#${String(props.id)}`;
          entry.title = text;
        }
      });
    };
  }

  static attribute(node: Node, name: string): unknown {
    return node.attributes?.find((attribute) => attribute.name === name)?.value;
  }

  /*
   * ```package-install is turned into tabs by consify with npm first. The docs want bun first (the product is made
   * on Bun) and one choice for the whole site (DOCS-COMPONENTS I2): reorder and put the tabs in the `pm` group.
   */
  static packageManagers() {
    const order = ["bun", "npm", "pnpm", "yarn"];
    const rank = (node: Node): number => order.indexOf(String(TypemoMarkdown.attribute(node, "value")));
    return (tree: Node) => {
      TypemoMarkdown.walk(tree, (node) => {
        if (node.type !== "mdxJsxFlowElement" || node.name !== "CodeBlockTabs" || !node.children) return;
        const list = node.children.find((child) => child.name === "CodeBlockTabsList");
        const tabs = node.children.filter((child) => child.name === "CodeBlockTab");
        if (!list?.children || tabs.length !== order.length || tabs.some((tab) => rank(tab) < 0)) return;
        list.children.sort((a, b) => rank(a) - rank(b));
        node.children = [list, ...tabs.sort((a, b) => rank(a) - rank(b))];
        node.attributes = [
          ...(node.attributes ?? []).filter((attribute) => !["defaultValue", "groupId", "persist"].includes(attribute.name ?? "")),
          { type: "mdxJsxAttribute", name: "defaultValue", value: "bun" },
          { type: "mdxJsxAttribute", name: "groupId", value: "pm" },
          { type: "mdxJsxAttribute", name: "persist", value: null },
        ];
      });
    };
  }

  /* ```tree: two spaces per level, a folder ends with `/`, a comment after `#`. */
  static tree() {
    return (tree: Node) => {
      TypemoMarkdown.walk(tree, (node, parent, index) => {
        if (node.type !== "code" || node.lang !== "tree" || !parent?.children) return;
        const entries = (node.value ?? "")
          .split("\n")
          .filter((line) => line.trim() !== "")
          .map((line) => {
            const [name = "", ...comment] = line.trim().split(/\s+#\s*/);
            return {
              depth: Math.floor((line.length - line.trimStart().length) / 2),
              name: name.trim(),
              folder: name.trim().endsWith("/"),
              comment: comment.join(" # ") || undefined,
            };
          });
        parent.children[index] = {
          type: "mdxJsxFlowElement",
          name: "FileTree",
          attributes: [{ type: "mdxJsxAttribute", name: "entries", value: JSON.stringify(entries) }],
          children: [],
        };
      });
    };
  }
}

export const typemoMarkdown = definePlugin({
  name: "typemo-markdown",
  remark: [TypemoMarkdown.links, TypemoMarkdown.headingBadges, TypemoMarkdown.packageManagers, TypemoMarkdown.tree],
});
