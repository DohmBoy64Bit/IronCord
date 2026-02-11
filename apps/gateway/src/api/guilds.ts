import { Router, Response } from 'express';
import { dbService } from '../services/db.service';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// All guild routes require authentication
router.use(authMiddleware);

// Create Guild
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;
  const ownerId = req.user!.userId;

  // Simple namespace generation: #name-
  const namespacePrefix = `#${name.toLowerCase().replace(/\s+/g, '')}-`;

  try {
    const result = await dbService.query(
      'INSERT INTO guilds (name, owner_id, irc_namespace_prefix) VALUES ($1, $2, $3) RETURNING *',
      [name, ownerId, namespacePrefix]
    );
    const guild = result.rows[0];

    // Add owner as member
    await dbService.query(
      'INSERT INTO guild_members (guild_id, user_id) VALUES ($1, $2)',
      [guild.id, ownerId]
    );

    res.status(201).json(guild);
  } catch (err) {
    console.error('Guild creation error:', err);
    res.status(500).json({ error: 'Failed to create guild' });
  }
});

// Create Channel
router.post('/:guildId/channels', async (req: AuthenticatedRequest, res: Response) => {
  const { guildId } = req.params;
  const { name, topic } = req.body;

  try {
    const guildRes = await dbService.query('SELECT irc_namespace_prefix FROM guilds WHERE id = $1', [guildId]);
    if (guildRes.rows.length === 0) return res.status(404).json({ error: 'Guild not found' });

    const prefix = guildRes.rows[0].irc_namespace_prefix;
    const ircChannelName = `${prefix}${name.toLowerCase().replace(/\s+/g, '')}`;

    const result = await dbService.query(
      'INSERT INTO channels (guild_id, name, irc_channel_name, topic) VALUES ($1, $2, $3, $4) RETURNING *',
      [guildId, name, ircChannelName, topic]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Channel creation error:', err);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// Get User Guilds (uses token userId)
router.get('/mine', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  try {
    const result = await dbService.query(
      `SELECT g.* FROM guilds g 
       JOIN guild_members gm ON g.id = gm.guild_id 
       WHERE gm.user_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get user guilds error:', err);
    res.status(500).json({ error: 'Failed to get guilds' });
  }
});

// Get Guild Channels
router.get('/:guildId/channels', async (req: AuthenticatedRequest, res: Response) => {
  const { guildId } = req.params;
  try {
    const result = await dbService.query('SELECT * FROM channels WHERE guild_id = $1', [guildId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get channels error:', err);
    res.status(500).json({ error: 'Failed to get channels' });
  }
});

export default router;
