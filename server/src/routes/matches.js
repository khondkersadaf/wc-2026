import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { fetchWorldCupMatches, normalizeMatch } from '../services/footballApi.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  const { status, stage } = req.query;
  const where = {};
  if (status) where.status = status;
  if (stage) where.stage = stage;

  const matches = await prisma.match.findMany({
    where,
    orderBy: { matchDate: 'asc' },
    include: {
      _count: { select: { bets: true } },
    },
  });
  res.json(matches);
});

router.get('/:id', requireAuth, async (req, res) => {
  const match = await prisma.match.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      bets: {
        where: { userId: req.user.id },
        select: { id: true, betType: true, prediction: true, stake: true, odds: true, status: true, payout: true },
      },
    },
  });
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json(match);
});

// Sync goals from the same football-data.org response (no separate API needed)
router.post('/sync-goals', requireAdmin, async (req, res) => {
  try {
    const apiMatches = await fetchWorldCupMatches();
    let updated = 0;

    for (const m of apiMatches) {
      const data = normalizeMatch(m);
      if (!data.goals) continue;

      const existing = await prisma.match.findUnique({
        where: { externalId: data.externalId },
        select: { id: true, goals: true },
      });
      if (!existing) continue;

      const existingCount = existing.goals ? JSON.parse(existing.goals).length : 0;
      if (data.goals.length >= existingCount) {
        await prisma.match.update({
          where: { id: existing.id },
          data: { goals: JSON.stringify(data.goals) },
        });
        updated++;
      }
    }

    res.json({ ok: true, updated, total: apiMatches.length });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.put('/:id/goals', requireAdmin, async (req, res) => {
  const { goals } = req.body;
  if (!Array.isArray(goals)) return res.status(400).json({ error: 'goals must be an array' });
  const match = await prisma.match.update({
    where: { id: Number(req.params.id) },
    data: { goals: JSON.stringify(goals) },
  });
  res.json({ ok: true, goals: match.goals });
});

router.post('/sync', requireAdmin, async (req, res) => {
  try {
    const apiMatches = await fetchWorldCupMatches();
    let updated = 0;
    let created = 0;

    for (const m of apiMatches) {
      const data = normalizeMatch(m);
      const existing = await prisma.match.findUnique({ where: { externalId: data.externalId } });

      if (existing) {
        // Preserve manually-entered goals unless API has more
        const { goals, ...fieldsWithoutGoals } = data;
        const existingGoalCount = existing.goals ? JSON.parse(existing.goals).length : 0;
        const newGoalCount = goals ? goals.length : 0;
        const updateData = newGoalCount >= existingGoalCount && goals
          ? data
          : fieldsWithoutGoals;

        await prisma.match.update({ where: { externalId: data.externalId }, data: updateData });
        updated++;
      } else {
        await prisma.match.create({ data });
        created++;
      }
    }

    res.json({ ok: true, created, updated, total: apiMatches.length });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
