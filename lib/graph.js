import axios from 'axios';
import { ConfidentialClientApplication } from '@azure/msal-node';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const SCOPES = [
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Chat.ReadWrite',
  'https://graph.microsoft.com/ChatMessage.Send',
  'https://graph.microsoft.com/User.Read',
  'https://graph.microsoft.com/User.ReadBasic.All',
  'offline_access'
];

function getMsal() {
  return new ConfidentialClientApplication({
    auth: {
      clientId: process.env.AZURE_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
    }
  });
}

export async function getAuthUrl(redirectUri) {
  return getMsal().getAuthCodeUrl({ scopes: SCOPES, redirectUri, prompt: 'select_account' });
}

export async function exchangeCode(code, redirectUri) {
  const result = await getMsal().acquireTokenByCode({ code, scopes: SCOPES, redirectUri });
  return {
    accessToken: result.accessToken,
    account: result.account,
    expiresAt: result.expiresOn?.getTime() || Date.now() + 3600000
  };
}

export async function refreshToken(account) {
  const result = await getMsal().acquireTokenSilent({ scopes: SCOPES, account });
  return {
    accessToken: result.accessToken,
    account: result.account,
    expiresAt: result.expiresOn?.getTime() || Date.now() + 3600000
  };
}

async function graphGet(accessToken, path, params = {}) {
  const res = await axios.get(`${GRAPH}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }, params
  });
  return res.data;
}

async function graphPost(accessToken, path, body) {
  const res = await axios.post(`${GRAPH}${path}`, body, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  });
  return res.data;
}

export async function getMe(token) {
  return graphGet(token, '/me', { $select: 'id,displayName,mail' });
}

export async function getRecentEmails(token, daysBack = 7) {
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();
  const data = await graphGet(token, '/me/messages', {
    $filter: `receivedDateTime ge ${since}`,
    $select: 'id,subject,bodyPreview,sender,receivedDateTime,importance',
    $orderby: 'receivedDateTime desc',
    $top: 50
  });
  return data.value || [];
}

export async function getUserByEmail(token, email) {
  try {
    return await graphGet(token, `/users/${encodeURIComponent(email)}`, { $select: 'id,displayName,mail' });
  } catch { return null; }
}

export async function sendTeamsMessage(token, targetEmail, html) {
  const user = await getUserByEmail(token, targetEmail);
  if (!user) throw new Error(`User not found: ${targetEmail}`);
  const me = await getMe(token);

  // Get or create 1:1 chat
  let chatId;
  try {
    const chats = await graphGet(token, '/me/chats', { $filter: "chatType eq 'oneOnOne'", $expand: 'members', $top: 50 });
    const found = (chats.value || []).find(c => (c.members || []).some(m => m.userId === user.id));
    chatId = found ? found.id : null;
  } catch {}

  if (!chatId) {
    const chat = await graphPost(token, '/chats', {
      chatType: 'oneOnOne',
      members: [
        { '@odata.type': '#microsoft.graph.aadUserConversationMember', roles: ['owner'], 'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${me.id}')` },
        { '@odata.type': '#microsoft.graph.aadUserConversationMember', roles: ['owner'], 'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${user.id}')` }
      ]
    });
    chatId = chat.id;
  }

  await graphPost(token, `/chats/${chatId}/messages`, { body: { contentType: 'html', content: html } });
  return { userName: user.displayName };
}

export function reminderHtml(task, senderName) {
  return `<p>Hi,</p><p><b>${senderName}</b> sent you a reminder:</p><blockquote><b>${task.title}</b>${task.due_date ? `<br/>Due: <b>${task.due_date}</b>` : ''}</blockquote><p>Please update on the status at your earliest convenience.</p><p><i>Sent via PM Task Tracker</i></p>`;
}

export function dueNoticeHtml(task, senderName) {
  const overdue = task.due_date < new Date().toISOString().split('T')[0];
  return `<p><b>${overdue ? '⚠️ OVERDUE' : '🔔 Due Today'}</b></p><p><b>${senderName}</b> is tracking a task that is ${overdue ? 'overdue' : 'due today'}:</p><blockquote><b>${task.title}</b><br/>Due: <b>${task.due_date}</b></blockquote><p>Please action this as soon as possible.</p><p><i>Sent via PM Task Tracker</i></p>`;
}
