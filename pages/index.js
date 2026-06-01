import { useState, useEffect } from 'react';
import Head from 'next/head';

const uid = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36);
const TODAY = () => new Date().toISOString().split('T')[0];
const TASKS_KEY = 'pm_tasks_v2';
const OWED_KEY  = 'pm_owed_v2';

const S_LABELS = { new:'New', inprogress:'In progress', onhold:'On hold', completed:'Completed', wontdo:'Not going to do' };
const S_COLORS = {
  new:       {background:'#e6f1fb',color:'#185fa5'},
  inprogress:{background:'#faeeda',color:'#854f0b'},
  completed: {background:'#eaf3de',color:'#3b6d11'},
  onhold:    {background:'#eeedfe',color:'#534ab7'},
  wontdo:    {background:'#f1efe8',color:'#5f5e5a'},
};
const AV_COLORS=[['#e6f1fb','#185fa5'],['#faeeda','#854f0b'],['#eaf3de','#3b6d11'],['#eeedfe','#534ab7'],['#faece7','#993c1d']];
const fmt = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '';
const isOv = t => t.due_date && t.due_date < TODAY() && !['completed','wontdo'].includes(t.status);
const isDT = t => t.due_date === TODAY() && !['completed','wontdo'].includes(t.status);
const ini  = n => (n||'').split(' ').map(x=>x[0]||'').join('').slice(0,2).toUpperCase();

function ls(key,def){ try{ return JSON.parse(localStorage.getItem(key))||def; }catch{ return def; } }
function ss(key,val){ try{ localStorage.setItem(key,JSON.stringify(val)); }catch{} }

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#efefed;color:#1a1a18;font-size:14px;min-height:100vh}
.app{max-width:980px;margin:0 auto;padding:1.5rem 1rem}
.top-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:10px}
h1{font-size:20px;font-weight:600;letter-spacing:-.3px}
.sub{font-size:12px;color:#6b6b67;margin-top:2px}
.top-acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:1.25rem}
.metric{background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:8px;padding:12px 14px}
.ml{font-size:11px;color:#6b6b67;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px}
.mv{font-size:22px;font-weight:600}
.tabs{display:flex;gap:2px;border-bottom:1px solid rgba(0,0,0,.1);margin-bottom:1.25rem}
.tab-btn{padding:8px 16px;font-size:13px;cursor:pointer;color:#6b6b67;border:none;background:none;border-bottom:2px solid transparent;font-family:inherit}
.tab-btn.active{color:#1a1a18;border-bottom-color:#1a1a18;font-weight:500}
.btn{height:34px;padding:0 14px;font-size:13px;font-weight:500;border-radius:8px;cursor:pointer;white-space:nowrap;border:1px solid rgba(0,0,0,.18);background:#fff;color:#1a1a18;font-family:inherit}
.btn:hover{background:#f5f5f4}.btn:disabled{opacity:.5;cursor:not-allowed}
.btn.primary{background:#1a1a18;color:#fff;border-color:#1a1a18}
.btn.blue{background:#e6f1fb;color:#185fa5;border-color:#85b7eb}
.btn.green{background:#eaf3de;color:#3b6d11;border-color:#97c459}
.btn.amber{background:#faeeda;color:#854f0b;border-color:#ef9f27}
.btn.red{background:#fcebeb;color:#a32d2d;border-color:#f09595}
.btn.sm{height:28px;padding:0 10px;font-size:12px}
.btn.icon{width:28px;height:28px;padding:0;display:inline-flex;align-items:center;justify-content:center}
.abar{display:flex;gap:8px;margin-bottom:1rem;flex-wrap:wrap;align-items:center}
.abar input,.abar select{height:34px;padding:0 10px;border:1px solid rgba(0,0,0,.1);border-radius:8px;background:#fff;color:#1a1a18;font-family:inherit;font-size:13px}
.task-list{display:flex;flex-direction:column;gap:6px}
.tc{background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:12px 14px;display:grid;grid-template-columns:20px 1fr auto;gap:10px;align-items:start}
.tc:hover{border-color:rgba(0,0,0,.2)}
.chk{width:18px;height:18px;border:1.5px solid rgba(0,0,0,.2);border-radius:4px;cursor:pointer;flex-shrink:0;margin-top:1px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff}
.chk.done{background:#639922;border-color:#639922}
.tmeta{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;align-items:center}
.badge{font-size:11px;padding:2px 8px;border-radius:100px;font-weight:500;white-space:nowrap}
.tacts{display:flex;gap:5px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;align-items:flex-start}
.tacts select,.tacts input[type=date]{font-size:12px;padding:2px 6px;height:28px;border:1px solid rgba(0,0,0,.1);border-radius:8px;background:#fff;color:#1a1a18;font-family:inherit;cursor:pointer}
.owed-card{background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:14px 16px;margin-bottom:8px}
.owed-hdr{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.av{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0}
.oi{font-size:13px;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.08);display:flex;justify-content:space-between;align-items:center;gap:8px}
.oi:last-child{border-bottom:none}
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:200}
.modal{background:#fff;border-radius:12px;padding:1.5rem;width:460px;max-width:95vw;border:1px solid rgba(0,0,0,.18);max-height:90vh;overflow-y:auto}
.modal h2{font-size:16px;font-weight:600;margin-bottom:1rem}
.frow{margin-bottom:12px}
.frow label{font-size:12px;color:#6b6b67;display:block;margin-bottom:4px}
.frow input,.frow select{width:100%;padding:8px 10px;border:1px solid rgba(0,0,0,.18);border-radius:8px;background:#fff;color:#1a1a18;font-family:inherit;font-size:13px}
.sc{background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:16px;margin-bottom:1rem}
.sc h3{font-size:14px;font-weight:600;margin-bottom:6px}
.lt{width:100%;border-collapse:collapse;font-size:12px}
.lt th{text-align:left;padding:6px 8px;border-bottom:1px solid rgba(0,0,0,.1);color:#6b6b67;font-weight:500}
.lt td{padding:6px 8px;border-bottom:1px solid rgba(0,0,0,.08);color:#6b6b67}
.empty{text-align:center;padding:3rem 1rem;color:#6b6b67}
.notif{position:fixed;bottom:1.5rem;right:1.5rem;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:500;z-index:999;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:su .2s ease}
@keyframes su{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
.notif.success{background:#eaf3de;color:#3b6d11;border:1px solid #97c459}
.notif.error{background:#fcebeb;color:#a32d2d;border:1px solid #f09595}
.notif.info{background:#e6f1fb;color:#185fa5;border:1px solid #85b7eb}
.spin{display:inline-block;width:13px;height:13px;border:2px solid rgba(0,0,0,.1);border-top-color:#6b6b67;border-radius:50%;animation:sp .6s linear infinite;vertical-align:middle;margin-right:5px}
@keyframes sp{to{transform:rotate(360deg)}}
@media(max-width:620px){.metrics{grid-template-columns:repeat(3,1fr)}.tc{grid-template-columns:20px 1fr}.tacts{grid-column:1/-1;margin-left:28px}}
`;

export default function Home() {
  const [tasks,  setTasks]  = useState([]);
  const [owed,   setOwed]   = useState([]);
  const [auth,   setAuth]   = useState({loading:true, authenticated:false, user:null});
  const [tab,    setTab]    = useState('tasks');
  const [search, setSearch] = useState('');
  const [fStat,  setFStat]  = useState('');
  const [fSrc,   setFSrc]   = useState('');
  const [syncing,setSyncing]= useState(false);
  const [logs,   setLogs]   = useState([]);
  const [notif,  setNotif]  = useState(null);
  const [modal,  setModal]  = useState(null);

  useEffect(() => {
    setTasks(ls(TASKS_KEY,[]));
    setOwed(ls(OWED_KEY,[]));
    checkAuth();
    const p = new URLSearchParams(window.location.search);
    if (p.get('auth')==='success'){ notify('Microsoft 365 connected! Starting first sync…','success'); history.replaceState({},'','/'); doSync(true); }
    if (p.get('auth')==='error')  { notify('Auth error: '+(p.get('msg')||'unknown'),'error');           history.replaceState({},'','/'); }
    const id = setInterval(()=>doSync(true), 30*60*1000);
    return ()=>clearInterval(id);
  }, []);

  useEffect(()=>{ ss(TASKS_KEY,tasks); },[tasks]);
  useEffect(()=>{ ss(OWED_KEY,owed);   },[owed]);

  function notify(msg,type='info'){ setNotif({msg,type}); setTimeout(()=>setNotif(null),5000); }

  async function checkAuth(){
    try{
      const r = await fetch('/api/auth/me').then(x=>x.json());
      setAuth({loading:false, authenticated:r.authenticated, user:r.user||null});
    }catch{ setAuth({loading:false,authenticated:false,user:null}); }
  }

  async function doSync(silent=false){
    if(!auth.authenticated){ if(!silent) notify('Connect Microsoft 365 first.','error'); return; }
    setSyncing(true);
    try{
      const r = await fetch('/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({existingTitles:tasks.map(t=>t.title)})}).then(x=>x.json());
      if(r.error) throw new Error(r.error);
      let added=0;
      const nt=[...tasks], no=[...owed];
      for(const t of (r.tasks||[])){
        if(!nt.some(x=>x.title.toLowerCase()===t.title.toLowerCase())){
          nt.unshift({id:uid(),title:t.title,status:'new',source:t.source||'outlook',due_date:t.dueDate||'',ref:t.ref||'',createdAt:TODAY()});
          added++;
        }
      }
      for(const o of (r.owedItems||[])){
        const ex=no.find(x=>x.person.toLowerCase()===o.person.toLowerCase());
        if(ex) ex.items.push({id:uid(),desc:o.description,due:o.dueDate||''});
        else   no.push({id:uid(),person:o.person,email:o.email||'',items:[{id:uid(),desc:o.description,due:o.dueDate||''}]});
      }
      setTasks(nt); setOwed(no);
      setLogs(prev=>[{time:new Date().toLocaleString(),msg:`${r.emailsScanned} emails scanned · +${added} tasks added`,ok:true},...prev.slice(0,19)]);
      if(!silent||added>0) notify('Sync complete — '+added+' new task'+(added!==1?'s':'')+' added','success');
    }catch(e){
      setLogs(prev=>[{time:new Date().toLocaleString(),msg:'Error: '+e.message,ok:false},...prev.slice(0,19)]);
      if(!silent) notify('Sync error: '+e.message,'error');
    }finally{ setSyncing(false); }
  }

  const updTask  = (id,f)  => setTasks(p=>p.map(t=>t.id===id?{...t,...f}:t));
  const delTask  = id      => setTasks(p=>p.filter(t=>t.id!==id));
  const addTask  = data    => setTasks(p=>[{id:uid(),createdAt:TODAY(),...data},...p]);
  const toggleDone = id    => { const t=tasks.find(x=>x.id===id); if(t) updTask(id,{status:t.status==='completed'?'inprogress':'completed'}); };

  const addOwedPerson = p  => setOwed(prev=>[...prev,{id:uid(),...p}]);
  const addOwedItem   = (pid,item) => setOwed(p=>p.map(o=>o.id===pid?{...o,items:[...o.items,{id:uid(),...item}]}:o));
  const resolveOwed   = (pid,iid) => setOwed(p=>p.map(o=>o.id===pid?{...o,items:o.items.filter(i=>i.id!==iid)}:o).filter(o=>o.items.length>0));

  async function sendRemind(email,task){
    if(!auth.authenticated){ notify('Connect Microsoft 365 first.','error'); return false; }
    try{
      const r=await fetch('/api/remind',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetEmail:email,task})}).then(x=>x.json());
      if(r.error) throw new Error(r.error);
      notify('Teams reminder sent to '+(r.userName||email)+' ✓','success');
      return true;
    }catch(e){ notify('Failed: '+e.message,'error'); return false; }
  }

  const filtered = tasks.filter(t=>{
    if(search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if(fStat && t.status!==fStat) return false;
    if(fSrc  && t.source!==fSrc)  return false;
    return true;
  }).sort((a,b)=>{
    if(isOv(a)!==isOv(b)) return isOv(a)?-1:1;
    if(isDT(a)!==isDT(b)) return isDT(a)?-1:1;
    return (a.due_date||'z')<(b.due_date||'z')?-1:1;
  });

  const M = {
    total:     tasks.filter(t=>!['completed','wontdo'].includes(t.status)).length,
    inprogress:tasks.filter(t=>t.status==='inprogress').length,
    completed: tasks.filter(t=>t.status==='completed').length,
    overdue:   tasks.filter(isOv).length,
    owed:      owed.reduce((s,o)=>s+o.items.length,0),
  };

  return (
    <>
      <Head><title>PM Task Tracker</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <style>{CSS}</style>
      <div className="app">

        {/* Top bar */}
        <div className="top-bar">
          <div>
            <h1>PM Task Tracker</h1>
            <div className="sub">
              {auth.loading ? 'Connecting…' : auth.authenticated
                ? `${auth.user?.displayName||auth.user?.mail} · Auto-sync every 30 min`
                : 'Not connected — click Connect to enable sync & notifications'}
            </div>
          </div>
          <div className="top-acts">
            {syncing && <span style={{fontSize:12,color:'#6b6b67'}}><span className="spin"/>Syncing…</span>}
            {auth.authenticated ? (
              <>
                <button className="btn blue"  onClick={()=>doSync(false)} disabled={syncing}>↻ Sync M365</button>
                <button className="btn amber" onClick={()=>setModal({type:'notifyDue'})}>🔔 Notify due</button>
                <button className="btn"       onClick={()=>setModal({type:'addTask'})}>+ Add task</button>
                <button className="btn sm"    onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});setAuth({loading:false,authenticated:false,user:null});}}>Sign out</button>
              </>
            ) : (
              <>
                <button className="btn blue" onClick={()=>window.location.href='/api/auth/login'}>Connect Microsoft 365</button>
                <button className="btn"      onClick={()=>setModal({type:'addTask'})}>+ Add task</button>
              </>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="metrics">
          {[['Active',M.total,false],['In progress',M.inprogress,false],['Completed',M.completed,false],['Overdue',M.overdue,true],['Owed to me',M.owed,false]].map(([l,v,red])=>(
            <div key={l} className="metric">
              <div className="ml">{l}</div>
              <div className="mv" style={red&&v>0?{color:'#e24b4a'}:{}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[['tasks','My tasks'],['owed','Owed to me'],['sync','Sync & logs']].map(([id,label])=>(
            <button key={id} className={'tab-btn'+(tab===id?' active':'')} onClick={()=>setTab(id)}>{label}</button>
          ))}
        </div>

        {/* ── MY TASKS ── */}
        {tab==='tasks' && (
          <>
            <div className="abar">
              <input type="text" placeholder="Search tasks…" value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,maxWidth:240}}/>
              <select value={fStat} onChange={e=>setFStat(e.target.value)}>
                <option value="">All statuses</option>
                {Object.entries(S_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
              <select value={fSrc} onChange={e=>setFSrc(e.target.value)}>
                <option value="">All sources</option>
                <option value="manual">Manual</option>
                <option value="outlook">Outlook</option>
                <option value="teams">Teams</option>
              </select>
            </div>
            <div className="task-list">
              {!filtered.length && <div className="empty">No tasks found</div>}
              {filtered.map(t=>(
                <div key={t.id} className="tc" style={{borderLeft:isOv(t)?'3px solid #e24b4a':isDT(t)?'3px solid #ef9f27':''}}>
                  <div className={'chk'+(t.status==='completed'?' done':'')} onClick={()=>toggleDone(t.id)}>{t.status==='completed'?'✓':''}</div>
                  <div>
                    <div style={{fontSize:14,lineHeight:1.4,wordBreak:'break-word',textDecoration:['completed','wontdo'].includes(t.status)?'line-through':'none',color:['completed','wontdo'].includes(t.status)?'#a0a09c':'inherit'}}>{t.title}</div>
                    <div className="tmeta">
                      <span className="badge" style={S_COLORS[t.status]}>{S_LABELS[t.status]}</span>
                      {t.source!=='manual' && <span className="badge" style={{background:'#f5f5f4',color:'#6b6b67'}}>{t.source==='outlook'?'Outlook':'Teams'}</span>}
                      {t.due_date && !['completed','wontdo'].includes(t.status) && (
                        <span className="badge" style={isOv(t)?{background:'#fcebeb',color:'#a32d2d'}:isDT(t)?{background:'#faeeda',color:'#854f0b'}:{background:'#f5f5f4',color:'#6b6b67'}}>
                          {isOv(t)?'Overdue: '+fmt(t.due_date):isDT(t)?'Due today':'Due '+fmt(t.due_date)}
                        </span>
                      )}
                      {t.ref && <span className="badge" style={{background:'#f5f5f4',color:'#6b6b67',fontStyle:'italic',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={t.ref}>{t.ref}</span>}
                    </div>
                  </div>
                  <div className="tacts">
                    <select value={t.status} onChange={e=>updTask(t.id,{status:e.target.value})}>
                      {Object.entries(S_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                    </select>
                    <input type="date" value={t.due_date||''} onChange={e=>updTask(t.id,{due_date:e.target.value})}/>
                    <button className="btn sm amber icon" title="Send Teams reminder" onClick={()=>setModal({type:'remind',task:t})}>🔔</button>
                    <button className="btn sm red icon" title="Delete" onClick={()=>delTask(t.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── OWED TO ME ── */}
        {tab==='owed' && (
          <>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}>
              <button className="btn" onClick={()=>setModal({type:'addOwed'})}>+ Add person</button>
            </div>
            {!owed.length && <div className="empty">No items tracked — add people whose deliverables you are waiting on</div>}
            {owed.map((o,oi)=>{
              const [bg,fg]=AV_COLORS[oi%AV_COLORS.length];
              return (
                <div key={o.id} className="owed-card">
                  <div className="owed-hdr">
                    <div className="av" style={{background:bg,color:fg}}>{ini(o.person)}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600}}>{o.person}</div>
                      <div style={{fontSize:12,color:'#6b6b67'}}>{o.items.length} pending{o.email?' · '+o.email:''}</div>
                    </div>
                    {o.email && <button className="btn sm blue" onClick={()=>setModal({type:'remindOwed',person:o})}>🔔 Remind</button>}
                    <button className="btn sm" style={{marginLeft:6}} onClick={()=>setModal({type:'addOwedItem',personId:o.id,personName:o.person})}>+ Item</button>
                  </div>
                  <div>
                    {o.items.map(item=>(
                      <div key={item.id} className="oi">
                        <span>{item.desc}</span>
                        <div style={{display:'flex',gap:5,alignItems:'center',flexShrink:0}}>
                          {item.due && <span className="badge" style={item.due<TODAY()?{background:'#fcebeb',color:'#a32d2d'}:item.due===TODAY()?{background:'#faeeda',color:'#854f0b'}:{background:'#f5f5f4',color:'#6b6b67'}}>{fmt(item.due)}</span>}
                          <button className="btn sm green icon" title="Mark received" onClick={()=>resolveOwed(o.id,item.id)}>✓</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── SYNC & LOGS ── */}
        {tab==='sync' && (
          <>
            <div className="sc">
              <h3>Auto-sync</h3>
              <p style={{fontSize:13,color:'#6b6b67',lineHeight:1.6,marginBottom:12}}>
                Scans your Outlook emails and Teams messages every 30 minutes while this page is open. Uses pattern matching to extract action items. Teams reminders fire at 9am daily for overdue tasks.
              </p>
              <button className="btn blue" onClick={()=>doSync(false)} disabled={syncing}>↻ Sync now</button>
            </div>
            <div className="sc">
              <h3>Sync history</h3>
              {!logs.length
                ? <div className="empty" style={{padding:'1rem'}}>No syncs yet</div>
                : <table className="lt">
                    <thead><tr><th>Time</th><th>Result</th></tr></thead>
                    <tbody>{logs.map((l,i)=>(
                      <tr key={i}>
                        <td style={{whiteSpace:'nowrap'}}>{l.time}</td>
                        <td style={{color:l.ok?'#3b6d11':'#a32d2d'}}>{l.msg}</td>
                      </tr>
                    ))}</tbody>
                  </table>
              }
            </div>
          </>
        )}
      </div>

      {/* ── MODALS ── */}
      {modal && <ModalHost modal={modal} close={()=>setModal(null)} onAddTask={addTask} onAddOwed={addOwedPerson} onAddOwedItem={addOwedItem} onRemind={sendRemind}/>}

      {/* ── TOAST ── */}
      {notif && <div className={'notif '+notif.type}>{notif.msg}</div>}
    </>
  );
}

function ModalHost({modal,close,onAddTask,onAddOwed,onAddOwedItem,onRemind}){
  const [f,setF]       = useState({});
  const [busy,setBusy] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const backdrop = e => { if(e.target===e.currentTarget) close(); };

  if(modal.type==='addTask') return (
    <div className="mbg" onClick={backdrop}>
      <div className="modal">
        <h2>Add task</h2>
        <div className="frow"><label>Title *</label><input autoFocus value={f.title||''} onChange={e=>set('title',e.target.value)} placeholder="What needs to be done?"/></div>
        <div className="frow"><label>Status</label><select value={f.status||'new'} onChange={e=>set('status',e.target.value)}>{Object.entries(S_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
        <div className="frow"><label>Due date</label><input type="date" value={f.due_date||''} onChange={e=>set('due_date',e.target.value)}/></div>
        <div className="frow"><label>Source</label><select value={f.source||'manual'} onChange={e=>set('source',e.target.value)}><option value="manual">Manual</option><option value="outlook">Outlook</option><option value="teams">Teams</option></select></div>
        <div className="frow"><label>Reference (optional)</label><input value={f.ref||''} onChange={e=>set('ref',e.target.value)} placeholder="Email subject / Teams thread"/></div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn primary" onClick={()=>{if(!f.title)return;onAddTask({title:f.title,status:f.status||'new',source:f.source||'manual',due_date:f.due_date||'',ref:f.ref||''});close();}}>Save task</button>
        </div>
      </div>
    </div>
  );

  if(modal.type==='addOwed') return (
    <div className="mbg" onClick={backdrop}>
      <div className="modal">
        <h2>Add person</h2>
        <div className="frow"><label>Name *</label><input autoFocus value={f.person||''} onChange={e=>set('person',e.target.value)} placeholder="Full name"/></div>
        <div className="frow"><label>Email (for Teams notifications)</label><input value={f.email||''} onChange={e=>set('email',e.target.value)} placeholder="name@thomsonreuters.com"/></div>
        <div className="frow"><label>What do they owe you? *</label><input value={f.desc||''} onChange={e=>set('desc',e.target.value)} placeholder="e.g. API spec document"/></div>
        <div className="frow"><label>Due date</label><input type="date" value={f.due||''} onChange={e=>set('due',e.target.value)}/></div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn primary" onClick={()=>{if(!f.person||!f.desc)return;onAddOwed({person:f.person,email:f.email||'',items:[{id:Math.random().toString(36).slice(2),desc:f.desc,due:f.due||''}]});close();}}>Save</button>
        </div>
      </div>
    </div>
  );

  if(modal.type==='addOwedItem') return (
    <div className="mbg" onClick={backdrop}>
      <div className="modal">
        <h2>Add item for {modal.personName}</h2>
        <div className="frow"><label>Description *</label><input autoFocus value={f.desc||''} onChange={e=>set('desc',e.target.value)} placeholder="What do they owe you?"/></div>
        <div className="frow"><label>Due date</label><input type="date" value={f.due||''} onChange={e=>set('due',e.target.value)}/></div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn primary" onClick={()=>{if(!f.desc)return;onAddOwedItem(modal.personId,{desc:f.desc,due:f.due||''});close();}}>Save</button>
        </div>
      </div>
    </div>
  );

  if(modal.type==='remind') return (
    <div className="mbg" onClick={backdrop}>
      <div className="modal">
        <h2>Send Teams reminder</h2>
        <div style={{background:'#f5f5f4',borderRadius:8,padding:'10px 12px',marginBottom:12,fontSize:13,color:'#6b6b67'}}>
          <strong style={{color:'#1a1a18'}}>{modal.task.title}</strong>
          {modal.task.due_date && <><br/>Due: {modal.task.due_date}</>}
        </div>
        <div className="frow"><label>Recipient email *</label><input autoFocus value={f.email||''} onChange={e=>set('email',e.target.value)} placeholder="colleague@thomsonreuters.com"/></div>
        <p style={{fontSize:12,color:'#6b6b67',marginTop:4}}>A 1-on-1 Teams message will be sent with the task details and due date.</p>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn primary" disabled={busy} onClick={async()=>{if(!f.email)return;setBusy(true);const ok=await onRemind(f.email,modal.task);setBusy(false);if(ok)close();}}>
            {busy?'Sending…':'Send via Teams'}
          </button>
        </div>
      </div>
    </div>
  );

  if(modal.type==='remindOwed') return (
    <div className="mbg" onClick={backdrop}>
      <div className="modal">
        <h2>Remind {modal.person.person}</h2>
        <p style={{fontSize:13,color:'#6b6b67',marginBottom:12}}>
          Send a Teams message to <strong>{modal.person.email}</strong> about their {modal.person.items.length} pending item{modal.person.items.length!==1?'s':''}.
        </p>
        <div style={{background:'#f5f5f4',borderRadius:8,padding:'10px 12px',marginBottom:12,fontSize:13}}>
          {modal.person.items.map((i,idx)=><div key={idx} style={{padding:'2px 0',color:'#6b6b67'}}>• {i.desc}{i.due?' (due '+i.due+')':''}</div>)}
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn primary" disabled={busy} onClick={async()=>{
            setBusy(true);
            const lines = modal.person.items.map(i=>'• '+i.desc+(i.due?' (due '+i.due+')':'')).join('<br/>');
            const task = { title:'Pending deliverables reminder', due_date:null, _body:`<p>Hi ${modal.person.person},</p><p>Following up on pending items:</p><blockquote>${lines}</blockquote><p><i>Sent via PM Task Tracker</i></p>` };
            const ok = await onRemind(modal.person.email, task);
            setBusy(false); if(ok) close();
          }}>{busy?'Sending…':'Send reminder'}</button>
        </div>
      </div>
    </div>
  );

  return null;
}
