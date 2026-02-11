import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbService } from '../services/db.service';

const router = Router();
const JWT_SECRET = 'ironcord_secret_key_change_me';

// Register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, irc_nick, ircNick } = req.body;
  const finalIrcNick = irc_nick || ircNick;

  if (!email || !password || !finalIrcNick) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await dbService.query(
      'INSERT INTO users (email, password_hash, irc_nick) VALUES ($1, $2, $3) RETURNING id, email, irc_nick',
      [email, passwordHash, finalIrcNick]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ success: true, user, token });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const result = await dbService.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    const { password_hash, ...userWithoutPassword } = user;

    res.json({ success: true, user: userWithoutPassword, token });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Failed to login' });
  }
});

export default router;
