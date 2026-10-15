import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { repRecords } from '../lib/rep-records.js'
import { fmtNum, todayISO } from '../lib/format.js'
export default function RepRecords({exId}) {
  const S = useStore(s => s.S)
  const [period,setPeriod] = useState('all')
  const [from,setFrom] = useState('')
  const [to,setTo] = useState(todayISO())
  const range = useMemo(() => {
    if (period === 'custom') return {from,to}
    if (period === 'all') return {}
    const d = new Date(); d.setMonth(d.getMonth()-Number(period))
    return {from:[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
  },[period,from,to])
  const rows = useMemo(()=>repRecords(S,exId,range),[S.workouts,S.oneRmFormula,exId,range])
  const [selected,setSelected] = useState(null)
  return <section className="rep-records"><h4>Rep maxes · 1–12</h4>
    <select aria-label="Record period" value={period} onChange={e=>{setPeriod(e.target.value);setSelected(null)}}>
      <option value="all">All time</option><option value="12">Last year</option><option value="6">Last 6 months</option><option value="3">Last quarter</option><option value="custom">Custom dates</option>
    </select>
    {period === 'custom' && <div className="row"><input aria-label="From date" type="date" value={from} onChange={e=>setFrom(e.target.value)} /><input aria-label="To date" type="date" value={to} onChange={e=>setTo(e.target.value)} /></div>}
    <p className="small dim">Achieved = heaviest set at exactly that rep count. Estimates use your selected 1RM formula; unknown effort is not assumed to be failure. Warmups, partials and clusters are excluded. For weighted bodyweight, estimates require a logged bodyweight and show added load at the source session’s bodyweight.</p>
    <table><thead><tr><th>Reps</th><th>Achieved ({S.unit})</th><th>Estimated ({S.unit})</th></tr></thead><tbody>{rows.map(row=><tr key={row.reps}><td>{row.reps}</td><td>{row.actual ? <button className="record-link" onClick={()=>setSelected(row.actual)}>{fmtNum(row.actual.weight)} <small>{row.actual.date}</small></button> : '—'}</td><td>{row.estimated ? fmtNum(row.estimated.weight) : '—'}</td></tr>)}</tbody></table>
    {selected && <div className="card"><b>{selected.name} · {selected.date}</b>{(S.workouts.find(w=>w.id===selected.workoutId)?.entries || []).filter(e=>e.id===exId).map((e,i)=><p key={i}>{e.sets.filter(s=>s.done).map((s,j)=><span key={j}>{j ? ' / ' : ''}{s.w} × {s.r}{s.phase==='warmup'?' W':''}</span>)}</p>)}</div>}
  </section>
}
