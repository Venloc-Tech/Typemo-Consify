/*
 * A tree of files made from a ```tree block by the typemo-markdown plugin (DOCS-COMPONENTS I3). The entries come
 * as a JSON string: an MDX attribute made by a plugin cannot carry an expression without a JavaScript AST.
 */
type Entry = { depth: number; name: string; folder: boolean; comment?: string };

export default function FileTree({ entries }: { entries: string }) {
  const rows = JSON.parse(entries) as Entry[];
  return (
    <div className="tm-tree" role="tree">
      {rows.map((row, index) => (
        <div className="tm-tree-row" role="treeitem" key={index} style={{ paddingLeft: `${row.depth * 1.25}rem` }}>
          <svg className="tm-tree-icon" viewBox="0 0 24 24" aria-hidden="true">
            {row.folder ? (
              <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            ) : (
              <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6" />
            )}
          </svg>
          <span className="tm-tree-name">{row.name}</span>
          {row.comment ? <span className="tm-tree-comment">{row.comment}</span> : null}
        </div>
      ))}
    </div>
  );
}
