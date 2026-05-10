import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getQueueStatus, joinQueue, leaveQueue } from "../services/api";
import socket from "../services/socket";

const DEFAULT_REMINDER_MINUTES = 5;

function getCustomerId(branchId) {
  const storageKey = `virtual-q:customer:${branchId}`;
  const existingCustomerId = localStorage.getItem(storageKey);

  if (existingCustomerId) {
    return existingCustomerId;
  }

  const newCustomerId = `customer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(storageKey, newCustomerId);
  return newCustomerId;
}

function getSavedReminderSettings(branchId) {
  const rawSettings = localStorage.getItem(`virtual-q:settings:${branchId}`);

  if (!rawSettings) {
    return {
      reminderMinutes: DEFAULT_REMINDER_MINUTES,
      alarmEnabled: false
    };
  }

  try {
    const parsedSettings = JSON.parse(rawSettings);

    return {
      reminderMinutes: Number(parsedSettings.reminderMinutes) || DEFAULT_REMINDER_MINUTES,
      alarmEnabled: Boolean(parsedSettings.alarmEnabled)
    };
  } catch {
    return {
      reminderMinutes: DEFAULT_REMINDER_MINUTES,
      alarmEnabled: false
    };
  }
}

function playReminderAlarm() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 1);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 1);
}

function CustomerPage() {
  const { branchId } = useParams();
  const [token, setToken] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showTurnScreen, setShowTurnScreen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const [settings, setSettings] = useState(() => getSavedReminderSettings(branchId));
  const reminderRef = useRef("");
  const customerIdRef = useRef("");

  useEffect(() => {
    customerIdRef.current = getCustomerId(branchId);
    setToken(null);
    setCustomerName("");
    setSettings(getSavedReminderSettings(branchId));
    reminderRef.current = "";
    setMessage("");
    setError("");
    setShowTurnScreen(false);
  }, [branchId]);

  useEffect(() => {
    const savedToken = localStorage.getItem(`virtual-q:${branchId}`);

    if (!savedToken) {
      return undefined;
    }

    const parsedToken = JSON.parse(savedToken);
    setToken(parsedToken);

    // Restore the token after refresh so the customer can keep tracking it.
    getQueueStatus(parsedToken.token_id)
      .then((response) => {
        const refreshedToken = response.data;
        setToken(refreshedToken);
        setShowTurnScreen(refreshedToken.status === "called");

        if (["completed", "cancelled"].includes(refreshedToken.status)) {
          setMessage("");
          localStorage.removeItem(`virtual-q:${branchId}`);
        }
      })
      .catch(() => {
        setError("Could not refresh your queue status.");
      });

    return undefined;
  }, [branchId]);

  useEffect(() => {
    if (!token?.token_id) {
      return undefined;
    }

    // Subscribe to updates for just this customer's token.
    socket.emit("token:subscribe", token.token_id);

    const handleTokenUpdate = (payload) => {
      setToken(payload);

      if (payload.status === "called") {
        setMessage("It's your turn. Please proceed to the counter.");
        setShowTurnScreen(true);
      } else {
        setShowTurnScreen(false);
      }

      if (["completed", "cancelled"].includes(payload.status)) {
        setMessage("");
        localStorage.removeItem(`virtual-q:${branchId}`);
      } else {
        localStorage.setItem(`virtual-q:${branchId}`, JSON.stringify(payload));
      }
    };

    socket.on("token:update", handleTokenUpdate);

    return () => {
      socket.off("token:update", handleTokenUpdate);
    };
  }, [branchId, token?.token_id]);

  useEffect(() => {
    localStorage.setItem(`virtual-q:settings:${branchId}`, JSON.stringify(settings));
  }, [branchId, settings]);

  useEffect(() => {
    if (!token || token.status !== "waiting") {
      reminderRef.current = "";
      return;
    }

    const shouldNotify = token.estimated_wait_minutes <= settings.reminderMinutes;
    const reminderKey = `${token.token_id}:${settings.reminderMinutes}`;

    if (!shouldNotify || reminderRef.current === reminderKey) {
      return;
    }

    reminderRef.current = reminderKey;
    setMessage(
      `Reminder: your turn is expected in about ${token.estimated_wait_minutes} minute(s).`
    );

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Virtual Q reminder", {
        body: `Your turn at ${branchId} is expected in about ${token.estimated_wait_minutes} minute(s).`
      });
    }

    if (settings.alarmEnabled) {
      try {
        playReminderAlarm();
      } catch {
        setError("Reminder alarm could not play on this device.");
      }
    }
  }, [branchId, settings.alarmEnabled, settings.reminderMinutes, token]);

  const handleSettingChange = (event) => {
    const { name, value, type, checked } = event.target;

    setSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : Math.max(1, Number(value) || DEFAULT_REMINDER_MINUTES)
    }));
  };

  const handleEnableNotifications = async () => {
    if (typeof Notification === "undefined") {
      setError("Browser notifications are not supported on this device.");
      return;
    }

    setError("");
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission !== "granted") {
      setError("Notification permission was not granted.");
      return;
    }

    setMessage("Browser notifications are enabled for queue reminders.");
  };

  const handleJoinQueue = async () => {
    const trimmedName = customerName.trim();

    if (!trimmedName) {
      setError("Please enter your name before joining the queue.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await joinQueue(branchId, customerIdRef.current, trimmedName);
      const currentToken = response.data.status;
      setToken(currentToken);
      setShowTurnScreen(false);
      localStorage.setItem(`virtual-q:${branchId}`, JSON.stringify(currentToken));
    } catch (requestError) {
      const existingToken = requestError.response?.data?.status;

      if (requestError.response?.status === 409 && existingToken) {
        setToken(existingToken);
        localStorage.setItem(`virtual-q:${branchId}`, JSON.stringify(existingToken));
        setError("You already have an active queue ticket for this branch.");
      } else {
        setError(requestError.response?.data?.message || "Could not join the queue.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!token?.token_id) {
      return;
    }

    setLeaving(true);
    setError("");
    setMessage("");

    try {
      await leaveQueue(token.token_id, customerIdRef.current);
      localStorage.removeItem(`virtual-q:${branchId}`);
      setToken(null);
      reminderRef.current = "";
      setShowTurnScreen(false);
      setMessage("You have left the queue. You can join again anytime.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not leave the queue.");
    } finally {
      setLeaving(false);
    }
  };

  const canJoinAgain = !token || ["completed", "cancelled"].includes(token.status);
  const showTurnMessage = token?.status === "called";

  if (showTurnScreen && token?.status === "called") {
    return (
      <main className="page-shell customer-shell">
        <section className="turn-screen card">
          <p className="eyebrow">Now Serving</p>
          <h1>It's your turn.</h1>
          <p className="turn-copy">Please proceed to the counter.</p>
          <div className="turn-token">Token #{token.token_number}</div>
          <button className="secondary-button full-width" onClick={() => setShowTurnScreen(false)} type="button">
            Back
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell customer-shell">
      <section className="customer-card card">
        <p className="eyebrow">Branch Queue</p>
        <h1>{branchId}</h1>
        <p className="muted">
          Join the digital queue and follow your position in real time from your phone.
        </p>

        {canJoinAgain ? (
          <>
            <label>
              Your Name
              <input
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Enter your name"
                value={customerName}
              />
            </label>

            <button className="primary-button full-width" onClick={handleJoinQueue} disabled={loading}>
              {loading ? "Joining..." : "Join Queue"}
            </button>
          </>
        ) : (
          <>
            <div className="ticket-panel">
              <div className="ticket-number">
                <span>Your Token</span>
                <strong>#{token.token_number}</strong>
              </div>
              <div className="stats-grid customer-stats">
                <div className="stat-box">
                  <span>Position</span>
                  <strong>{token.position}</strong>
                </div>
                <div className="stat-box">
                  <span>Wait Time</span>
                  <strong>{token.estimated_wait_minutes} min</strong>
                </div>
              </div>
              <div className="status-panel">
                <span>Status</span>
                <strong className={`status-badge ${token.status}`}>{token.status}</strong>
              </div>
              <button className="secondary-button full-width" onClick={handleLeaveQueue} disabled={leaving}>
                {leaving ? "Leaving..." : "Leave Queue"}
              </button>
            </div>

            <div className="card settings-card">
              <div className="settings-header">
                <div>
                  <p className="eyebrow">Reminder Settings</p>
                  <h2>Turn Reminder</h2>
                  <p className="muted">
                    Default reminder is set to 5 minutes. You can change it below if you want.
                  </p>
                </div>
              </div>

              <label>
                Remind me before my turn
                <input
                  min="1"
                  max="60"
                  name="reminderMinutes"
                  onChange={handleSettingChange}
                  type="number"
                  value={settings.reminderMinutes}
                />
              </label>

              <label className="checkbox-row">
                <input
                  checked={settings.alarmEnabled}
                  name="alarmEnabled"
                  onChange={handleSettingChange}
                  type="checkbox"
                />
                <span>Play an alarm sound with the reminder</span>
              </label>

              {notificationPermission !== "granted" ? (
                <button
                  className="secondary-button"
                  disabled={notificationPermission === "unsupported"}
                  onClick={handleEnableNotifications}
                  type="button"
                >
                  {notificationPermission === "unsupported"
                    ? "Notifications not supported"
                    : "Enable Browser Notifications"}
                </button>
              ) : (
                <p className="muted">Browser notifications are enabled for this branch.</p>
              )}
            </div>
          </>
        )}

        {showTurnMessage ? <p className="turn-banner">It's your turn. Please proceed now.</p> : null}
        {message ? <p className="success-text">{message}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </main>
  );
}

export default CustomerPage;
