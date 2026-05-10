const express = require("express");
const QRCode = require("qrcode");
const Queue = require("../models/Queue");
const {
  getActiveTokenForClient,
  getCurrentToken,
  getDetailedAnalytics,
  getQueueSnapshot,
  getTokenStatus
} = require("../utils/queueHelpers");
const { emitBranchUpdate, emitTokenUpdate } = require("../socket");

const router = express.Router();

const getDisplayName = (queueItem) => queueItem.customer_name || "Customer";

router.post("/join-queue", async (req, res) => {
  try {
    const { branch_id, client_id, customer_name } = req.body;

    if (!branch_id || !client_id) {
      return res.status(400).json({ message: "branch_id and client_id are required." });
    }

    const activeToken = await getActiveTokenForClient(branch_id, client_id);

    if (activeToken) {
      const tokenStatus = await getTokenStatus(activeToken._id);

      return res.status(409).json({
        message: "You already have an active token for this branch.",
        token_id: activeToken._id,
        token_number: activeToken.token_number,
        status: tokenStatus
      });
    }

    // Each new customer gets the next token number for the same branch.
    const lastToken = await Queue.findOne({ branch_id }).sort({ token_number: -1 });
    const nextTokenNumber = lastToken ? lastToken.token_number + 1 : 1;

    const queueItem = await Queue.create({
      branch_id,
      client_id,
      customer_name: customer_name || "",
      source: "qr",
      token_number: nextTokenNumber,
      status: "waiting"
    });

    const tokenStatus = await getTokenStatus(queueItem._id);
    await emitBranchUpdate(branch_id, () => getQueueSnapshot(branch_id));
    emitTokenUpdate(queueItem._id.toString(), tokenStatus);

    res.status(201).json({
      message: "Joined queue successfully",
      token_id: queueItem._id,
      token_number: queueItem.token_number,
      status: tokenStatus
    });
  } catch (error) {
    res.status(500).json({ message: "Could not join the queue." });
  }
});

router.post("/manual-add-customer", async (req, res) => {
  try {
    const { branch_id, customer_name } = req.body;

    if (!branch_id) {
      return res.status(400).json({ message: "branch_id is required." });
    }

    const lastToken = await Queue.findOne({ branch_id }).sort({ token_number: -1 });
    const nextTokenNumber = lastToken ? lastToken.token_number + 1 : 1;

    const queueItem = await Queue.create({
      branch_id,
      client_id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      customer_name: customer_name || `Walk-in ${nextTokenNumber}`,
      source: "manual",
      token_number: nextTokenNumber,
      status: "waiting"
    });

    const tokenStatus = await getTokenStatus(queueItem._id);
    await emitBranchUpdate(branch_id, () => getQueueSnapshot(branch_id));
    emitTokenUpdate(queueItem._id.toString(), tokenStatus);

    res.status(201).json({
      message: `${getDisplayName(queueItem)} added as token ${queueItem.token_number}.`,
      token: tokenStatus
    });
  } catch (error) {
    res.status(500).json({ message: "Could not add customer manually." });
  }
});

router.post("/leave-queue", async (req, res) => {
  try {
    const { token_id, client_id } = req.body;

    if (!token_id || !client_id) {
      return res.status(400).json({ message: "token_id and client_id are required." });
    }

    const queueItem = await Queue.findById(token_id);

    if (!queueItem || queueItem.client_id !== client_id) {
      return res.status(404).json({ message: "Active token not found." });
    }

    if (!["waiting", "called"].includes(queueItem.status)) {
      return res.status(400).json({ message: "This token can no longer leave the queue." });
    }

    queueItem.status = "cancelled";
    queueItem.cancelled_at = new Date();
    await queueItem.save();

    const tokenStatus = await getTokenStatus(queueItem._id);
    await emitBranchUpdate(queueItem.branch_id, () => getQueueSnapshot(queueItem.branch_id));
    emitTokenUpdate(queueItem._id.toString(), tokenStatus);

    res.json({
      message: `Token ${queueItem.token_number} left the queue.`,
      token: tokenStatus
    });
  } catch (error) {
    res.status(500).json({ message: "Could not leave the queue." });
  }
});

router.get("/queue-status/:tokenId", async (req, res) => {
  try {
    const tokenStatus = await getTokenStatus(req.params.tokenId);

    if (!tokenStatus) {
      return res.status(404).json({ message: "Token not found." });
    }

    res.json(tokenStatus);
  } catch (error) {
    res.status(500).json({ message: "Could not load queue status." });
  }
});

router.get("/branch/:branchId", async (req, res) => {
  try {
    const snapshot = await getQueueSnapshot(req.params.branchId);
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ message: "Could not load queue data." });
  }
});

router.get("/branch/:branchId/analytics", async (req, res) => {
  try {
    const analytics = await getDetailedAnalytics(req.params.branchId);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: "Could not load analytics graphs." });
  }
});

router.get("/branch/:branchId/qr", async (req, res) => {
  try {
    const { branchId } = req.params;
    const customerUrl = `${process.env.CLIENT_URL}/branch/${branchId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(customerUrl);

    res.json({
      branch_id: branchId,
      url: customerUrl,
      qr_code: qrCodeDataUrl
    });
  } catch (error) {
    res.status(500).json({ message: "Could not generate QR code." });
  }
});

router.post("/next", async (req, res) => {
  try {
    const { branch_id } = req.body;

    if (!branch_id) {
      return res.status(400).json({ message: "branch_id is required." });
    }

    const activeToken = await getCurrentToken(branch_id);

    if (activeToken) {
      return res.status(400).json({
        message: "Please complete the current token before calling the next customer."
      });
    }

    // Only the oldest waiting token should move to the counter next.
    const nextWaitingToken = await Queue.findOne({
      branch_id,
      status: "waiting"
    }).sort({ token_number: 1 });

    if (!nextWaitingToken) {
      return res.status(404).json({ message: "No waiting customers in the queue." });
    }

    nextWaitingToken.status = "called";
    nextWaitingToken.called_at = new Date();
    await nextWaitingToken.save();

    const tokenStatus = await getTokenStatus(nextWaitingToken._id);
    await emitBranchUpdate(branch_id, () => getQueueSnapshot(branch_id));
    emitTokenUpdate(nextWaitingToken._id.toString(), tokenStatus);

    res.json({
      message: `${getDisplayName(nextWaitingToken)} with token ${nextWaitingToken.token_number} is now active.`,
      currentToken: nextWaitingToken
    });
  } catch (error) {
    res.status(500).json({ message: "Could not move the queue forward." });
  }
});

router.post("/complete", async (req, res) => {
  try {
    const { branch_id } = req.body;

    if (!branch_id) {
      return res.status(400).json({ message: "branch_id is required." });
    }

    const activeToken = await getCurrentToken(branch_id);

    if (!activeToken) {
      return res.status(404).json({ message: "No active customer to complete." });
    }

    activeToken.status = "completed";
    activeToken.completed_at = new Date();
    await activeToken.save();

    const tokenStatus = await getTokenStatus(activeToken._id);
    await emitBranchUpdate(branch_id, () => getQueueSnapshot(branch_id));
    emitTokenUpdate(activeToken._id.toString(), tokenStatus);

    res.json({
      message: `${getDisplayName(activeToken)} with token ${activeToken.token_number} marked as completed.`,
      completedToken: activeToken
    });
  } catch (error) {
    res.status(500).json({ message: "Could not complete the current token." });
  }
});

module.exports = router;
