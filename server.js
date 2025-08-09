import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import morgan from 'morgan';

import clientRoutes from './routes/clientRoutes.js';
import authRoutes from './routes/authRoutes.js';
import statsRoutes from './routes/statsRoutes.js'
import userRoutes from './routes/userRoutes.js';
import securityMiddleware from './middleware/security.js';

dotenv.config();
const app = express();

// Security middleware - cors, helmet, rate limiting
securityMiddleware(app);

app.use(express.json());

// Health check endpoint (no auth required)
app.get('/api/healthz', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Logger middleware - logs HTTP requests in development and production
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev')); // concise colored output for dev
} else {
  app.use(morgan('combined')); // standard Apache combined log output for prod
}

// Routes
app.use('/api/clients', clientRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', userRoutes);

let server;

// MongoDB connection and server start with error handling 
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server = app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
  })
  .catch(err => console.error(err));

// Graceful connection shutdown 
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await mongoose.disconnect();
  server.close(() => process.exit(0));
});

/**
 * Gracefully handle unhandled promise rejections.
 * Logs the error reason and shuts down the server to prevent unknown state.
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  server.close(() => process.exit(1));
});

// Global error handler middleware.
// Catches all errors thrown in the app and returns a JSON response.
// In production: hides internal error details for security.
// In development: shows error message and stack trace for easier debugging.
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ message: 'Internal server error' });
  } else {
    res.status(500).json({ message: err.message, stack: err.stack });
  }
});