import { Link } from "react-router-dom";

function AnalyticsCards({ analytics }) {
  const cards = [
    { label: "Customers Today", value: analytics.customersToday },
    { label: "Customers This Week", value: analytics.customersThisWeek },
    { label: "Customers This Month", value: analytics.customersThisMonth },
    { label: "Avg. Service Time", value: `${analytics.averageServiceMinutes} min` }
  ];

  return (
    <section>
      <div className="section-header analytics-header">
        <div>
          <p className="eyebrow">Quick Analytics</p>
          <h2>Branch Overview</h2>
        </div>
        <Link className="text-link" to="/admin/analytics">
          View detailed graphs
        </Link>
      </div>

      <div className="analytics-grid">
        {cards.map((card) => (
          <div className="card stat-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AnalyticsCards;
