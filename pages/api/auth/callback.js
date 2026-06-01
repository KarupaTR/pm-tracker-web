import { exchangeCode } from '../../../lib/graph';
import { getSession } from '../../../lib/session';

export default async function handler(req, res) {
  const { code, error } = req.query;
  if (error || !code) return res.redirect('/?auth=error&msg=' + encodeURIComponent(error || 'no_code'));
  try {
    const redirect = `${process.env.NEXTAUTH_URL}/api/auth/callback`;
    const { accessToken, account, expiresAt } = await exchangeCode(code, redirect);
    const session = await getSession(req, res);
    session.accessToken = accessToken;
    session.account = account;
    session.expiresAt = expiresAt;
    await session.save();
    res.redirect('/?auth=success');
  } catch (e) {
    res.redirect('/?auth=error&msg=' + encodeURIComponent(e.message));
  }
}
