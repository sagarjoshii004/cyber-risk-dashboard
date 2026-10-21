import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, LayoutDashboard, Boxes, Bug, Gauge, FileBarChart2, LogOut, Plus,
  Search, Download, Trash2, Pencil, X, Menu, LockKeyhole, Mail, UserRound,
  ChevronRight, Activity, AlertTriangle, CheckCircle2, Server, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiRequest, signIn, signUp, clearSession } from './api';
import { getDemo, saveDemo, resetDemo, scoreRisk } from './demoStore';

const modules = {
  assets: { label:'Asset Management', singular:'Asset', icon:Boxes, fields:[
    ['name','Asset name','text'], ['category','Category','select','Web Application|Database|Server|Endpoint|Cloud Service|Network Device|Other'],
    ['owner','Owner / team','text'], ['criticality','Criticality','select','Low|Medium|High|Critical'],
    ['status','Status','select','Protected|Under Review|At Risk|Retired'], ['description','Description','textarea']
  ]},
  threats: { label:'Threats & Vulnerabilities', singular:'Threat / vulnerability', icon:Bug, fields:[
    ['title','Title','text'], ['kind','Record type','select','Threat|Vulnerability'],
    ['severity','Severity','select','Low|Medium|High|Critical'], ['asset','Affected asset','text'],
    ['status','Status','select','Open|In Progress|Resolved|Accepted'], ['description','Description','textarea']
  ]},
  risks: { label:'Risk Assessment', singular:'Risk', icon:Gauge, fields:[
    ['title','Risk title','text'], ['asset','Related asset','text'], ['likelihood','Likelihood (1–5)','number'],
    ['impact','Impact (1–5)','number'], ['treatment','Mitigation / treatment','textarea'],
    ['status','Status','select','Open|Mitigating|In Progress|Resolved|Accepted']
  ]}
};

const id = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
const currentUser = () => { try { return JSON.parse(localStorage.getItem('crd_user') || 'null'); } catch { return null; } };
const severityOf = (row) => row.severity || scoreRisk(row.likelihood || 1, row.impact || 1).severity;
const initialMode = import.meta.env.VITE_DEFAULT_MODE === 'fullstack' ? 'fullstack' : 'demo';

function App() {
  const [mode, setMode] = useState(initialMode);
  const [user, setUser] = useState(currentUser());
  const [authView, setAuthView] = useState('login');
  const [page, setPage] = useState('overview');
  const [data, setData] = useState(() => getDemo());
  const [remote, setRemote] = useState({ assets:[], threats:[], risks:[] });
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [authForm, setAuthForm] = useState({ name:'', email:'', password:'' });

  const records = mode === 'demo' ? data : remote;
  const isLoggedIn = mode === 'demo' ? Boolean(user?.demo) : Boolean(localStorage.getItem('crd_token'));
  const notify = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 3200); };

  useEffect(() => {
    if (mode !== 'fullstack' || !localStorage.getItem('crd_token')) return;
    refreshRemote().catch(e => notify(e.message));
  }, [mode, user]);

  async function refreshRemote() {
    const [assets, threats, risks] = await Promise.all([
      apiRequest('/assets'), apiRequest('/threats'), apiRequest('/risks')
    ]);
    setRemote({ assets, threats, risks });
  }

  async function changeMode(next) {
    setMode(next);
    setPage('overview');
    setSearch('');
    if (next === 'demo') {
      setUser(currentUser());
      setData(getDemo());
    } else {
      setUser(currentUser());
      if (localStorage.getItem('crd_token')) {
        try { await refreshRemote(); } catch (e) { notify(`API connection: ${e.message}`); }
      }
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'demo') {
        if (!authForm.email.includes('@') || authForm.password.length < 4) throw new Error('Enter a valid email and a password of at least 4 characters.');
        const demoUser = { name: authForm.name || authForm.email.split('@')[0], email:authForm.email, demo:true };
        localStorage.setItem('crd_user', JSON.stringify(demoUser));
        setUser(demoUser);
        notify(authView === 'login' ? 'Demo sign-in successful.' : 'Demo account created in this browser.');
      } else {
        const u = authView === 'login'
          ? await signIn(authForm.email, authForm.password)
          : await signUp(authForm.name, authForm.email, authForm.password);
        setUser(u);
        await refreshRemote();
        notify('Signed in successfully.');
      }
      setPage('overview');
    } catch (e) { notify(e.message || 'Could not authenticate. Check your API settings.'); }
    finally { setBusy(false); }
  }

  function logout() {
    clearSession();
    localStorage.removeItem('crd_user');
    setUser(null);
    setAuthForm({ name:'', email:'', password:'' });
    setAuthView('login');
    notify('You have signed out.');
  }

  async function mutate(collection, action, record) {
    try {
      if (mode === 'demo') {
        const next = structuredClone(data);
        const rows = next[collection];
        if (action === 'delete') next[collection] = rows.filter(r => r.id !== record.id);
        else if (action === 'update') next[collection] = rows.map(r => r.id === record.id ? { ...record } : r);
        else next[collection] = [{ ...record, id:id() }, ...rows];
        if (collection === 'risks') next.risks = next.risks.map(r => ({ ...r, ...scoreRisk(r.likelihood || 1, r.impact || 1) }));
        setData(next); saveDemo(next);
      } else {
        const endpoint = `/${collection}`;
        if (action === 'delete') await apiRequest(`${endpoint}/${record.id}`, { method:'DELETE' });
        else if (action === 'update') await apiRequest(`${endpoint}/${record.id}`, { method:'PUT', body:JSON.stringify(record) });
        else await apiRequest(endpoint, { method:'POST', body:JSON.stringify(record) });
        await refreshRemote();
      }
      setModal(null);
      notify(action === 'delete' ? 'Record deleted.' : action === 'update' ? 'Record updated.' : 'Record added.');
    } catch (e) { notify(e.message || 'Could not save the record.'); }
  }

  const all = [...records.assets, ...records.threats, ...records.risks];
  const metrics = useMemo(() => ({
    assets: records.assets.length,
    threats: records.threats.filter(t => t.kind !== 'Vulnerability').length,
    vulnerabilities: records.threats.filter(t => t.kind === 'Vulnerability').length,
    risks: records.risks.length,
    critical: records.risks.filter(r => severityOf(r) === 'Critical').length,
    high: records.risks.filter(r => severityOf(r) === 'High').length,
  }), [records]);
  const riskChart = ['Critical','High','Medium','Low'].map(name => ({ name, value: records.risks.filter(r => severityOf(r) === name).length }));
  const pieColors = ['#fb7185','#fbbf24','#60a5fa','#34d399'];
  const pageConfig = modules[page];
  const tableRows = pageConfig ? records[page].filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) : [];

  function exportCsv() {
    const rows = pageConfig ? records[page] : all;
    if (!rows.length) return notify('There are no records to export.');
    const headers = [...new Set(rows.flatMap(Object.keys))];
    const csv = [headers.join(','), ...rows.map(row => headers.map(k => `"${String(row[k] ?? '').replaceAll('"','""')}"`).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `${page === 'overview' ? 'cyber-risk-report' : page}-report.csv`; a.click(); URL.revokeObjectURL(url);
    notify('CSV report exported.');
  }

  if (!isLoggedIn) return <AuthScreen mode={mode} changeMode={changeMode} authView={authView} setAuthView={setAuthView} form={authForm} setForm={setAuthForm} onSubmit={handleAuth} busy={busy} notice={notice} />;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><ShieldCheck size={23}/></div><div><strong>CyberGuard</strong><small>RISK INTELLIGENCE</small></div><button className="icon-btn nav-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>
        <NavButton active={page==='overview'} icon={LayoutDashboard} label="Overview" onClick={() => {setPage('overview');setMobileNav(false)}}/>
        {Object.entries(modules).map(([key, mod]) => <NavButton key={key} active={page===key} icon={mod.icon} label={mod.label} onClick={() => {setPage(key);setSearch('');setMobileNav(false)}}/>)}
        <NavButton active={page==='reports'} icon={FileBarChart2} label="Reports & Export" onClick={() => {setPage('reports');setMobileNav(false)}}/>
      </nav>
      <div className="sidebar-bottom"><div className="secure-note"><LockKeyhole size={16}/><div><b>Workspace protected</b><span>{mode==='demo'?'Browser demo storage':'Authenticated API'}</span></div></div><button className="nav-item" onClick={logout}><LogOut size={17}/> Sign out</button></div>
    </aside>
    {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <main className="main-area">
      <header className="topbar"><div className="top-left"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="crumb">Workspace <ChevronRight size={14}/> <span>{pageConfig?.label || (page==='overview'?'Overview':'Reports & Export')}</span></div></div><div className="top-actions"><div className={`mode-pill ${mode}`}><span/>{mode==='demo'?'DEMO MODE':'FULL-STACK'}</div><select aria-label="Application mode" className="mode-select" value={mode} onChange={e=>changeMode(e.target.value)}><option value="demo">Demo Mode</option><option value="fullstack">Full-Stack Mode</option></select><div className="avatar">{(user?.name || user?.email || 'U').slice(0,1).toUpperCase()}</div><div className="user-meta"><b>{user?.name || 'Security Analyst'}</b><span>{user?.email || 'demo@cyberguard.local'}</span></div></div></header>
      <div className="content">
        {page==='overview' && <Overview metrics={metrics} records={records} riskChart={riskChart} pieColors={pieColors} onNavigate={setPage} />}
        {pageConfig && <section>
          <div className="page-heading"><div><div className="eyebrow">SECURITY OPERATIONS</div><h1>{pageConfig.label}</h1><p>Manage, review and maintain your {pageConfig.label.toLowerCase()} records.</p></div><button className="primary-btn" onClick={() => setModal({ collection:page, action:'create', record:{} })}><Plus size={17}/> Add {pageConfig.singular}</button></div>
          <div className="table-toolbar"><div className="searchbox"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${pageConfig.label.toLowerCase()}...`}/></div><div className="toolbar-right"><span>{tableRows.length} records</span><button className="secondary-btn" onClick={exportCsv}><Download size={16}/> Export CSV</button></div></div>
          <DataTable rows={tableRows} collection={page} onEdit={record=>setModal({collection:page,action:'update',record})} onDelete={record=>setModal({collection:page,action:'delete',record})}/>
        </section>}
        {page==='reports' && <Reports metrics={metrics} records={records} exportCsv={exportCsv} onNavigate={setPage}/>}
      </div>
      <footer className="footer"><span>© 2026 CyberGuard Risk Intelligence</span><span><span className="status-dot"/> All systems operational · {mode==='demo'?'Demo data stored locally':'Connected mode'}</span></footer>
    </main>
    {modal && <RecordModal modal={modal} onClose={()=>setModal(null)} onSave={mutate} />}
    {notice && <div className="toast"><CheckCircle2 size={18}/>{notice}</div>}
  </div>;
}

function AuthScreen({ mode, changeMode, authView, setAuthView, form, setForm, onSubmit, busy, notice }) {
  return <div className="auth-shell"><div className="auth-decoration"><div className="auth-orb orb-one"/><div className="auth-orb orb-two"/><div className="auth-content"><div className="brand auth-brand"><div className="brand-mark"><ShieldCheck size={25}/></div><div><strong>CyberGuard</strong><small>RISK INTELLIGENCE</small></div></div><div className="auth-headline"><div className="eyebrow">CYBER RISK ASSESSMENT PLATFORM</div><h1>See risk clearly.<br/><span>Act with confidence.</span></h1><p>One workspace to manage your assets, identify vulnerabilities, assess risk and strengthen your security posture.</p></div><div className="auth-points"><div><ShieldCheck/><span><b>Security-first workflow</b><small>Organize critical assets and risk controls</small></span></div><div><Activity/><span><b>Actionable risk insights</b><small>Prioritize what matters most</small></span></div><div><FileBarChart2/><span><b>Reports that tell the story</b><small>Track progress with clear metrics</small></span></div></div><div className="auth-footer-note">BUILT FOR SECURITY TEAMS · DESIGNED FOR CLARITY</div></div></div><div className="auth-panel"><div className="auth-panel-top"><span>Welcome to CyberGuard</span><select value={mode} onChange={e=>changeMode(e.target.value)} aria-label="Application mode"><option value="demo">Demo Mode</option><option value="fullstack">Full-Stack Mode</option></select></div><form className="auth-form" onSubmit={onSubmit}><div className="auth-icon"><ShieldCheck size={26}/></div><h2>{authView==='login'?'Sign in to your workspace':'Create your account'}</h2><p>{authView==='login'?'Enter your details to access your security dashboard.':'Set up an account to begin managing cyber risk.'}</p>{authView==='signup' && <label>Full name<div className="input-wrap"><UserRound size={17}/><input required minLength="2" placeholder="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div></label>}<label>Email address<div className="input-wrap"><Mail size={17}/><input type="email" required placeholder="you@company.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div></label><label>Password<div className="input-wrap"><LockKeyhole size={17}/><input type="password" required minLength={mode==='fullstack'?8:4} placeholder={mode==='fullstack'?'At least 8 characters':'At least 4 characters for demo'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div></label><button className="primary-btn auth-submit" disabled={busy}>{busy?'Please wait...':authView==='login'?'Sign in securely':'Create account'}<ChevronRight size={17}/></button><div className="auth-switch">{authView==='login'?"Don't have an account?":"Already have an account?"} <button type="button" onClick={()=>setAuthView(authView==='login'?'signup':'login')}>{authView==='login'?'Sign up':'Sign in'}</button></div><div className={`mode-explainer ${mode}`}><span className="mode-explainer-icon">{mode==='demo'?<Activity size={16}/>:<Server size={16}/>}</span><span><b>{mode==='demo'?'Demo mode enabled':'Full-stack authentication'}</b><small>{mode==='demo'?'Uses browser-local demo data. No backend required.':'Uses the configured API and MongoDB. Backend must be online.'}</small></span></div></form><div className="auth-bottom">Protected workspace · Cyber Risk Management</div></div>{notice && <div className="toast"><AlertTriangle size={18}/>{notice}</div>}</div>;
}

function NavButton({active,icon:Icon,label,onClick}) { return <button className={`nav-item ${active?'active':''}`} onClick={onClick}><Icon size={18}/><span>{label}</span>{active&&<span className="nav-active-mark"/>}</button>; }

function Overview({metrics,records,riskChart,pieColors,onNavigate}) {
  const latest = [...records.risks].slice(0,4);
  const cards = [
    {label:'Total assets',value:metrics.assets,sub:'Tracked in inventory',icon:Boxes,color:'blue',go:'assets'},
    {label:'Active threats',value:metrics.threats,sub:'Threat records',icon:Bug,color:'purple',go:'threats'},
    {label:'Vulnerabilities',value:metrics.vulnerabilities,sub:'Needs review or remediation',icon:AlertTriangle,color:'amber',go:'threats'},
    {label:'Assessed risks',value:metrics.risks,sub:`${metrics.critical} critical · ${metrics.high} high`,icon:Gauge,color:'rose',go:'risks'}
  ];
  return <><div className="welcome-row"><div><div className="eyebrow">SECURITY OVERVIEW</div><h1>Good to see you, Analyst <span className="wave">✦</span></h1><p>Here is your organization's cyber risk posture at a glance.</p></div><div className="date-chip"><Activity size={16}/> Live risk snapshot</div></div><div className="stat-grid">{cards.map(c=><button key={c.label} className="stat-card" onClick={()=>onNavigate(c.go)}><div className={`stat-icon ${c.color}`}><c.icon size={20}/></div><div className="stat-label">{c.label}</div><div className="stat-value">{c.value}</div><div className="stat-sub">{c.sub}<ChevronRight size={14}/></div></button>)}</div><div className="overview-grid"><div className="panel risk-panel"><div className="panel-head"><div><h3>Risk severity distribution</h3><p>Current risks grouped by calculated severity</p></div><button className="text-btn" onClick={()=>onNavigate('risks')}>View risks <ChevronRight size={15}/></button></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={riskChart} margin={{top:8,right:10,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#223047" vertical={false}/><XAxis dataKey="name" tick={{fill:'#91a1b8',fontSize:12}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fill:'#91a1b8',fontSize:12}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#101c2d',border:'1px solid #293950',borderRadius:10,color:'#e6edf8'}}/><Bar dataKey="value" name="Risks" radius={[5,5,0,0]}>{riskChart.map((entry,i)=><Cell key={entry.name} fill={pieColors[i]}/>)}</Bar></BarChart></ResponsiveContainer></div><div className="severity-legend">{riskChart.map((r,i)=><span key={r.name}><i style={{background:pieColors[i]}}/>{r.name}<b>{r.value}</b></span>)}</div></div><div className="panel posture-panel"><div className="panel-head"><div><h3>Risk posture</h3><p>Assessment overview</p></div><div className="panel-symbol"><Gauge size={18}/></div></div><div className="donut-area"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={riskChart} dataKey="value" nameKey="name" innerRadius={62} outerRadius={82} paddingAngle={4} stroke="none">{riskChart.map((r,i)=><Cell key={r.name} fill={pieColors[i]}/>)}</Pie><Tooltip contentStyle={{background:'#101c2d',border:'1px solid #293950',borderRadius:10,color:'#e6edf8'}}/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{metrics.risks}</strong><span>Total risks</span></div></div><div className="posture-summary"><div><span className="status-dot danger"/><span>Critical risks</span><b>{metrics.critical}</b></div><div><span className="status-dot warning"/><span>High risks</span><b>{metrics.high}</b></div><div><span className="status-dot good"/><span>Other risks</span><b>{Math.max(0,metrics.risks-metrics.critical-metrics.high)}</b></div></div></div></div><div className="panel recent-panel"><div className="panel-head"><div><h3>Recent risk assessments</h3><p>Review the latest items that may need attention</p></div><button className="text-btn" onClick={()=>onNavigate('risks')}>Manage all <ChevronRight size={15}/></button></div><div className="recent-list">{latest.length?latest.map(r=><div className="recent-row" key={r.id}><div className="recent-icon"><ShieldCheck size={17}/></div><div className="recent-main"><b>{r.title}</b><span>{r.asset || 'Unassigned asset'}</span></div><span className={`severity-badge ${severityOf(r).toLowerCase()}`}>{severityOf(r)}</span><div className="risk-score"><b>{r.score || r.likelihood*r.impact}</b><small>Score</small></div></div>):<EmptyState text="No risk assessments yet."/>}</div></div></>;
}

function DataTable({rows,collection,onEdit,onDelete}) {
  if (!rows.length) return <EmptyState text="No matching records. Add a record to get started."/>;
  const cols = collection==='assets' ? [['name','Asset'],['category','Category'],['owner','Owner'],['criticality','Criticality'],['status','Status']]
    : collection==='threats' ? [['title','Title'],['kind','Type'],['asset','Affected asset'],['severity','Severity'],['status','Status']]
    : [['title','Risk'],['asset','Asset'],['score','Score'],['severity','Severity'],['status','Status']];
  return <div className="table-wrap"><table><thead><tr>{cols.map(([k,l])=><th key={k}>{l}</th>)}<th className="actions-col">Actions</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}>{cols.map(([k])=><td key={k}>{k==='severity'||k==='criticality'?<span className={`severity-badge ${severityOf(row).toLowerCase()}`}>{k==='criticality'?row[k]:severityOf(row)}</span>:k==='status'?<span className="status-label"><i/>{row[k]}</span>:k==='score'?<span className="score-cell">{row.score || row.likelihood*row.impact || '—'}</span>:<span className={k==='title'||k==='name'?'primary-cell':''}>{row[k] || '—'}</span>}</td>)}<td><div className="row-actions"><button title="Edit record" onClick={()=>onEdit(row)}><Pencil size={15}/></button><button title="Delete record" className="delete-action" onClick={()=>onDelete(row)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>;
}
function EmptyState({text}) { return <div className="empty-state"><div><Search size={23}/></div><b>Nothing to show</b><span>{text}</span></div>; }

function RecordModal({modal,onClose,onSave}) {
  const {collection,action}=modal;
  const config=modules[collection];
  const [form,setForm]=useState({...modal.record});
  const [error,setError]=useState('');
  const update=(key,value)=>setForm(old=>({...old,[key]:value}));
  function submit(e) {
    e.preventDefault();
    if(action==='delete') return onSave(collection,'delete',modal.record);
    const required = collection==='assets'?['name','category']:collection==='threats'?['title','kind','severity']:['title','asset','likelihood','impact'];
    if(required.some(k=>!String(form[k]??'').trim())) return setError('Please fill in all required fields.');
    let record={...form};
    if(collection==='risks') {
      record.likelihood=Math.min(5,Math.max(1,Number(record.likelihood)));
      record.impact=Math.min(5,Math.max(1,Number(record.impact)));
      record={...record,...scoreRisk(record.likelihood,record.impact)};
    }
    if(collection==='assets') { record.criticality=record.criticality||'Medium'; record.status=record.status||'Protected'; }
    if(collection==='threats') { record.severity=record.severity||'Medium'; record.status=record.status||'Open'; }
    if(collection==='risks') record.status=record.status||'Open';
    onSave(collection,action,record);
  }
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal"><div className="modal-head"><div><div className="eyebrow">{action==='create'?'NEW RECORD':action==='update'?'EDIT RECORD':'CONFIRM ACTION'}</div><h2>{action==='delete'?'Delete this record?':action==='create'?`Add ${config.singular}`:`Edit ${config.singular}`}</h2></div><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>{action==='delete'?<><p className="delete-confirm">This will permanently delete <b>{modal.record.title||modal.record.name}</b> from this {modeLabel(modal)} dataset. This action cannot be undone.</p><div className="modal-actions"><button className="secondary-btn" onClick={onClose}>Cancel</button><button className="danger-btn" onClick={()=>onSave(collection,'delete',modal.record)}><Trash2 size={16}/> Delete record</button></div></>:<form onSubmit={submit}><div className="form-grid">{config.fields.map(([key,label,type,options])=><label key={key} className={type==='textarea'?'full-field':''}>{label}{type==='select'?<select value={form[key]||''} onChange={e=>update(key,e.target.value)}><option value="">Select {label.toLowerCase()}</option>{options.split('|').map(o=><option key={o}>{o}</option>)}</select>:type==='textarea'?<textarea rows="3" value={form[key]||''} onChange={e=>update(key,e.target.value)} placeholder={`Enter ${label.toLowerCase()}`}/>:<input type={type} min={type==='number'?1:undefined} max={type==='number'?5:undefined} value={form[key]??''} onChange={e=>update(key,e.target.value)} placeholder={label} required={['name','title','asset','category','kind','likelihood','impact'].includes(key)}/>}</label>)}</div>{collection==='risks'&&form.likelihood&&form.impact&&<div className="score-preview"><Gauge size={17}/><span>Calculated risk score</span><b>{Number(form.likelihood)*Number(form.impact)} / 25</b><span className={`severity-badge ${scoreRisk(form.likelihood,form.impact).severity.toLowerCase()}`}>{scoreRisk(form.likelihood,form.impact).severity}</span></div>}{error&&<div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn"><CheckCircle2 size={16}/>{action==='create'?'Create record':'Save changes'}</button></div></form>}</div></div>;
}
function modeLabel(modal) { return modal.collection==='assets'?'asset inventory':modal.collection==='threats'?'threat list':'risk register'; }

function Reports({metrics,records,exportCsv,onNavigate}) {
  const totals=[['Assets',metrics.assets,Boxes,'assets'],['Threats',metrics.threats,Bug,'threats'],['Vulnerabilities',metrics.vulnerabilities,AlertTriangle,'threats'],['Risks',metrics.risks,Gauge,'risks']];
  return <section><div className="page-heading"><div><div className="eyebrow">INSIGHTS & COMPLIANCE</div><h1>Reports & Export</h1><p>Summarize the current security inventory and export records for review.</p></div><button className="primary-btn" onClick={exportCsv}><Download size={17}/> Export all records</button></div><div className="report-cards">{totals.map(([label,value,Icon,go])=><button className="report-card" key={label} onClick={()=>onNavigate(go)}><Icon size={20}/><span>{label}</span><b>{value}</b><small>View records <ChevronRight size={13}/></small></button>)}</div><div className="panel report-detail"><div className="panel-head"><div><h3>Risk register summary</h3><p>Severity is calculated from likelihood × impact.</p></div><button className="secondary-btn" onClick={exportCsv}><Download size={15}/> Export CSV</button></div><div className="report-summary-grid"><div><span>Critical</span><b>{records.risks.filter(r=>severityOf(r)==='Critical').length}</b></div><div><span>High</span><b>{records.risks.filter(r=>severityOf(r)==='High').length}</b></div><div><span>Medium</span><b>{records.risks.filter(r=>severityOf(r)==='Medium').length}</b></div><div><span>Low</span><b>{records.risks.filter(r=>severityOf(r)==='Low').length}</b></div></div><div className="report-note"><ShieldCheck size={18}/><span><b>Reporting note</b> Exported CSV files include the records currently stored in the selected mode. Demo Mode data stays in this browser; Full-Stack Mode data is retrieved from the authenticated API.</span></div></div></section>;
}
export default App;
