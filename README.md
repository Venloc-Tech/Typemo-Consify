# Typemo docs site

The documentation site of [Typemo](https://github.com/Venloc-Tech/Typemo), made with [consify](https://github.com/shiz-ceo/consify) and published at https://typemo.shiz-ceo.ru.

The pages are not stored here. They live in `docs/<language>/<version>` of the Typemo repository and are copied in at build time, so a page is edited in Typemo, and the examples compile against the Typemo sources of that same commit. This repository holds only the site: the config, the components, the plugins and the CI.

## Run it

```bash
bun install          # @consify/* are on GitHub Packages: ~/.npmrc needs //npm.pkg.github.com/:_authToken=<read:packages token>
bun run dev          # syncs the docs from ../Typemo, then the dev server
bun run build        # syncs, then the static site in build/client
```

Typemo must be checked out next to this folder (`../Typemo`), with its dependencies installed (`bun install` there), or anywhere else with `TYPEMO_DIR=/absolute/path`.

| Command | What it does |
| --- | --- |
| `bun run sync` | copies `docs/ru/v1` of Typemo into `content/ru/docs/v1`, generates the data of `ValueForms` (from `BsonTypeTable`) and `Term` (from the glossary), empties the twoslash cache |
| `bun run check:twoslash` | compiles every twoslash block the way the build does and lists every failure (the build stops at the first one); warns about blocks heavier than 300 kB; fills the twoslash cache the build reads |
| `bun run check` | `consify check`: addresses, front matter, `meta.json` |
| `bun run typecheck` | the site's own TypeScript |

## What is here

- `docs.config.ts`: the site, the `v1` version, Russian (English joins when Typemo's `docs/en/v1` has pages), static mode for GitHub Pages.
- `custom/twoslash.ts`: the compiler options of the examples, the same as `scripts/docs-check.ts` of Typemo; the packages resolve to the Typemo sources.
- `custom/components/`: the components of the Typemo docs: `Callout` (tip, warning, migration), `FullType`, `Params` / `Param` / `Returns`, `Compare`, `Badge` (scope, requires), `ValueForms`, `Term`, `FileTree`. Styles: `custom/theme.css`, on the tokens of the consify theme.
- `custom/plugins/typemo-markdown.ts`: relative `.mdx` links in components (`<Card href>`), components kept out of heading anchors and the table of contents, `package-install` tabs with bun first and one choice for the site, ```` ```tree ```` blocks.
- `custom/plugins/twoslash-popups.ts`: keeps hover popups short (the start of a long type, no `@example`), so pages of the fluent API stay small.
- `scripts/`: the sync and the twoslash check.
- `.github/workflows/deploy.yml`: on `repository_dispatch` `typemo-docs` from Typemo (with its commit), on a push here, or by hand: check out Typemo at that commit, install, sync, check, build, deploy to GitHub Pages.

## Setup on GitHub

- Secret `CONSIFY_PACKAGES_TOKEN`: a classic token with `read:packages` (for `@consify/*`).
- Settings → Pages: Source "GitHub Actions", custom domain `typemo.shiz-ceo.ru` (also in `public/CNAME`), DNS `CNAME typemo → venloc-tech.github.io.`
- In Typemo: the workflow `notify-docs.yml` and the secret `DOCS_DISPATCH_TOKEN` (fine-grained, Contents read and write on this repository only).
