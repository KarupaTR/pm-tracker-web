import { getAuthUrl } from '../../../lib/graph';

export default async function handler(req, res) {
  const redirect = `${process.env.NEXTAUTH_URL}/api/auth/callback`;
  try {
    const url = await getAuthUrl(redirect);
    res.redirect(url);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
