const Queue = require("../models/Queue");

const DEFAULT_WAIT_MINUTES = 5;
const HISTORY_LIMIT = 50;

const toMinutes = (startTime, endTime) => {
  if (!startTime || !endTime) {
    return null;
  }

  const milliseconds = new Date(endTime).getTime() - new Date(startTime).getTime();
  return Math.max(0, Math.round(milliseconds / 60000));
};

const formatQueueRecord = (queueItem) => {
  const completedOrCancelledAt = queueItem.completed_at || queueItem.cancelled_at;

  return {
    _id: queueItem._id,
    branch_id: queueItem.branch_id,
    client_id: queueItem.client_id,
    customer_name: queueItem.customer_name,
    source: queueItem.source,
    token_number: queueItem.token_number,
    status: queueItem.status,
    createdAt: queueItem.createdAt,
    updatedAt: queueItem.updatedAt,
    called_at: queueItem.called_at,
    completed_at: queueItem.completed_at,
    cancelled_at: queueItem.cancelled_at,
    service_duration_minutes: toMinutes(queueItem.called_at, queueItem.completed_at),
    total_duration_minutes: toMinutes(queueItem.createdAt, completedOrCancelledAt)
  };
};

const getDateRanges = () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  const dayOfWeek = startOfWeek.getDay();
  const offsetToMonday = (dayOfWeek + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - offsetToMonday);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return { startOfDay, startOfWeek, startOfMonth };
};

const getAnalytics = async (branchId) => {
  const { startOfDay, startOfWeek, startOfMonth } = getDateRanges();
  const [todayCount, weekCount, monthCount, completedCustomers] = await Promise.all([
    Queue.countDocuments({ branch_id: branchId, createdAt: { $gte: startOfDay } }),
    Queue.countDocuments({ branch_id: branchId, createdAt: { $gte: startOfWeek } }),
    Queue.countDocuments({ branch_id: branchId, createdAt: { $gte: startOfMonth } }),
    Queue.find({ branch_id: branchId, status: "completed", called_at: { $ne: null }, completed_at: { $ne: null } })
  ]);

  const completedDurations = completedCustomers
    .map((customer) => toMinutes(customer.called_at, customer.completed_at))
    .filter((minutes) => minutes !== null);

  const averageServiceMinutes = completedDurations.length
    ? Math.round(
        completedDurations.reduce((total, minutes) => total + minutes, 0) / completedDurations.length
      )
    : 0;

  return {
    customersToday: todayCount,
    customersThisWeek: weekCount,
    customersThisMonth: monthCount,
    averageServiceMinutes,
    completedCustomers: completedCustomers.length
  };
};

const getDetailedAnalytics = async (branchId) => {
  const allCustomers = await Queue.find({ branch_id: branchId }).sort({ createdAt: 1 });
  const today = new Date();
  const dailyTrend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    const label = start.toLocaleDateString("en-US", { weekday: "short" });
    const count = allCustomers.filter(
      (customer) => customer.createdAt >= start && customer.createdAt < end
    ).length;

    return { label, count };
  });

  const statusCounts = ["waiting", "called", "completed", "cancelled"].map((status) => ({
    label: status,
    count: allCustomers.filter((customer) => customer.status === status).length
  }));

  const sourceCounts = ["qr", "manual"].map((source) => ({
    label: source,
    count: allCustomers.filter((customer) => customer.source === source).length
  }));

  const serviceTimes = allCustomers
    .filter((customer) => customer.status === "completed")
    .slice(-7)
    .map((customer) => ({
      label: `#${customer.token_number}`,
      minutes: toMinutes(customer.called_at, customer.completed_at) || 0
    }));

  return {
    dailyTrend,
    statusCounts,
    sourceCounts,
    serviceTimes
  };
};

const getCurrentToken = async (branchId) => {
  return Queue.findOne({ branch_id: branchId, status: "called" }).sort({ updatedAt: -1 });
};

const getActiveTokenForClient = async (branchId, clientId) => {
  return Queue.findOne({
    branch_id: branchId,
    client_id: clientId,
    status: { $in: ["waiting", "called"] }
  }).sort({ createdAt: -1 });
};

const getWaitingQueue = async (branchId) => {
  return Queue.find({ branch_id: branchId, status: "waiting" }).sort({
    token_number: 1
  });
};

const getQueueSnapshot = async (branchId) => {
  const [currentToken, waitingQueue, liveQueue, historyQueue, analytics] = await Promise.all([
    getCurrentToken(branchId),
    getWaitingQueue(branchId),
    Queue.find({ branch_id: branchId, status: { $in: ["waiting", "called"] } }).sort({ token_number: 1 }),
    Queue.find({ branch_id: branchId, status: { $in: ["completed", "cancelled"] } })
      .sort({ updatedAt: -1 })
      .limit(HISTORY_LIMIT),
    getAnalytics(branchId)
  ]);

  return {
    branch_id: branchId,
    currentToken: currentToken ? formatQueueRecord(currentToken) : null,
    waitingCount: waitingQueue.length,
    estimatedWaitMinutes: waitingQueue.length * DEFAULT_WAIT_MINUTES,
    queue: liveQueue.map(formatQueueRecord),
    history: historyQueue.map(formatQueueRecord),
    analytics
  };
};

const getTokenStatus = async (tokenId) => {
  const queueItem = await Queue.findById(tokenId);

  if (!queueItem) {
    return null;
  }

  // Position is based on how many waiting customers are still ahead.
  const waitingBefore = await Queue.countDocuments({
    branch_id: queueItem.branch_id,
    status: "waiting",
    token_number: { $lt: queueItem.token_number }
  });

  let position = 0;

  if (queueItem.status === "waiting") {
    position = waitingBefore + 1;
  }

  if (queueItem.status === "called") {
    position = 0;
  }

  return {
    token_id: queueItem._id,
    branch_id: queueItem.branch_id,
    client_id: queueItem.client_id,
    customer_name: queueItem.customer_name,
    source: queueItem.source,
    token_number: queueItem.token_number,
    status: queueItem.status,
    position,
    estimated_wait_minutes: waitingBefore * DEFAULT_WAIT_MINUTES,
    called_at: queueItem.called_at,
    completed_at: queueItem.completed_at,
    cancelled_at: queueItem.cancelled_at,
    service_duration_minutes: toMinutes(queueItem.called_at, queueItem.completed_at)
  };
};

module.exports = {
  DEFAULT_WAIT_MINUTES,
  formatQueueRecord,
  getCurrentToken,
  getActiveTokenForClient,
  getAnalytics,
  getDetailedAnalytics,
  getWaitingQueue,
  getQueueSnapshot,
  getTokenStatus
};
