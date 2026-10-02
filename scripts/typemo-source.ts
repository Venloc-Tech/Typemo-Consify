import { existsSync } from "node:fs";
import { resolve } from "node:path";

/*
 * Where the Typemo repository is checked out. The docs, the glossary, the value-forms table and the types the
 * twoslash blocks compile against are all read from it, so the site always shows one commit of Typemo.
 * Locally it is the sibling folder; CI checks Typemo out into `.typemo` and sets TYPEMO_DIR.
 */
export class TypemoSource {
  static readonly root: string = resolve(import.meta.dirname, "..", process.env.TYPEMO_DIR ?? "../Typemo");

  static path(...parts: string[]): string {
    return resolve(TypemoSource.root, ...parts);
  }

  static assertPresent(): void {
    if (!existsSync(TypemoSource.path("docs/en/v1/meta.json")))
      throw new Error(
        `Typemo is not found at ${TypemoSource.root}: set TYPEMO_DIR to a checkout of Venloc-Tech/Typemo`,
      );
    if (!existsSync(TypemoSource.path("node_modules/mongodb")) && !existsSync(TypemoSource.path("packages/typemo/node_modules/mongodb")))
      throw new Error(`Typemo at ${TypemoSource.root} has no dependencies: run \`bun install\` there first`);
  }
}
