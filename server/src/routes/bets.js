import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const DEFAULT_ODDS = {
  MATCH_WINNER: 2.0,
  CORRECT_SCORE: 8.0,
  FIRST_GOALSCORER: 10.0,
  TOURNAMENT_WINNER: 5.0,
};

const BET_TYPES = Object.keys(DEFAULT_ODDS);

router.get('/', requireAuth, async (req, res) => {
  const where = req.user.isAdmin ? {} : { userId: req.user.id };
  const bets = await prisma.bet.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      match: { select: { id: true, homeTeam: true, awayTeam: true, matchDate: true, status: true, homeScore: true, awayScore: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(bets);
});

router.get('/mine', requireAuth, async (req, res) => {
  const bets = await prisma.bet.findMany({
    where: { userId: req.user.id },
    include: {
      match: { select: { id: true, homeTeam: true, awayTeam: true, matchDate: true, status: true, homeScore: true, awayScore: true, homeCrest: true, awayCrest: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(bets);
});

router.post('/', requireAuth, async (req, res) => {
  const { matchId, betType, prediction, stake, odds, note } = req.body;

  if (!BET_TYPES.includes(betType)) {
    return res.status(400).json({ error: `Invalid bet type. Valid: ${BET_TYPES.join(', ')}` });
  }
  if (!stake || stake <= 0) return res.status(400).json({ error: 'Invalid stake' });
  if (!prediction) return res.status(400).json({ error: 'Prediction required' });

  if (betType !== 'TOURNAMENT_WINNER') {
    if (!matchId) return res.status(400).json({ error: 'matchId required for this bet type' });
    const match = await prisma.match.findUnique({ where: { id: Number(matchId) } });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.status !== 'SCHEDULED' && match.status !== 'TIMED') {
      return res.status(400).json({ error: 'Bets are closed for this match' });
    }
  }

  const finalOdds = odds || DEFAULT_ODDS[betType];

  const bet = await prisma.bet.create({
    data: {
      userId: req.user.id,
      matchId: matchId ? Number(matchId) : null,
      betType,
      prediction: typeof prediction === 'string' ? prediction : JSON.stringify(prediction),
      stake: Number(stake),
      odds: Number(finalOdds),
      note: note || null,
    },
    include: {
      match: { select: { homeTeam: true, awayTeam: true, matchDate: true } },
    },
  });

  res.status(201).json(bet);
});

router.post('/settle/:matchId', requireAdmin, async (req, res) => {
  const matchId = Number(req.params.matchId);
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (match.status !== 'FINISHED') return res.status(400).json({ error: 'Match is not finished' });

  const pendingBets = await prisma.bet.findMany({
    where: { matchId, status: 'PENDING' },
  });

  let settled = 0;
  const now = new Date();

  for (const bet of pendingBets) {
    let won = false;

    if (bet.betType === 'MATCH_WINNER') {
      const pred = bet.prediction;
      won =
        (pred === 'HOME_WIN' && match.winner === 'HOME_TEAM') ||
        (pred === 'DRAW' && match.winner === 'DRAW') ||
        (pred === 'AWAY_WIN' && match.winner === 'AWAY_TEAM');
    } else if (bet.betType === 'CORRECT_SCORE') {
      const p = JSON.parse(bet.prediction);
      won = p.home === match.homeScore && p.away === match.awayScore;
    } else {
      continue;
    }

    await prisma.bet.update({
      where: { id: bet.id },
      data: {
        status: won ? 'WON' : 'LOST',
        payout: won ? bet.stake * bet.odds : 0,
        settledAt: now,
      },
    });
    settled++;
  }

  res.json({ ok: true, settled, remaining: pendingBets.length - settled });
});

router.patch('/:id/settle-manual', requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['WON', 'LOST', 'VOID'].includes(status)) {
    return res.status(400).json({ error: 'status must be WON, LOST, or VOID' });
  }
  const bet = await prisma.bet.findUnique({ where: { id: Number(req.params.id) } });
  if (!bet) return res.status(404).json({ error: 'Bet not found' });

  const payout = status === 'WON' ? bet.stake * bet.odds : status === 'VOID' ? bet.stake : 0;

  await prisma.bet.update({
    where: { id: bet.id },
    data: { status, payout, settledAt: new Date() },
  });
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.bet.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

export default router;
