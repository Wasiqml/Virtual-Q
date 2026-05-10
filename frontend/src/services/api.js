import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

export const loginAdmin = (payload) => api.post("/auth/login", payload);
export const getBranchSnapshot = (branchId) => api.get(`/branch/${branchId}`);
export const getBranchAnalytics = (branchId) => api.get(`/branch/${branchId}/analytics`);
export const getBranchQrCode = (branchId) => api.get(`/branch/${branchId}/qr`);
export const joinQueue = (branchId, clientId, customerName) =>
  api.post("/join-queue", {
    branch_id: branchId,
    client_id: clientId,
    customer_name: customerName
  });
export const getQueueStatus = (tokenId) => api.get(`/queue-status/${tokenId}`);
export const leaveQueue = (tokenId, clientId) =>
  api.post("/leave-queue", { token_id: tokenId, client_id: clientId });
export const addManualCustomer = (branchId, customerName) =>
  api.post("/manual-add-customer", { branch_id: branchId, customer_name: customerName });
export const callNextCustomer = (branchId) => api.post("/next", { branch_id: branchId });
export const completeCurrentCustomer = (branchId) =>
  api.post("/complete", { branch_id: branchId });

export default api;
