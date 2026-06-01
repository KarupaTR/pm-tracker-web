import { getSession } from '../../lib/session';
import { getRecentEmails, getMe, refreshToken } from '../../lib/graph';
import { extractTasksFromEmails } from '../../lib/extractor';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.accessToken) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });

  try {
    // Refresh token if needed
    if (session.expiresAt < Date.now() + 300000) {
      const r = await refreshToken(session.account);
      session.accessToken = r.accessToken;
      session.account = r.account;
      session.expiresAt = r.expiresAt;
      await session.save();
    }

    const { existingTitles = [] } = req.body;
    const emails = await getRecentEmails(session.accessToken, 7);
    const extracted = extractTasksFromEmails(emails, existingTitles);

    res.json({ ok: true, emailsScanned: emails.length, ...extracted });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
