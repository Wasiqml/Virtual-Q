import { useEffect, useState } from "react";
import LoginForm from "../components/LoginForm";
import QueueTable from "../components/QueueTable";
import CurrentTokenCard from "../components/CurrentTokenCard";
import AnalyticsCards from "../components/AnalyticsCards";
import ManualCustomerForm from "../components/ManualCustomerForm";
import HistoryTable from "../components/HistoryTable";
import {
  addManualCustomer,
  callNextCustomer,
  completeCurrentCustomer,
  getBranchQrCode,
  getBranchSnapshot,
  loginAdmin
} from "../services/api";
import socket from "../services/socket";

const defaultBranchId = import.meta.env.VITE_DEFAULT_BRANCH_ID || "branch-001";
const ADMIN_STORAGE_KEY = "virtual-q:admin-session";

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function AdminPage() {
  const [admin, setAdmin] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const savedAdmin = window.localStorage.getItem(ADMIN_STORAGE_KEY);

    if (!savedAdmin) {
      return null;
    }

    try {
      return JSON.parse(savedAdmin);
    } catch {
      return null;
    }
  });
  const [branchId] = useState(defaultBranchId);
  const [snapshot, setSnapshot] = useState({
    currentToken: null,
    waitingCount: 0,
    estimatedWaitMinutes: 0,
    queue: [],
    history: [],
    analytics: {
      customersToday: 0,
      customersThisWeek: 0,
      customersThisMonth: 0,
      averageServiceMinutes: 0
    }
  });
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [installState, setInstallState] = useState(() => ({
    supported: false,
    installed: typeof window !== "undefined" ? isStandaloneMode() : false
  }));

  useEffect(() => {
    if (!admin) {
      return undefined;
    }

    // Load the initial dashboard data once the admin has logged in.
    const loadDashboard = async () => {
      const [snapshotResponse, qrResponse] = await Promise.all([
        getBranchSnapshot(branchId),
        getBranchQrCode(branchId)
      ]);

      setSnapshot(snapshotResponse.data);
      setQrCode(qrResponse.data.qr_code);
    };

    loadDashboard().catch(() => {
      setError("Could not load dashboard data.");
    });

    // Stay subscribed so the dashboard updates when new customers join.
    socket.emit("branch:subscribe", branchId);

    const handleBranchUpdate = (payload) => {
      setSnapshot(payload);
    };

    socket.on("branch:update", handleBranchUpdate);

    return () => {
      socket.off("branch:update", handleBranchUpdate);
    };
  }, [admin, branchId]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
      setInstallState((current) => ({
        ...current,
        supported: true
      }));
    };

    const handleInstalled = () => {
      setInstallPromptEvent(null);
      setInstallState({
        supported: false,
        installed: true
      });
      setMessage("Virtual Q is now installed on this device.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleLogin = async (credentials) => {
    setLoading(true);
    setError("");

    try {
      const response = await loginAdmin(credentials);
      setAdmin(response.data.admin);
      window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(response.data.admin));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCallNext = async () => {
    setActionLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await callNextCustomer(branchId);
      setMessage(response.data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not call next customer.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await completeCurrentCustomer(branchId);
      setMessage(response.data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not complete current token.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualAdd = async (customerName) => {
    setManualLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await addManualCustomer(branchId, customerName);
      setMessage(response.data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not add customer manually.");
    } finally {
      setManualLoading(false);
    }
  };

  const handleInstallApp = async () => {
    if (!installPromptEvent) {
      return;
    }

    setError("");

    try {
      await installPromptEvent.prompt();
      const choiceResult = await installPromptEvent.userChoice;

      if (choiceResult.outcome === "accepted") {
        setMessage("Install started. Open Virtual Q from your apps after it finishes.");
      }
    } catch {
      setError("Could not show the install prompt.");
    } finally {
      setInstallPromptEvent(null);
      setInstallState((current) => ({
        ...current,
        supported: false
      }));
    }
  };

  if (!admin) {
    return (
      <main className="page-shell auth-shell">
        <LoginForm onLogin={handleLogin} loading={loading} error={error} />
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="dashboard-grid">
        <div className="dashboard-main">
          <div className="card hero-card">
            <div>
              <p className="eyebrow">Virtual Q</p>
              <h1>{admin.username}'s Dashboard</h1>
              <p className="muted">
                Manage the live bank queue for <strong>{branchId}</strong>.
              </p>
            </div>

            <div className="action-row">
              <button className="primary-button" onClick={handleCallNext} disabled={actionLoading}>
                Call Next Customer
              </button>
              <button className="secondary-button" onClick={handleComplete} disabled={actionLoading}>
                Mark as Completed
              </button>
              {installPromptEvent ? (
                <button className="install-button" onClick={handleInstallApp} type="button">
                  Install App
                </button>
              ) : null}
            </div>

            {installState.installed ? (
              <p className="muted">Installed app mode is active on this device.</p>
            ) : null}
            {!installState.installed && !installPromptEvent ? (
              <p className="muted">
                If install is not shown here, use your browser menu and choose install when it becomes available.
              </p>
            ) : null}
            {message ? <p className="success-text">{message}</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
          </div>

          <CurrentTokenCard
            currentToken={snapshot.currentToken}
            waitingCount={snapshot.waitingCount}
            estimatedWaitMinutes={snapshot.estimatedWaitMinutes}
          />

          <ManualCustomerForm loading={manualLoading} onSubmit={handleManualAdd} />

          <QueueTable items={snapshot.queue} />

          <HistoryTable items={snapshot.history} />

          <AnalyticsCards analytics={snapshot.analytics} />
        </div>

        <aside className="dashboard-side">
          <div className="card">
            <p className="eyebrow">Customer Entry</p>
            <h2>Branch QR Code</h2>
            <p className="muted">
              Customers can scan this QR code to join the queue, receive reminder alerts, and leave the queue if plans change.
            </p>
            {qrCode ? <img className="qr-image" src={qrCode} alt="Branch QR code" /> : null}
          </div>
        </aside>
      </section>
    </main>
  );
}

export default AdminPage;
