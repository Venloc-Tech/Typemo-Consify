import type { ReactNode } from "react";

/* "Принимает": the list of the arguments of an API element (DOCS-COMPONENTS R5). */
export default function Params({ title = "Принимает", children }: { title?: string; children?: ReactNode }) {
  return (
    <section className="tm-params">
      <p className="tm-params-title">{title}</p>
      <div className="tm-params-list">{children}</div>
    </section>
  );
}
