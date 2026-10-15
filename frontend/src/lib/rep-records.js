import { FORMULAS, formulaOf, estimate1RM, weightedEstimate } from './onerm.js'
import { workoutAs, currentDbLoad } from './dumbbells.js'
import { isAssisted } from './exercises.js'
export function repRecords(S, exId, { from = '', to = '9999-12-31' } = {}) {
  const rows = Array.from({length:12},(_,i) => ({reps:i+1,actual:null,estimated:null}))
  if (isAssisted(exId)) return rows
  let best = null
  const formula = formulaOf(S)
  for (const raw of S.workouts || []) {
    if (raw.d < from || raw.d > to) continue
    const w = workoutAs(raw,exId,currentDbLoad(S,exId))
    for (const e of w.entries || []) if (e.id === exId) for (const s of e.sets || []) {
      if (!s.done || s.phase === 'warmup' || s.warmup || ['failed','partial','negative','cluster','myo','dropset'].includes(s.striveType) || ['dropset','restpause'].includes(s.type) || s.drops?.length || s.clusters?.length) continue
      const sets = s.sides ? Object.values(s.sides) : [s]
      for (const set of sets) {
        const bw = e.target?.bodyweight === true
        if (!set.done || !Number.isInteger(set.r) || !(set.r >= 1 && set.r <= 12) || !(set.w >= 0) || (!bw && set.w === 0)) continue
        const record = {weight:set.w,date:w.d,workoutId:w.id,name:w.name,reps:set.r}
        const row = rows[set.r-1]
        if (!row.actual || set.w > row.actual.weight) row.actual = record
        // Missing RIR remains missing. Historical estimates are load/reps estimates only.
        const mass = bw ? Number(w.bw) : 0
        const est = bw && !(mass>0) ? null : estimate1RM(set.w+mass,set.r,formula,set.rir ?? (set.rpe != null ? 10-set.rpe : null))
        if (est && (!best || est > best.value)) best = {value:est,bodyweight:mass,...record}
      }
    }
  }
  for (const row of rows) if (best) {
    const fn = FORMULAS[formula] || FORMULAS.epley
    const factor = row.reps === 1 ? 1 : formula === 'weighted' ? weightedEstimate(1,row.reps) : fn(1,row.reps)
    const load = best.value/factor-best.bodyweight
    if (load >= 0) row.estimated = { ...best,weight:Math.round(load*10)/10 }
  }
  return rows
}
