require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const passport = require('passport');

const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');

const authRouter = require('./routes/auth');
const meRouter = require('./routes/me');
const assetsRouter = require('./routes/assets');
const debtsRouter = require('./routes/debts');
const notificationsRouter = require('./routes/notifications');
const familyMembersRouter = require('./routes/familyMembers');

const app = express();

/* ── Security ───────────────────────────────────────────────────────────── */
app.use(helmet());
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));

/* ── Logging ────────────────────────────────────────────────────────────── */
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

/* ── Body & cookie parsing ──────────────────────────────────────────────── */
app.use(express.json());
app.use(cookieParser());

/* ── Rate limiting ──────────────────────────────────────────────────────── */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

/* ── Passport ───────────────────────────────────────────────────────────── */
app.use(passport.initialize());

/* ── Routes ─────────────────────────────────────────────────────────────── */
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/me', apiLimiter, meRouter);
app.use('/api/assets', apiLimiter, assetsRouter);
app.use('/api/debts', apiLimiter, debtsRouter);
app.use('/api/notifications', apiLimiter, notificationsRouter);
app.use('/api/family-members', apiLimiter, familyMembersRouter);

/* ── Health check ───────────────────────────────────────────────────────── */
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

/* ── 404 ─────────────────────────────────────────────────────────────────── */
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

/* ── Error handler ──────────────────────────────────────────────────────── */
app.use(errorHandler);

/* ── Start ──────────────────────────────────────────────────────────────── */
if (process.env.VERCEL !== '1') {
  app.listen(config.port, () => {
    console.log(`Auprea API running on port ${config.port} [${config.nodeEnv}]`);
  });
}

module.exports = app;
