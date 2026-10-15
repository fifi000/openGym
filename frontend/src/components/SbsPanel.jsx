import { useState,useEffect } from 'react'
import { useStore } from '../store/useStore.js'
import { api } from '../lib/api.js'
export default function SbsPanel() {
  const {S,update}=useStore()
  const [status,setStatus]=useState(null)
  const [usage,setUsage]=useState(null)
  const [usageBusy,setUsageBusy]=useState(false)
  const refreshUsage=async()=>{setUsageBusy(true);try{setUsage(await api('/api/sbs/usage'))}catch(e){setUsage({error:e.message})}finally{setUsageBusy(false)}}
  const [message,setMessage]=useState('')
  const [answer,setAnswer]=useState(null)
  const [busy,setBusy]=useState(false)
  useEffect(()=>{if(S.sbs?.enabled){api('/api/sbs/status').then(setStatus).catch(()=>setStatus({connected:false}));refreshUsage()}},[S.sbs?.enabled])
  if(!S.sbs?.enabled)return null
  const change=(key,value)=>update(s=>{s.sbs[key]=value;s.routines.forEach(r=>delete r.sbsPrepared)})
  const ask=async()=>{
    if(!message.trim()||busy)return
    setBusy(true)
    try{const a=await api('/api/sbs/chat',{method:'POST',body:JSON.stringify({message,state:{sbs:S.sbs,routines:S.routines,workouts:S.workouts.slice(-60),customEx:S.customEx}}),timeout:180000});setAnswer(a);update(s=>{s.sbs.memory=[...(s.sbs.memory||[]),...(a.memory||[])].slice(-60)})}catch(e){setAnswer({reason:e.message})}finally{setBusy(false)}
  }
  return <section className="sbs-panel"><h3>SBS Coach · Week {S.sbs.week} / 4</h3>
    <p className="small dim">Cycle {S.sbs.cycle}. The week advances after all three routines are completed. {status?.connected?'Codex connected.':'Codex sign-in required. Workbook baseline remains available.'}</p>
    <div className="sbs-usage"><b>Codex subscription usage</b>{usage?.primary||usage?.secondary?<div>{[['Five-hour window',usage.primary],['Weekly window',usage.secondary]].map(([label,w])=>w&&<div key={label}><span>{label}: {Math.round(100-w.usedPercent)}% remaining</span><progress max="100" value={w.usedPercent} />{w.resetsAt&&<small>Resets {new Date(w.resetsAt*1000).toLocaleString()}</small>}</div>)}<small>Limits read at {new Date(usage.readAt).toLocaleTimeString()}.</small></div>:<small>{usage?.error||'Usage not loaded.'}</small>}<button className="record-link" disabled={usageBusy} onClick={refreshUsage}>{usageBusy?'Reading…':'Refresh usage'}</button></div>
    <details><summary>Training maxes & preferences</summary>
      {Object.entries(S.sbs.maxes).map(([k,v])=><label key={k}>{k === 'accessory'?'Flintstone Press':k} ({S.unit})<input type="number" step="0.5" min="1" max="600" value={v} onChange={e=>{const n=Number(e.target.value);if(n>0&&n<=600)update(s=>{s.sbs.maxes[k]=n;s.routines.forEach(r=>delete r.sbsPrepared)})}} /></label>)}
      <label>Codex model<select aria-label="Codex model" value={S.sbs.model||'gpt-6.1-sol'} onChange={e=>change('model',e.target.value)}><option value="gpt-6.1-sol">GPT-6.1 Sol (recommended)</option><option value="gpt-6-luna">GPT-6 Luna</option><option value="gpt-6-astra">GPT-6 Astra</option><option value="gpt-6-sol">GPT-6 Sol</option></select></label>
      <label>Rounding ({S.unit})<input type="number" min="0.25" step="0.25" value={S.sbs.rounding} onChange={e=>{const n=Number(e.target.value);if(n>=.25)change('rounding',n)}} /></label>
      <label>Week<input type="number" min="1" max="4" value={S.sbs.week} onChange={e=>{const n=Number(e.target.value);if(n>=1&&n<=4){change('week',n);change('completed',[])}}} /></label>
      <label><input type="checkbox" checked={S.sbs.autoCoach!==false} onChange={e=>change('autoCoach',e.target.checked)} /> Coach applies next-session decisions automatically</label>
      <label>Goal inferred from training<textarea value={S.sbs.goal||''} onChange={e=>change('goal',e.target.value)} /></label>
    </details>
    <details><summary>Talk to your coach</summary><textarea aria-label="Message to coach" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Feedback, recovery, changes, questions…" maxLength={4000} /><button className="btn" disabled={busy} onClick={ask}>{busy?'Coach is thinking…':'Ask Coach'}</button>{answer&&<><p>{answer.reason}</p>{answer.sources?.map(s=><p className="small dim" key={s.id}>{s.title}{s.page?' · p. '+s.page:''}{s.url&&<> · <a href={s.url} target="_blank" rel="noreferrer">Source</a></>}</p>)}</>}</details>
    <details><summary>Decision history & undo</summary>{(S.sbs.audit||[]).map((a,i)=><div className="audit" key={a.id}><b>{new Date(a.date).toLocaleString()} · Week {a.week} · {a.mode}</b><p>{a.reason}</p>{a.sources?.map(src=><p className="small dim" key={src.id}>{src.title}{src.page?' · p. '+src.page:''}</p>)}{i===0&&!S.active&&a.week===S.sbs.week&&a.cycle===S.sbs.cycle&&<button className="btn" onClick={()=>update(s=>{const at=s.routines.findIndex(r=>r.id===a.routineId);if(at>=0)s.routines[at]=a.before;s.sbs.maxes=a.beforeMaxes;s.sbs.audit=s.sbs.audit.slice(1)})}>Undo decision</button>}</div>)}</details>
    <details><summary>Coach memory</summary>{(S.sbs.memory||[]).map((m,i)=><p key={i}>{typeof m==='string'?m.text||m:m.text} {m.status&&<small>({m.status})</small>} <button className="record-link" onClick={()=>update(s=>{s.sbs.memory=s.sbs.memory.filter((_,at)=>at!==i)})}>Remove</button></p>)}</details>
  </section>
}
