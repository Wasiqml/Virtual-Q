let ioInstance = null;

const setSocketServer = (io) => {
  ioInstance = io;
};

const emitBranchUpdate = async (branchId, payloadBuilder) => {
  if (!ioInstance) {
    return;
  }

  const payload = await payloadBuilder();
  ioInstance.to(`branch:${branchId}`).emit("branch:update", payload);
};

const emitTokenUpdate = (tokenId, payload) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(`token:${tokenId}`).emit("token:update", payload);
};

module.exports = {
  setSocketServer,
  emitBranchUpdate,
  emitTokenUpdate
};
