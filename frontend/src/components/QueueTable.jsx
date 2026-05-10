function QueueTable({ items }) {
  return (
    <div className="card">
      <div className="section-header">
        <div>
          <p className="eyebrow">Live Queue</p>
          <h2>Active Customers</h2>
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
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">
                  No customers have joined yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item._id}>
                  <td>#{item.token_number}</td>
                  <td>{item.customer_name || "QR Customer"}</td>
                  <td>{item.source}</td>
                  <td>
                    <span className={`status-badge ${item.status}`}>{item.status}</span>
                  </td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default QueueTable;
