let io = null;

module.exports = {
  setIO: (serverIo) => {
    io = serverIo;
  },
  getIO: () => io,
};
