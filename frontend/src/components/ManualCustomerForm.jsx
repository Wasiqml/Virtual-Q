import { useState } from "react";

function ManualCustomerForm({ onSubmit, loading }) {
  const [customerName, setCustomerName] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(customerName);
    setCustomerName("");
  };

  return (
    <form className="card manual-form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Walk-In Entry</p>
        <h2>Add Customer Manually</h2>
        <p className="muted">Use this for customers who arrive at the branch without scanning the QR code.</p>
      </div>

      <label>
        Customer Name
        <input
          onChange={(event) => setCustomerName(event.target.value)}
          placeholder="Example: Priya or Walk-in customer"
          value={customerName}
        />
      </label>

      <button className="primary-button" disabled={loading} type="submit">
        {loading ? "Adding..." : "Add to Queue"}
      </button>
    </form>
  );
}

export default ManualCustomerForm;
