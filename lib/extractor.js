// Rule-based task extractor — no AI API key required

const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };
const TODAY = () => new Date().toISOString().split('T')[0];

const ACTION_PATTERNS = [
  /\bplease\b.{0,60}(review|confirm|update|provide|send|share|complete|check|action|approve|respond|reply|fix|resolve)/i,
  /\b(action required|action needed|please action|needs your|requires your|waiting on you|your input|your approval|your review|your feedback)\b/i,
  /\b(can you|could you|would you|kindly|request you)\b.{0,60}(review|confirm|update|provide|send|check|approve|fix)/i,
  /\b(follow.?up|reminder|don.t forget)\b/i,
  /\b(urgent|asap|high priority|critical|blocker)\b/i,
  /\b(deadline|due date|due by|by end of|eod|eow|by tomorrow)\b/i,
];
const OWED_PATTERNS = [
  /\b(waiting for|waiting on|pending from|will send you|will provide|will share)\b/i,
  /\b(you requested|as requested|as discussed|as agreed)\b/i,
];
const JUNK = /newsletter|unsubscribe|digest|no.?reply|automatic reply|out of office|\booo\b|accepted:|declined:|cancelled:|fw:|fwd:|shipping|invoice|receipt/i;

function extractDueDate(text) {
  const t = text.toLowerCase();
  if (/today|eod/.test(t)) return TODAY();
  if (/tomorrow/.test(t)) return addDays(1);
  if (/this week|eow|by friday/.test(t)) return addDays(3);
  if (/next week/.test(t)) return addDays(7);
  if (/urgent|asap|critical|blocker/.test(t)) return addDays(1);
  if (/high priority/.test(t)) return addDays(2);
  const months = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  const m = t.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})/i);
  if (m) { const mon = months[m[1].toLowerCase().slice(0,3)]; if (mon) return `${new Date().getFullYear()}-${String(mon).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`; }
  const m2 = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
  if (m2) { const mon = months[m2[2].toLowerCase().slice(0,3)]; if (mon) return `${new Date().getFullYear()}-${String(mon).padStart(2,'0')}-${String(m2[1]).padStart(2,'0')}`; }
  return addDays(3);
}

function senderName(email) {
  return (email?.sender?.name || email?.sender?.address || 'Unknown').replace(/\s*\(.*?\)/g,'').trim();
}

export function extractTasksFromEmails(emails, existingTitles = []) {
  const tasks = [], owedItems = [];
  const existingLower = existingTitles.map(t => t.toLowerCase());

  for (const email of emails) {
    const subject = email.subject || '';
    const preview = email.bodyPreview || '';
    const combined = (subject + ' ' + preview).toLowerCase();
    const sender = senderName(email);
    const senderAddr = email.sender?.address || '';
    if (JUNK.test(subject) || !subject.trim()) continue;

    // Azure DevOps emails
    const isAdo = senderAddr.includes('azuredevops') || senderAddr.includes('devops.email') || /azure devops/i.test(subject);
    if (isAdo) {
      const m = (subject + ' ' + preview).match(/(Bug|User Story|Task|Feature|Epic|Test Case)\s+(\d+)\s*[-—]\s*(.{5,100})/i);
      const title = m ? `Review ${m[1]} #${m[2]} — ${m[3].trim().slice(0,100)}` : `Review ADO: ${subject.replace(/^Re:\s*/i,'').slice(0,120)}`;
      if (!existingLower.some(e => e.includes(title.toLowerCase().slice(0,35)))) {
        tasks.push({ title, source:'outlook', dueDate: /bug/i.test(subject) ? addDays(1) : addDays(2), ref:`ADO: ${subject.slice(0,80)}`, personName: sender });
      }
      continue;
    }

    // Teams notifications
    const isTeams = senderAddr.includes('teams.mail') || senderAddr.includes('noreply@email.teams');
    if (isTeams) {
      const ch = preview.match(/mentioned\s+\w+\s+in\s+(.{5,60})/i)?.[1] || preview.match(/message[s]?\s+in\s+(.{5,50})/i)?.[1] || 'Teams';
      const title = `Respond to Teams message in ${ch.trim().slice(0,60)}`;
      if (!existingLower.some(e => e.includes(ch.toLowerCase().slice(0,20)))) {
        tasks.push({ title, source:'teams', dueDate: addDays(1), ref:`Teams: ${ch.trim().slice(0,60)}`, personName: sender });
      }
      continue;
    }

    // Owed items
    if (OWED_PATTERNS.some(p => p.test(combined))) {
      owedItems.push({ person: sender, email: senderAddr, description: subject.replace(/^Re:\s*/i,'').slice(0,120), dueDate: extractDueDate(combined) });
    }

    // Action-required
    if (ACTION_PATTERNS.some(p => p.test(combined))) {
      const clean = subject.replace(/^(Re:|Fwd?:|FW:)\s*/gi,'').trim();
      const title = `Review and action: ${clean}`.slice(0,160);
      if (!existingLower.some(e => e.includes(clean.toLowerCase().slice(0,30)))) {
        tasks.push({ title, source:'outlook', dueDate: extractDueDate(combined), ref:`Email from ${sender}`, personName: sender });
      }
    }
  }
  return { tasks, owedItems };
}
