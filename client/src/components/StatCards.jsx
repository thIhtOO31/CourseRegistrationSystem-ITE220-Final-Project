// Show a quick summary of dashboard totals
export default function StatCards({
  items
}) {
  return <div className="stats-grid">{items.map(
      ({
        label,
        value,
        detail
      }) => <div className="stat-card" key={label}>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    )}</div>;
}