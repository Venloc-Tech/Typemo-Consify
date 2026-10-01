import { Children, type ReactNode } from "react";

/* Two code blocks side by side, "was" and "is" (DOCS-COMPONENTS R9); one under the other on a phone. */
export default function Compare({
  labels = ["Mongoose", "Typemo"],
  children,
}: {
  labels?: readonly [string, string] | readonly string[];
  children?: ReactNode;
}) {
  /* MDX passes the blank lines between the two blocks as text nodes: only the elements are columns. */
  const blocks = Children.toArray(children).filter((child) => typeof child !== "string");
  return (
    <div className="tm-compare">
      {blocks.slice(0, 2).map((block, index) => (
        <div className="tm-compare-column" key={labels[index] ?? index}>
          <p className="tm-compare-label">{labels[index]}</p>
          {block}
        </div>
      ))}
    </div>
  );
}
