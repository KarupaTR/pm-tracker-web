import { getSession } from '../../../lib/session';
import { getMe, refreshToken } from '../../../lib/graph';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.accessToken) return res.json({ authenticated: false });
  try {
    // Refresh if expiring soon
    if (session.expiresAt < Date.now() + 300000) {
      const refreshed = await refreshToken(session.account);
      session.accessToken = refreshed.accessToken;
      session.account = refreshed.account;
      session.expiresAt = refreshed.expiresAt;
      await session.save();
    }
    const user = await getMe(session.accessToken);
    res.json({ authenticated: true, user });
  } catch {
    res.json({ authenticated: false });
  }
}
