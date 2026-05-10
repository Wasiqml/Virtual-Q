import { Navigate, Route, Routes } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import CustomerPage from "./pages/CustomerPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
      <Route path="/branch/:branchId" element={<CustomerPage />} />
    </Routes>
  );
}

export default App;
