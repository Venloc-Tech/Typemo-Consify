import type { ReactNode } from "react";
import { useMessages } from "@consify/core/ui";
import type { TypemoMessages } from "../plugins/typemo-strings.ts";

/* "Parameters": the list of the arguments of an API element (DOCS-COMPONENTS R5). */
export default function Params({ title, children }: { title?: string; children?: ReactNode }) {
  const t = useMessages<TypemoMessages>();
  return (
    <section className="tm-params">
      <p className="tm-params-title">{title ?? t["typemo.params"]}</p>
      <div className="tm-params-list">{children}</div>
    </section>
  );
}
