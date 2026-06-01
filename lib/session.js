import { getIronSession } from 'iron-session';

export const sessionOptions = {
  password: process.env.SESSION_SECRET || 'fallback-secret-change-this-in-production-32chars',
  cookieName: 'pm_tracker_session',
  cookieOptions: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax' }
};

export async function getSession(req, res) {
  return getIronSession(req, res, sessionOptions);
}
