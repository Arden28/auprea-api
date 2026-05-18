const express = require('express');
const { body, param } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const debts = await prisma.debt.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(debts);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  validate([
    body('name').trim().notEmpty(),
    body('category').trim().notEmpty(),
    body('amount').isFloat({ min: 0 }),
  ]),
  async (req, res, next) => {
    try {
      const { name, category, amount } = req.body;
      const debt = await prisma.debt.create({
        data: { userId: req.userId, name, category, amount: parseFloat(amount) },
      });
      res.status(201).json(debt);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  validate([
    param('id').isUUID(),
    body('amount').optional().isFloat({ min: 0 }),
  ]),
  async (req, res, next) => {
    try {
      const debt = await prisma.debt.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!debt) return res.status(404).json({ error: 'Not found' });

      const data = {};
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.category !== undefined) data.category = req.body.category;
      if (req.body.amount !== undefined) data.amount = parseFloat(req.body.amount);

      const updated = await prisma.debt.update({ where: { id: req.params.id }, data });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id',
  validate([param('id').isUUID()]),
  async (req, res, next) => {
    try {
      const debt = await prisma.debt.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!debt) return res.status(404).json({ error: 'Not found' });

      await prisma.debt.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
