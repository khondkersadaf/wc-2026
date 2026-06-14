import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

function makeToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

router.post('/login', async (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) return res.status(400).json({ error: 'Name and PIN required' });

  const user = await prisma.user.findUnique({ where: { name } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(String(pin), user.pin);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({ token: makeToken(user), user: { id: user.id, name: user.name, isAdmin: user.isAdmin } });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, isAdmin: true, createdAt: true },
  });
  res.json(user);
});

router.get('/users', requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, isAdmin: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  res.json(users);
});

router.post('/users', requireAdmin, async (req, res) => {
  const { name, pin, isAdmin = false } = req.body;
  if (!name || !pin) return res.status(400).json({ error: 'Name and PIN required' });

  const hashed = await bcrypt.hash(String(pin), 10);
  try {
    const user = await prisma.user.create({
      data: { name, pin: hashed, isAdmin },
      select: { id: true, name: true, isAdmin: true },
    });
    res.status(201).json(user);
  } catch {
    res.status(409).json({ error: 'User already exists' });
  }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});

router.patch('/users/:id/pin', requireAdmin, async (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN required' });
  const hashed = await bcrypt.hash(String(pin), 10);
  await prisma.user.update({ where: { id: Number(req.params.id) }, data: { pin: hashed } });
  res.json({ ok: true });
});

export default router;
