import type { Sheet } from "./api";
export default function History({ sheet }: { sheet: Sheet }) {
  return <section aria-label="Decision history" className="space-y-2">
    <h2 className="font-semibold">Decision history</h2>
    {sheet.decisions.length === 0 ? <p>No decisions yet.</p> : <ol className="space-y-2">{sheet.decisions.map(d => <li key={d.id} className="rounded border border-borderPrimary p-3">
      <strong>{d.outcome}</strong> by reviewer #{d.reviewerId} at {new Date(d.decidedAt).toLocaleString()} (version {d.version})
      {d.reason && <p className="whitespace-pre-wrap">{d.reason}</p>}
    </li>)}</ol>}
  </section>;
}
