function CurrentTokenCard({ currentToken, waitingCount, estimatedWaitMinutes }) {
  return (
    <div className="card current-token-card">
      <p className="eyebrow">Current Counter</p>
      <h2>{currentToken ? `Token #${currentToken.token_number}` : "Waiting for next call"}</h2>
      <div className="stats-grid">
        <div className="stat-box">
          <span>Waiting</span>
          <strong>{waitingCount}</strong>
        </div>
        <div className="stat-box">
          <span>Estimated Delay</span>
          <strong>{estimatedWaitMinutes} min</strong>
        </div>
      </div>
    </div>
  );
}

export default CurrentTokenCard;
