import type { ReactNode } from "react";

/*
 * Replaces the built-in Callout: the docs of Typemo have exactly three kinds of notes (DOCS-COMPONENTS R1), and
 * `migration` ("if you come from Mongoose") is ours. The kinds of the built-in one stay accepted, so a page that
 * uses `info` or `warn` still renders.
 */
type Kind = "tip" | "warning" | "migration" | "info" | "warn" | "error" | "success" | "idea";

const KINDS: Record<Kind, { tone: "tip" | "warning" | "migration" | "error" | "success"; title: string }> = {
  tip: { tone: "tip", title: "Подсказка" },
  idea: { tone: "tip", title: "Подсказка" },
  info: { tone: "tip", title: "Заметка" },
  warning: { tone: "warning", title: "Внимание" },
  warn: { tone: "warning", title: "Внимание" },
  error: { tone: "error", title: "Ошибка" },
  success: { tone: "success", title: "Готово" },
  migration: { tone: "migration", title: "Если вы пришли из Mongoose" },
};

const ICONS: Record<(typeof KINDS)[Kind]["tone"], ReactNode> = {
  tip: <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />,
  warning: <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />,
  migration: <path d="M4 7h13l-3-3M20 17H7l3 3" />,
  error: <path d="M12 8v4M12 16h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />,
  success: <path d="m9 12 2 2 4-4M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />,
};

export default function Callout({ type = "tip", title, children }: { type?: Kind; title?: string; children?: ReactNode }) {
  const kind = KINDS[type] ?? KINDS.tip;
  return (
    <aside className={`tm-callout tm-callout-${kind.tone}`}>
      <svg className="tm-callout-icon" viewBox="0 0 24 24" aria-hidden="true">
        {ICONS[kind.tone]}
      </svg>
      <div className="tm-callout-body">
        <p className="tm-callout-title">{title ?? kind.title}</p>
        <div className="tm-callout-content">{children}</div>
      </div>
    </aside>
  );
}
