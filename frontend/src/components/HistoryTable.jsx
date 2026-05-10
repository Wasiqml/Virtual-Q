import { useMemo, useState } from "react";

const DEFAULT_VISIBLE_ROWS = 5;

function formatDuration(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value} min`;
}

function HistoryTable({ items }) {
  const [visibleRows, setVisibleRows] = useState(DEFAULT_VISIBLE_ROWS);
  const visibleItems = useMemo(() => items.slice(0, visibleRows), [items, visibleRows]);
  const canShowMore = visibleRows < items.length;

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <p className="eyebrow">History</p>
          <h2>Previous Customers</h2>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Customer</th>
              <th>Source</th>
              <th>Status</th>
              <th>Service Time</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="empty-state" colSpan="6">
                  No previous customers yet.
                </td>
              </tr>
            ) : (
              visibleItems.map((item) => (
                <tr key={item._id}>
                  <td>#{item.token_number}</td>
                  <td>{item.customer_name || "QR Customer"}</td>
                  <td>{item.source}</td>
                  <td>
                    <span className={`status-badge ${item.status}`}>{item.status}</span>
                  </td>
                  <td>{formatDuration(item.service_duration_minutes)}</td>
                  <td>{new Date(item.completed_at || item.cancelled_at || item.updatedAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canShowMore ? (
        <button
          className="secondary-button history-button"
          onClick={() => setVisibleRows((current) => current + DEFAULT_VISIBLE_ROWS)}
          type="button"
        >
          Show More
        </button>
      ) : null}
    </div>
  );
}

export default HistoryTable;
