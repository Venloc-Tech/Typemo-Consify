import type { ReactNode } from "react";

/*
 * Replaces the built-in Badge: a label next to the heading of an API element (DOCS-COMPONENTS R7). `scope` says
 * where the element works, `requires` what it needs. The heading-badges plugin keeps the label out of the anchor
 * and the table of contents.
 */
export default function Badge({ variant = "scope", children }: { variant?: "scope" | "requires"; children?: ReactNode }) {
  return <span className={`tm-badge tm-badge-${variant === "requires" ? "requires" : "scope"}`}>{children}</span>;
}
