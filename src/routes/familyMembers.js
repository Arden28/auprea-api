const express = require('express');
const { body, param } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const members = await prisma.familyMember.findMany({
      where: { userId: req.userId },
      orderBy: { name: 'asc' },
    });
    res.json(members);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  validate([
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['Viewer', 'Editor']),
  ]),
  async (req, res, next) => {
    try {
      const { name, email, role } = req.body;
      const member = await prisma.familyMember.create({
        data: { userId: req.userId, name, email, role: role || 'Viewer' },
      });
      res.status(201).json(member);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  validate([
    param('id').isUUID(),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['Viewer', 'Editor']),
  ]),
  async (req, res, next) => {
    try {
      const member = await prisma.familyMember.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!member) return res.status(404).json({ error: 'Not found' });

      const data = {};
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.email !== undefined) data.email = req.body.email;
      if (req.body.role !== undefined) data.role = req.body.role;

      const updated = await prisma.familyMember.update({ where: { id: req.params.id }, data });
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
      const member = await prisma.familyMember.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!member) return res.status(404).json({ error: 'Not found' });

      await prisma.familyMember.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
