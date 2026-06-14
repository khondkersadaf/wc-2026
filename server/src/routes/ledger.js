import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/balances', requireAuth, async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
  });

  const results = await Promise.all(
    users.map(async (user) => {
      const bets = await prisma.bet.findMany({
        where: { userId: user.id, status: { in: ['WON', 'LOST', 'VOID'] } },
      });
      const pending = await prisma.bet.findMany({
        where: { userId: user.id, status: 'PENDING' },
      });

      const totalStaked = bets
        .filter((b) => b.status === 'WON' || b.status === 'LOST')
        .reduce((s, b) => s + b.stake, 0);
      const totalPayout = bets.reduce((s, b) => s + (b.payout || 0), 0);
      const netBalance = totalPayout - totalStaked;
      const pendingStake = pending.reduce((s, b) => s + b.stake, 0);

      return {
        user,
        totalStaked,
        totalPayout,
        netBalance,
        pendingStake,
        betsPlaced: bets.length + pending.length,
        won: bets.filter((b) => b.status === 'WON').length,
        lost: bets.filter((b) => b.status === 'LOST').length,
        pending: pending.length,
      };
    })
  );

  results.sort((a, b) => b.netBalance - a.netBalance);
  res.json(results);
});

router.get('/settleup', requireAuth, async (req, res) => {
  const users = await prisma.user.findMany({ select: { id: true, name: true } });

  const balances = await Promise.all(
    users.map(async (user) => {
      const bets = await prisma.bet.findMany({
        where: { userId: user.id, status: { in: ['WON', 'LOST'] } },
      });
      const totalStaked = bets.filter((b) => b.status !== 'VOID').reduce((s, b) => s + b.stake, 0);
      const totalPayout = bets.reduce((s, b) => s + (b.payout || 0), 0);
      return { id: user.id, name: user.name, balance: totalPayout - totalStaked };
    })
  );

  const debtors = balances
    .filter((u) => u.balance < -0.01)
    .map((u) => ({ ...u, balance: Math.abs(u.balance) }))
    .sort((a, b) => b.balance - a.balance);

  const creditors = balances
    .filter((u) => u.balance > 0.01)
    .sort((a, b) => b.balance - a.balance);

  const transactions = [];
  let i = 0;
  let j = 0;
  const d = debtors.map((x) => ({ ...x }));
  const c = creditors.map((x) => ({ ...x }));

  while (i < d.length && j < c.length) {
    const amount = Math.min(d[i].balance, c[j].balance);
    if (amount > 0.01) {
      transactions.push({ from: d[i].name, to: c[j].name, amount: Math.round(amount * 100) / 100 });
    }
    d[i].balance -= amount;
    c[j].balance -= amount;
    if (d[i].balance < 0.01) i++;
    if (c[j].balance < 0.01) j++;
  }

  res.json({ transactions, balances });
});

router.get('/history', requireAuth, async (req, res) => {
  const where = req.user.isAdmin ? {} : { userId: req.user.id };
  const bets = await prisma.bet.findMany({
    where: { ...where, status: { in: ['WON', 'LOST', 'VOID'] } },
    include: {
      user: { select: { name: true } },
      match: { select: { homeTeam: true, awayTeam: true, matchDate: true } },
    },
    orderBy: { settledAt: 'desc' },
    take: 100,
  });
  res.json(bets);
});

export default router;
