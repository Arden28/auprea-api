const express = require('express');
const { param } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:id/read',
  validate([param('id').isUUID()]),
  async (req, res, next) => {
    try {
      const n = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!n) return res.status(404).json({ error: 'Not found' });

      const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

router.patch('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.userId }, data: { read: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

router.delete(
  '/:id',
  validate([param('id').isUUID()]),
  async (req, res, next) => {
    try {
      const n = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!n) return res.status(404).json({ error: 'Not found' });

      await prisma.notification.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
