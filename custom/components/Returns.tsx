import type { ReactNode } from "react";
import { useMessages } from "@consify/core/ui";
import type { TypemoMessages } from "../plugins/typemo-strings.ts";

/* "Returns": looks like a Param, with the word instead of a name (DOCS-COMPONENTS R5). */
export default function Returns({ type, children }: { type: string; children?: ReactNode }) {
  const t = useMessages<TypemoMessages>();
  return (
    <section className="tm-params tm-returns">
      <div className="tm-param">
        <div className="tm-param-head">
          <span className="tm-params-title">{t["typemo.returns"]}</span>
          <code className="tm-param-type">{type}</code>
        </div>
        {children ? <div className="tm-param-body">{children}</div> : null}
      </div>
    </section>
  );
}
