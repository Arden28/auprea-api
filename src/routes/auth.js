const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const { body } = require('express-validator');
const prisma = require('../lib/prisma');
const { signAccess, signRefresh, saveRefreshToken, rotateRefreshToken, revokeAllForUser, verifyRefreshToken } = require('../lib/tokens');
const { validate } = require('../middleware/validate');
const config = require('../config');

const router = express.Router();

/* ── Cookie helper ─────────────────────────────────────────────────────── */
const COOKIE_OPTS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: config.nodeEnv === 'production' ? 'lax' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',  // broad path so the proxy doesn't strip it
};

const setRefreshCookie = (res, token) =>
  res.cookie('rt', token, COOKIE_OPTS);

const clearRefreshCookie = (res) =>
  res.clearCookie('rt', { path: '/' });

/* ── Register ──────────────────────────────────────────────────────────── */
router.post(
  '/register',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
  ]),
  async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { email, passwordHash, firstName, lastName },
      });

      const accessToken = signAccess(user.id);
      const refreshToken = signRefresh();
      await saveRefreshToken(user.id, refreshToken);
      setRefreshCookie(res, refreshToken);

      res.status(201).json({
        accessToken,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      });
    } catch (err) {
      next(err);
    }
  }
);

/* ── Login ─────────────────────────────────────────────────────────────── */
router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ]),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const accessToken = signAccess(user.id);
      const refreshToken = signRefresh();
      await saveRefreshToken(user.id, refreshToken);
      setRefreshCookie(res, refreshToken);

      res.json({
        accessToken,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      });
    } catch (err) {
      next(err);
    }
  }
);

/* ── Refresh ────────────────────────────────────────────────────────────── */
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.rt;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    const record = await verifyRefreshToken(token);
    if (!record) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const newRefresh = await rotateRefreshToken(token, record.userId);
    const accessToken = signAccess(record.userId);
    setRefreshCookie(res, newRefresh);

    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

/* ── Logout ─────────────────────────────────────────────────────────────── */
router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.rt;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
    }
    clearRefreshCookie(res);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

/* ── Google OAuth ────────────────────────────────────────────────────────
   Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in env.
   Scaffold: configure passport strategy only if credentials are present.
─────────────────────────────────────────────────────────────────────────── */
if (config.google.clientId) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          let user = await prisma.user.findFirst({
            where: { OR: [{ googleId: profile.id }, { email }] },
          });

          if (user) {
            if (!user.googleId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId: profile.id },
              });
            }
          } else {
            user = await prisma.user.create({
              data: {
                googleId: profile.id,
                email: email || `google-${profile.id}@oauth.local`,
                firstName: profile.name?.givenName || '',
                lastName: profile.name?.familyName || '',
              },
            });
          }
          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );

  router.get('/google', passport.authenticate('google', { session: false }));

  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${config.clientUrl}/login?error=oauth` }),
    async (req, res, next) => {
      try {
        const user = req.user;
        const accessToken = signAccess(user.id);
        const refreshToken = signRefresh();
        await saveRefreshToken(user.id, refreshToken);
        setRefreshCookie(res, refreshToken);
        res.redirect(`${config.clientUrl}/oauth-callback?token=${accessToken}`);
      } catch (err) {
        next(err);
      }
    }
  );
}

/* ── LinkedIn OAuth ──────────────────────────────────────────────────────
   Requires LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in env.
─────────────────────────────────────────────────────────────────────────── */
if (config.linkedin.clientId) {
  passport.use(
    new LinkedInStrategy(
      {
        clientID: config.linkedin.clientId,
        clientSecret: config.linkedin.clientSecret,
        callbackURL: config.linkedin.callbackUrl,
        scope: ['r_emailaddress', 'r_liteprofile'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          let user = await prisma.user.findFirst({
            where: { OR: [{ linkedinId: profile.id }, ...(email ? [{ email }] : [])] },
          });

          if (user) {
            if (!user.linkedinId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { linkedinId: profile.id },
              });
            }
          } else {
            user = await prisma.user.create({
              data: {
                linkedinId: profile.id,
                email: email || `linkedin-${profile.id}@oauth.local`,
                firstName: profile.name?.givenName || '',
                lastName: profile.name?.familyName || '',
              },
            });
          }
          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );

  router.get('/linkedin', passport.authenticate('linkedin', { session: false }));

  router.get(
    '/linkedin/callback',
    passport.authenticate('linkedin', { session: false, failureRedirect: `${config.clientUrl}/login?error=oauth` }),
    async (req, res, next) => {
      try {
        const user = req.user;
        const accessToken = signAccess(user.id);
        const refreshToken = signRefresh();
        await saveRefreshToken(user.id, refreshToken);
        setRefreshCookie(res, refreshToken);
        res.redirect(`${config.clientUrl}/oauth-callback?token=${accessToken}`);
      } catch (err) {
        next(err);
      }
    }
  );
}

module.exports = router;
