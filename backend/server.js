require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const threatRoutes = require('./routes/threats');
const riskRoutes = require('./routes/risks');
const { errorHandler, notFound } = require('./middleware/errors');

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(s => s.trim());

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: false
}));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'Cyber Risk Dashboard API' }));
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/threats', threatRoutes);
app.use('/api/risks', riskRoutes);
app.use(notFound);
app.use(errorHandler);

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI. Copy .env.example to .env and configure MongoDB.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
    console.error('JWT_SECRET must be set to a random string of at least 24 characters.');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected.');
    app.listen(port, () => console.log(`Cyber Risk Dashboard API running on port ${port}`));
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}
start();
