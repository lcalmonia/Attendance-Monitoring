import express from 'express';
import { readState, writeState, PersistedState } from './persistence';

const router = express.Router();

router.get('/health', async (_req, res) => {
  try {
    await readState();
    res.json({ ok: true, service: 'worksphere-api' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, service: 'worksphere-api' });
  }
});

router.get('/state', async (_req, res) => {
  try {
    const state = await readState();
    res.json(state ?? {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to read application state.' });
  }
});

router.put('/state', express.json({ limit: '5mb' }), async (req, res) => {
  try {
    const state = req.body as PersistedState;
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      return res.status(400).json({ error: 'State must be a JSON object.' });
    }
    await writeState(state);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to persist application state.' });
  }
});

export default router;
