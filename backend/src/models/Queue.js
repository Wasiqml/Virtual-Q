const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema(
  {
    branch_id: {
      type: String,
      required: true,
      index: true
    },
    client_id: {
      type: String,
      required: true,
      index: true
    },
    customer_name: {
      type: String,
      trim: true,
      default: ""
    },
    source: {
      type: String,
      enum: ["qr", "manual"],
      default: "qr"
    },
    token_number: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["waiting", "called", "completed", "cancelled"],
      default: "waiting"
    },
    called_at: Date,
    completed_at: Date,
    cancelled_at: Date
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Queue", queueSchema);
