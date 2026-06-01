import { getSession } from '../../lib/session';
import { sendTeamsMessage, getMe, reminderHtml, refreshToken } from '../../lib/graph';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.accessToken) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });

  const { targetEmail, task } = req.body;
  if (!targetEmail || !task) return res.status(400).json({ error: 'targetEmail and task required' });

  try {
    if (session.expiresAt < Date.now() + 300000) {
      const r = await refreshToken(session.account);
      session.accessToken = r.accessToken;
      session.account = r.account;
      session.expiresAt = r.expiresAt;
      await session.save();
    }
    const me = await getMe(session.accessToken);
    const result = await sendTeamsMessage(session.accessToken, targetEmail, reminderHtml(task, me.displayName));
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
