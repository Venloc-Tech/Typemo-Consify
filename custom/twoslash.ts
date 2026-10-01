/*
 * The compiler options of every `twoslash` block: the same as `scripts/docs-check.ts` of Typemo, so a page that
 * passes the check there renders here with the same types and the same errors. The packages resolve to the
 * sources of the Typemo checkout (not to npm), so the site shows the types of the commit it was built from.
 *
 * Values are written as in a tsconfig (`target: "esnext"`): consify converts them for the compiler. No `node:`
 * imports: docs.config.ts is loaded in the browser too, where the options are never used.
 */
export class TypemoTwoslash {
  /** TYPEMO_DIR (absolute, CI) or the sibling checkout `../Typemo` (local). */
  static root(): string {
    if (typeof process === "undefined") return "";
    return process.env.TYPEMO_DIR ?? `${process.cwd()}/../Typemo`;
  }

  static compilerOptions(): Record<string, unknown> {
    const root = TypemoTwoslash.root();
    const nest = (name: string): [string, string[]] => [name, [`${root}/integrations/nestjs/node_modules/${name}`]];
    return {
      target: "esnext",
      module: "preserve",
      moduleResolution: "bundler",
      moduleDetection: "force",
      strict: true,
      exactOptionalPropertyTypes: true,
      noUncheckedIndexedAccess: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      useDefineForClassFields: false,
      skipLibCheck: true,
      noEmit: true,
      allowImportingTsExtensions: true,
      types: ["bun"],
      typeRoots: [`${root}/node_modules/@types`],
      paths: {
        "@venloc/typemo": [`${root}/packages/typemo/src/index.ts`],
        "@venloc/typemo/testing": [`${root}/packages/typemo/src/testing/index.ts`],
        "@venloc/typemo-decorators": [`${root}/packages/decorators/src/index.ts`],
        mongodb: [`${root}/packages/typemo/node_modules/mongodb`],
        "@venloc/typemo-nestjs": [`${root}/integrations/nestjs/src/index.ts`],
        "@venloc/typemo-nestjs/testing": [`${root}/integrations/nestjs/src/testing/index.ts`],
        ...Object.fromEntries(["@nestjs/common", "@nestjs/core", "@nestjs/testing", "rxjs"].map(nest)),
      },
    };
  }
}
