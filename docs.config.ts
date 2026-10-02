import { defineConfig } from "@consify/core";
import { docs } from "@consify/docs";
import { twoslashPopups } from "./custom/plugins/twoslash-popups.ts";
import { typemoStrings } from "./custom/plugins/typemo-strings.ts";
import { typemoMarkdown } from "./custom/plugins/typemo-markdown.ts";
import { TypemoTwoslash } from "./custom/twoslash.ts";

export default defineConfig({
  site: {
    name: "Typemo",
    description: "A strictly typed MongoDB ODM for TypeScript, a replacement for Mongoose",
    url: "https://typemo.shiz-ceo.ru",
    github: { repo: "Venloc-Tech/Typemo", branch: "main" },
  },

  // Plain files for GitHub Pages under its own domain (public/CNAME), no basePath.
  deploy: { mode: "static" },

  // English is the main language: the root of the site opens it, a page missing in Russian is shown in English with a note.
  i18n: {
    defaultLanguage: "en",
    languages: ["en", "ru"],
    labels: { en: "English", ru: "Русский" },
    fallback: "notice",
  },

  mdx: {
    // The cache is keyed by the text of a block only, not by the Typemo types behind it: `bun run sync` empties it
    // with every sync, and `check:twoslash` fills it before a build (a page has 10 s to prerender).
    twoslash: { compilerOptions: { ...TypemoTwoslash.compilerOptions() }, cache: true },
    plugins: [typemoMarkdown, twoslashPopups, typemoStrings],
  },

  features: [
    docs({
      versions: { list: [{ id: "v1", label: "v1", status: "latest" }], default: "v1" },
      // The pages live in docs/<lang>/<version> of Typemo; consify builds the link as <dir>/<lang>/docs/<path>,
      // which cannot point there, so no link instead of a broken one.
      editOnGithub: false,
      // the code of the examples lives in snippets/ (synced from Typemo), the same file for every language
      snippets: true,
      // every heading has a permanent English id (`[#quick-start]`), listed in anchors.json of the default language (docs/en/v1)
      anchors: true,
    }),
  ],
});
