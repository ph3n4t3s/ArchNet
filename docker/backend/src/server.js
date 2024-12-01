const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const winston = require('winston');
const dotenv = require('dotenv');

// Import des routes
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');

// Import des services
const scenarioManager = require('./services/scenarioManager');
const realtimeEvents = require('./services/realtimeEvents');

// Configuration
dotenv.config();
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  req.logger = logger;
  next();
});

// Routes
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// WebSocket handling
io.on('connection', (socket) => {
  logger.info(`New client connected: ${socket.id}`);

  socket.on('teacher:join', (data) => {
    socket.join('teacher-room');
    logger.info(`Teacher joined: ${socket.id}`);
  });

  socket.on('student:join', (data) => {
    socket.join('student-room');
    socket.studentData = data;
    logger.info(`Student joined: ${socket.id}`, data);
  });

  socket.on('simulation:start', async (data) => {
    try {
      await scenarioManager.startScenario(data.scenarioId);
      io.to('teacher-room').emit('simulation:started', {
        scenarioId: data.scenarioId,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error starting simulation:', error);
      socket.emit('error', { message: 'Failed to start simulation' });
    }
  });

  socket.on('metrics:update', (data) => {
    try {
      realtimeEvents.processMetrics(data);
      io.to('teacher-room').emit('metrics:updated', data);
    } catch (error) {
      logger.error('Error processing metrics:', error);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    if (socket.studentData) {
      realtimeEvents.handleStudentDisconnect(socket.studentData);
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
