import type { ReactNode } from "react";
import { useMessages } from "@consify/core/ui";
import type { TypemoMessages } from "../plugins/typemo-strings.ts";

/* The exact signature of an API element, folded by default (DOCS-COMPONENTS R4). */
export default function FullType({ label, children }: { label?: string; children?: ReactNode }) {
  const t = useMessages<TypemoMessages>();
  return (
    <details className="tm-fulltype">
      <summary>{label ?? t["typemo.fullType"]}</summary>
      <div className="tm-fulltype-body">{children}</div>
    </details>
  );
}
