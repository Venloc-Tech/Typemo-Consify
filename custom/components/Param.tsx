import type { ReactNode } from "react";
import { useMessages } from "@consify/core/ui";
import type { TypemoMessages } from "../plugins/typemo-strings.ts";

/* One argument: name, readable type, required or the default, then the description (DOCS-COMPONENTS R5). */
export default function Param({
  name,
  type,
  required = false,
  default: fallback,
  children,
}: {
  name: string;
  type: string;
  required?: boolean;
  default?: string;
  children?: ReactNode;
}) {
  const t = useMessages<TypemoMessages>();
  return (
    <div className="tm-param">
      <div className="tm-param-head">
        <code className="tm-param-name">{name}</code>
        <code className="tm-param-type">{type}</code>
        {required ? <span className="tm-param-required">{t["typemo.param.required"]}</span> : null}
        {fallback !== undefined ? (
          <span className="tm-param-default">
            {t["typemo.param.default"]} <code>{fallback}</code>
          </span>
        ) : null}
      </div>
      {children ? <div className="tm-param-body">{children}</div> : null}
    </div>
  );
}
