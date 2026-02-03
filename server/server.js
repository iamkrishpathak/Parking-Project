const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { spawn } = require('child_process');
const path = require('path');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/authRoutes');
const spaceRoutes = require('./src/routes/spaceRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

const http = require('http');
const { Server } = require('socket.io');
const socketUtil = require('./src/utils/socket');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// api routes
app.use('/api/auth', authRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// fallback handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

const createAdminUser = () => {
  return new Promise((resolve, reject) => {
    const createAdmin = spawn('node', [path.join(__dirname, 'scripts/createAdmin.js')]);
    
    createAdmin.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    
    createAdmin.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    
    createAdmin.on('close', (code) => {
      if (code === 0) {
        console.log('Admin user check/creation completed');
        resolve();
      } else {
        reject(new Error(`Admin creation script exited with code ${code}`));
      }
    });
  });
};

const startServer = async () => {
  await connectDB(MONGODB_URI);
  console.log('Database connected');

  // Create admin user if not exists
  await createAdminUser();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  // store io instance for controllers
  socketUtil.setIO(io);

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(userId);
        console.log(`Socket ${socket.id} joined room ${userId}`);
      }
    });
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  server.listen(PORT, () => {
    console.log(`🚀 PARKBANDHU server running on port ${PORT}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });
};

startServer().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

