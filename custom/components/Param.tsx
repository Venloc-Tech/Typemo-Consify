import type { ReactNode } from "react";

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
  return (
    <div className="tm-param">
      <div className="tm-param-head">
        <code className="tm-param-name">{name}</code>
        <code className="tm-param-type">{type}</code>
        {required ? <span className="tm-param-required">обязательный</span> : null}
        {fallback !== undefined ? (
          <span className="tm-param-default">
            по умолчанию: <code>{fallback}</code>
          </span>
        ) : null}
      </div>
      {children ? <div className="tm-param-body">{children}</div> : null}
    </div>
  );
}
