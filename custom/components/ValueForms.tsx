import rows from "../generated/value-forms.json" with { type: "json" };

/*
 * How a value of each MongoDB type looks in every form of a result (DOCS-COMPONENTS R10). The rows come from
 * BsonTypeTable of the Typemo commit the site is built from (`bun run sync`), so the table cannot drift from the
 * product.
 */
type Form = "hydrated" | "lean" | "object" | "plain" | "json";

const FORMS: readonly Form[] = ["hydrated", "lean", "object", "plain", "json"];
const FORM_TITLES: Record<Form, string> = {
  hydrated: "Документ",
  lean: "lean",
  object: "$toObject()",
  plain: "plain",
  json: "JSON",
};

export default function ValueForms({ types, forms = FORMS }: { types?: readonly string[]; forms?: readonly Form[] }) {
  const shown = types
    ? types.map((name) => {
        const row = rows.find((candidate) => candidate.key === name || candidate.alias === name);
        if (!row) throw new Error(`<ValueForms>: unknown type "${name}" (keys: ${rows.map((r) => r.key).join(", ")})`);
        return row;
      })
    : rows;
  return (
    <div className="tm-valueforms">
      <table>
        <thead>
          <tr>
            <th scope="col">Тип</th>
            {forms.map((form) => (
              <th scope="col" key={form}>
                {FORM_TITLES[form]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => (
            <tr key={row.key}>
              <th scope="row">
                <code>{row.key}</code>
              </th>
              {forms.map((form) => (
                <td key={form}>
                  <code>{row.forms[form]}</code>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
