import { useState } from "react";

function LoginForm({ onLogin, loading, error }) {
  const [formData, setFormData] = useState({
    username: "admin",
    password: "admin123"
  });

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin(formData);
  };

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Bank Dashboard</p>
        <h1>Admin Login</h1>
        <p className="muted">Use the seeded credentials to manage the queue.</p>
      </div>

      <label>
        Username
        <input
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Enter username"
        />
      </label>

      <label>
        Password
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter password"
        />
      </label>

      {error ? <p className="error-text">{error}</p> : null}

      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Login"}
      </button>
    </form>
  );
}

export default LoginForm;
