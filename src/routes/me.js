const express = require('express');
const { body, param } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

/* ── Profile ──────────────────────────────────────────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        spouse: true,
        children: { orderBy: { sortOrder: 'asc' } },
        nextOfKin: { orderBy: { sortOrder: 'asc' } },
        bankAccounts: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { passwordHash, googleId, linkedinId, ...safe } = user;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

router.put(
  '/',
  validate([
    body('email').optional().isEmail().normalizeEmail(),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('annualIncome').optional().isFloat({ min: 0 }),
    body('netWorth').optional().isFloat(),
  ]),
  async (req, res, next) => {
    try {
      const forbidden = ['passwordHash', 'googleId', 'linkedinId', 'id'];
      const data = Object.fromEntries(
        Object.entries(req.body).filter(([k]) => !forbidden.includes(k))
      );

      const user = await prisma.user.update({ where: { id: req.userId }, data });
      const { passwordHash, googleId, linkedinId, ...safe } = user;
      res.json(safe);
    } catch (err) {
      next(err);
    }
  }
);

/* ── Spouse ────────────────────────────────────────────────────────────── */
router.put('/spouse', async (req, res, next) => {
  try {
    const spouse = await prisma.spouse.upsert({
      where: { userId: req.userId },
      update: req.body,
      create: { userId: req.userId, ...req.body },
    });
    res.json(spouse);
  } catch (err) {
    next(err);
  }
});

router.delete('/spouse', async (req, res, next) => {
  try {
    await prisma.spouse.delete({ where: { userId: req.userId } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/* ── Children ──────────────────────────────────────────────────────────── */
router.get('/children', async (req, res, next) => {
  try {
    const children = await prisma.child.findMany({
      where: { userId: req.userId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(children);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/children',
  validate([body('firstNames').trim().notEmpty()]),
  async (req, res, next) => {
    try {
      const child = await prisma.child.create({
        data: { userId: req.userId, ...req.body },
      });
      res.status(201).json(child);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/children/:id',
  validate([param('id').isUUID()]),
  async (req, res, next) => {
    try {
      const child = await prisma.child.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!child) return res.status(404).json({ error: 'Not found' });

      const updated = await prisma.child.update({ where: { id: req.params.id }, data: req.body });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/children/:id',
  validate([param('id').isUUID()]),
  async (req, res, next) => {
    try {
      const child = await prisma.child.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!child) return res.status(404).json({ error: 'Not found' });

      await prisma.child.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

/* ── Next of Kin ───────────────────────────────────────────────────────── */
router.get('/next-of-kin', async (req, res, next) => {
  try {
    const kin = await prisma.nextOfKin.findMany({
      where: { userId: req.userId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(kin);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/next-of-kin',
  validate([body('firstNames').trim().notEmpty()]),
  async (req, res, next) => {
    try {
      const kin = await prisma.nextOfKin.create({
        data: { userId: req.userId, ...req.body },
      });
      res.status(201).json(kin);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/next-of-kin/:id',
  validate([param('id').isUUID()]),
  async (req, res, next) => {
    try {
      const kin = await prisma.nextOfKin.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!kin) return res.status(404).json({ error: 'Not found' });

      const updated = await prisma.nextOfKin.update({ where: { id: req.params.id }, data: req.body });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/next-of-kin/:id',
  validate([param('id').isUUID()]),
  async (req, res, next) => {
    try {
      const kin = await prisma.nextOfKin.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!kin) return res.status(404).json({ error: 'Not found' });

      await prisma.nextOfKin.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

/* ── Bank Accounts ─────────────────────────────────────────────────────── */
router.get('/bank-accounts', async (req, res, next) => {
  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { userId: req.userId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(accounts);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/bank-accounts',
  validate([body('bankName').trim().notEmpty()]),
  async (req, res, next) => {
    try {
      const account = await prisma.bankAccount.create({
        data: { userId: req.userId, ...req.body },
      });
      res.status(201).json(account);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/bank-accounts/:id',
  validate([param('id').isUUID()]),
  async (req, res, next) => {
    try {
      const account = await prisma.bankAccount.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!account) return res.status(404).json({ error: 'Not found' });

      const updated = await prisma.bankAccount.update({ where: { id: req.params.id }, data: req.body });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/bank-accounts/:id',
  validate([param('id').isUUID()]),
  async (req, res, next) => {
    try {
      const account = await prisma.bankAccount.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!account) return res.status(404).json({ error: 'Not found' });

      await prisma.bankAccount.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
