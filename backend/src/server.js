require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDatabase = require("./config/db");
const { setSocketServer } = require("./socket");
const { getQueueSnapshot, getTokenStatus } = require("./utils/queueHelpers");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDatabase();

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173"
    }
  });

  setSocketServer(io);

  io.on("connection", (socket) => {
    socket.on("branch:subscribe", async (branchId) => {
      socket.join(`branch:${branchId}`);
      const snapshot = await getQueueSnapshot(branchId);
      socket.emit("branch:update", snapshot);
    });

    socket.on("token:subscribe", async (tokenId) => {
      socket.join(`token:${tokenId}`);
      const tokenStatus = await getTokenStatus(tokenId);

      if (tokenStatus) {
        socket.emit("token:update", tokenStatus);
      }
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
