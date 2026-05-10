import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getBranchAnalytics } from "../services/api";

const defaultBranchId = import.meta.env.VITE_DEFAULT_BRANCH_ID || "branch-001";

function GraphCard({ title, subtitle, items, valueKey = "count", accentClass = "" }) {
  const maxValue = Math.max(...items.map((item) => item[valueKey]), 1);

  return (
    <div className="card graph-card">
      <div className="section-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h2>{title}</h2>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
      </div>

      <div className="graph-list">
        {items.map((item) => (
          <div className="graph-row" key={item.label}>
            <div className="graph-meta">
              <span>{item.label}</span>
              <strong>{item[valueKey]}</strong>
            </div>
            <div className="graph-track">
              <div
                className={`graph-fill ${accentClass}`.trim()}
                style={{ width: `${(item[valueKey] / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState({
    dailyTrend: [],
    statusCounts: [],
    sourceCounts: [],
    serviceTimes: []
  });
  const [error, setError] = useState("");

  useEffect(() => {
    getBranchAnalytics(defaultBranchId)
      .then((response) => {
        setAnalytics(response.data);
      })
      .catch(() => {
        setError("Could not load analytics graphs.");
      });
  }, []);

  return (
    <main className="page-shell">
      <section className="analytics-page">
        <div className="card hero-card">
          <div className="analytics-topbar">
            <div>
              <p className="eyebrow">Admin Insights</p>
              <h1>Queue Analytics</h1>
              <p className="muted">
                Review graph-based trends for <strong>{defaultBranchId}</strong>.
              </p>
            </div>
            <Link className="text-link" to="/admin">
              Back to Dashboard
            </Link>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
        </div>

        <div className="graph-grid">
          <GraphCard
            accentClass="graph-fill-blue"
            items={analytics.dailyTrend}
            subtitle="Customers joined over the last 7 days"
            title="Daily Trend"
          />
          <GraphCard
            accentClass="graph-fill-green"
            items={analytics.statusCounts}
            subtitle="Current and completed queue states"
            title="Queue Status Mix"
          />
          <GraphCard
            accentClass="graph-fill-gold"
            items={analytics.sourceCounts}
            subtitle="How customers entered the queue"
            title="Entry Source"
          />
          <GraphCard
            accentClass="graph-fill-navy"
            items={analytics.serviceTimes}
            subtitle="Minutes spent with the last completed customers"
            title="Recent Service Times"
            valueKey="minutes"
          />
        </div>
      </section>
    </main>
  );
}

export default AdminAnalyticsPage;
