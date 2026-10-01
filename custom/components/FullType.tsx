import type { ReactNode } from "react";

/* The exact signature of an API element, folded by default (DOCS-COMPONENTS R4). */
export default function FullType({ label = "Полный тип", children }: { label?: string; children?: ReactNode }) {
  return (
    <details className="tm-fulltype">
      <summary>{label}</summary>
      <div className="tm-fulltype-body">{children}</div>
    </details>
  );
}
