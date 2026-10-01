import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import glossary from "../generated/glossary.json" with { type: "json" };

/*
 * A term of the glossary (DOCS-COMPONENTS R11): the word stays in the sentence, the definition opens on hover or
 * keyboard focus. Definitions come from appendix/glossary.mdx of Typemo (`bun run sync`), by their key.
 */
type Entry = { title: string; definition: string; href: string | null };

/* The definitions use only inline code and bold: enough to render them without a Markdown pipeline. */
const inline = (text: string): ReactNode[] =>
  text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    return part;
  });

export default function Term({ id, children }: { id: string; children?: ReactNode }) {
  const { lang = "ru" } = useParams();
  const entries = (glossary as Record<string, Record<string, Entry>>)[lang] ?? glossary.ru;
  const entry = (entries as Record<string, Entry>)[id];
  if (!entry) throw new Error(`<Term id="${id}">: no such key in the glossary`);
  return (
    <span className="tm-term">
      <span className="tm-term-word" tabIndex={0}>
        {children}
      </span>
      <span className="tm-term-card" role="tooltip">
        <strong>{entry.title}</strong>
        <span>{inline(entry.definition)}</span>
        {entry.href ? (
          <Link to={entry.href} className="tm-term-more">
            Подробнее
          </Link>
        ) : null}
      </span>
    </span>
  );
}
