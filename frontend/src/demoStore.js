const KEY = 'cyberguard_demo_records_v1';
const seed = {
  assets: [
    { id:'a1', name:'Customer Portal', category:'Web Application', owner:'IT Operations', criticality:'Critical', status:'Protected', description:'Public-facing customer portal' },
    { id:'a2', name:'Finance Database', category:'Database', owner:'Finance IT', criticality:'High', status:'Under Review', description:'Stores billing and transaction records' },
    { id:'a3', name:'Employee Laptops', category:'Endpoint', owner:'Workplace IT', criticality:'Medium', status:'Protected', description:'Managed staff devices' }
  ],
  threats: [
    { id:'t1', title:'Phishing campaign', kind:'Threat', severity:'High', asset:'Employee Laptops', status:'In Progress', description:'Credential theft via deceptive email' },
    { id:'t2', title:'Outdated web framework', kind:'Vulnerability', severity:'Critical', asset:'Customer Portal', status:'Open', description:'Dependency requires security patch' },
    { id:'t3', title:'Weak database access policy', kind:'Vulnerability', severity:'Medium', asset:'Finance Database', status:'Open', description:'Review role permissions and credentials' }
  ],
  risks: [
    { id:'r1', title:'Customer data exposure', asset:'Customer Portal', likelihood:4, impact:5, score:20, severity:'Critical', treatment:'Apply patches and review access controls', status:'Mitigating' },
    { id:'r2', title:'Phishing credential compromise', asset:'Employee Laptops', likelihood:3, impact:4, score:12, severity:'High', treatment:'Security awareness and MFA', status:'In Progress' },
    { id:'r3', title:'Unauthorized finance data access', asset:'Finance Database', likelihood:2, impact:4, score:8, severity:'Medium', treatment:'Review least-privilege access', status:'Open' }
  ]
};
export function getDemo() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    if (value && value.assets && value.threats && value.risks) return value;
  } catch {}
  localStorage.setItem(KEY, JSON.stringify(seed));
  return structuredClone(seed);
}
export function saveDemo(data) { localStorage.setItem(KEY, JSON.stringify(data)); }
export function resetDemo() { localStorage.removeItem(KEY); return getDemo(); }
export function scoreRisk(likelihood, impact) {
  const score = Number(likelihood) * Number(impact);
  const severity = score >= 16 ? 'Critical' : score >= 10 ? 'High' : score >= 5 ? 'Medium' : 'Low';
  return { score, severity };
}
