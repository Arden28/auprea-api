const express = require('express');
const { body, param } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const assets = await prisma.asset.findMany({
      where: { userId: req.userId },
      include: { documents: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(assets);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  validate([
    body('name').trim().notEmpty(),
    body('category').trim().notEmpty(),
    body('value').isFloat({ min: 0 }),
  ]),
  async (req, res, next) => {
    try {
      const { name, category, value } = req.body;
      const asset = await prisma.asset.create({
        data: { userId: req.userId, name, category, value: parseFloat(value) },
        include: { documents: true },
      });
      res.status(201).json(asset);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  validate([
    param('id').isUUID(),
    body('value').optional().isFloat({ min: 0 }),
  ]),
  async (req, res, next) => {
    try {
      const asset = await prisma.asset.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!asset) return res.status(404).json({ error: 'Not found' });

      const data = {};
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.category !== undefined) data.category = req.body.category;
      if (req.body.value !== undefined) data.value = parseFloat(req.body.value);

      const updated = await prisma.asset.update({
        where: { id: req.params.id },
        data,
        include: { documents: true },
      });
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
      const asset = await prisma.asset.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!asset) return res.status(404).json({ error: 'Not found' });

      await prisma.asset.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

/* ── Documents sub-resource ─────────────────────────────────────────────── */
router.post(
  '/:id/documents',
  validate([
    param('id').isUUID(),
    body('fileName').trim().notEmpty(),
  ]),
  async (req, res, next) => {
    try {
      const asset = await prisma.asset.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!asset) return res.status(404).json({ error: 'Not found' });

      const doc = await prisma.document.create({
        data: { assetId: req.params.id, fileName: req.body.fileName },
      });
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:assetId/documents/:docId',
  validate([param('assetId').isUUID(), param('docId').isUUID()]),
  async (req, res, next) => {
    try {
      const asset = await prisma.asset.findFirst({ where: { id: req.params.assetId, userId: req.userId } });
      if (!asset) return res.status(404).json({ error: 'Not found' });

      const doc = await prisma.document.findFirst({ where: { id: req.params.docId, assetId: req.params.assetId } });
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      await prisma.document.delete({ where: { id: req.params.docId } });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
