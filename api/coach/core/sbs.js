// Personal SBS cycle. Workbook cells, not stale comments, define the baseline.
// No missing effort is interpreted as failure. Inputs stay in logged load units.
export const roundLoad = (value, step = 2.5) => Math.round(Math.floor((value + 1e-8) / step) * step * 1000) / 1000
const clone = value => JSON.parse(JSON.stringify(value))
export function sbsRoutine(S, routine) {
  if (!S.sbs?.enabled || !routine?.sbsWeeks) return routine
  const week = S.sbs.week || 1
  const out = { ...routine, ex: clone(routine.sbsWeeks[week] || routine.ex), sbsWeek: week, sbsCycle: S.sbs.cycle }
  // Strive templates sometimes contain total-bodyweight placeholders. Follow the user's
  // added-load convention using the last completed session, never a guessed body mass.
  for (const cfg of out.ex) if (cfg.bodyweight) {
    const last=[...(S.workouts||[])].reverse().find(w=>(w.routineIds||[w.routineId]).includes(routine.id)&&w.entries?.some(e=>e.id===cfg.id))
    const logged=last?.entries.find(e=>e.id===cfg.id)?.sets.filter(s=>s.done) || []
    if(logged.length)cfg.sbsRows=(cfg.sbsRows||[]).map((row,i)=>({...row,w:logged[Math.min(i,logged.length-1)].w || 0}))
  }
  const main = out.ex[0]
  if (!main) return out
  const step = S.sbs.rounding || 2.5
  const mx = S.sbs.maxes || {}
  const rows = []
  const add = (n, reps, pct, role = 'work', max = false) => {
    for (let i = 0; i < n; i++) rows.push({ w: roundLoad(pct, step), r: reps, role, ...(max ? { max: true } : {}) })
  }
  if (routine.name === 'Upper A') {
    const blocks = { 1: [[4,5,.8],[2,3,.85]], 2: [[2,5,.8],[4,3,.85]], 3: [[3,3,.85],[3,1,.9]], 4: [[5,3,.7]] }
    for (const [n,r,p] of blocks[week]) add(n,r,mx.bench*p)
  } else if (routine.name === 'Upper B') {
    if (week === 4) add(1,1,mx.bench*.95,'test')
    else {
      const reps = {1:12,2:10,3:8}[week]
      const weight = roundLoad(mx.accessory / (1 + .033 * reps), step)
      add(1,reps,weight,'topSet',true)
      add({1:3,2:4,3:5}[week],{1:8,2:6,3:5}[week],weight)
    }
  } else if (routine.name === 'Lower') {
    if (week === 4) { add(1,1,mx.squat*.95,'test'); add(2,3,mx.squat*.75,'backOff') }
    else { add(1,{1:5,2:3,3:1}[week],mx.squat*{1:.8,2:.85,3:.9}[week],'topSet',true); add(2,{1:5,2:4,3:3}[week],mx.squat*{1:.72,2:.75,3:.8}[week],'backOff') }
  }
  // Preserve the user's warmup count; scale the ramp to the first planned work weight.
  const oldWarm = (main.sbsRows || []).filter(s => s.phase === 'warmup')
  const first = rows[0]?.w || 0
  const warm = oldWarm.map((s,i) => ({ ...s, w: roundLoad(Math.min(first*.9, first*[.4,.6,.75,.85][Math.min(i,3)]),step), done:false }))
  main.sbsRows = [...warm,...rows.map(s => ({...s,done:false,phase:'work'}))]
  main.weight = first; main.sets = rows.length; main.reps = rows[0]?.r || 1; main.prog = 'off'
  main.note = `SBS · Week ${week}. ${week === 4 && routine.name !== 'Upper A' ? '1RM test: opening attempt only; add attempts according to technique and actual effort. No automatic max assumption.' : 'Workbook baseline; Coach may adapt with a recorded reason.'}`
  return out
}
export function completeSbs(S, workout) {
  if (!S.sbs?.enabled || !workout.sbs || workout.sbs.week !== S.sbs.week || workout.sbs.cycle !== S.sbs.cycle) return
  const ids = workout.routineIds || [workout.routineId]
  const completed = new Set(S.sbs.completed || [])
  for (const id of ids) if (S.routines.some(r => r.id === id && r.sbsWeeks)) completed.add(id)
  S.sbs.completed = [...completed]
  if (S.routines.filter(r => r.sbsWeeks).every(r => completed.has(r.id))) {
    S.sbs.week = S.sbs.week === 4 ? 1 : S.sbs.week + 1
    if (S.sbs.week === 1) S.sbs.cycle = (S.sbs.cycle || 1) + 1
    S.sbs.completed = []
  }
  for (const r of S.routines) if (r.sbsWeeks) { r.ex = sbsRoutine(S,r).ex; delete r.sbsPrepared }
}
// Apply a model decision against exactly the baseline it reviewed. Reject the whole answer
// rather than partially applying an invalid prescription. Sources must be retrieved documents.
export function validateDecision(answer, routine, sourceIds, knownExercises = {}) {
  if (!answer || typeof answer.reason !== 'string' || !answer.reason.trim()) throw new Error('Missing explanation')
  if (!Array.isArray(answer.sources) || !answer.sources.length || answer.sources.some(id => !sourceIds.includes(id))) throw new Error('Unverified source')
  if (!Array.isArray(answer.exercises) || answer.exercises.length > 20) throw new Error('Invalid exercise list')
  const out = clone(routine)
  const removed = Array.isArray(answer.removeIds) ? answer.removeIds : []
  if (removed.some(id=>!out.ex.some(e=>e.id===id))) throw new Error('Unknown exercise removal')
  out.ex = out.ex.filter(e=>!removed.includes(e.id))
  const seen = new Set()
  for (const change of answer.exercises) {
    if (seen.has(change.id)) throw new Error('Duplicate exercise')
    seen.add(change.id)
    let cfg = out.ex.find(e => e.id === change.id)
    if (!cfg && knownExercises[change.id]) {
      cfg = {id:change.id,prog:'off',bodyweight:knownExercises[change.id].eq === 'body weight'}
      out.ex.push(cfg)
    }
    if (!cfg || !Array.isArray(change.rows) || !change.rows.length || change.rows.length > 16) throw new Error('Unknown exercise or rows')
    cfg.sbsRows = change.rows.map(row => {
      if (typeof row.w !== 'number' || !Number.isFinite(row.w) || row.w < 0 || row.w > 600 || !Number.isInteger(row.r) || row.r < 1 || row.r > 100) throw new Error('Invalid load or reps')
      if (!['warmup','work','topSet','backOff','test'].includes(row.role)) throw new Error('Invalid row role')
      if (row.rir != null && (typeof row.rir !== 'number' || row.rir < 0 || row.rir > 10)) throw new Error('Invalid target RIR')
      return { w: row.w, r: row.r, role: row.role, phase: row.role === 'warmup' ? 'warmup' : 'work', done:false, ...(row.rir != null ? {targetRir:row.rir} : {}), ...(row.amrap === true ? {max:true} : {}) }
    })
    cfg.sets = cfg.sbsRows.filter(r => r.phase !== 'warmup').length
    if (!cfg.sets) throw new Error('No working sets')
    cfg.weight = cfg.sbsRows.find(r => r.phase !== 'warmup').w
    cfg.reps = cfg.sbsRows.find(r => r.phase !== 'warmup').r
    cfg.note = answer.reason
  }
  if (!out.ex.length || out.ex.length > 20) throw new Error('Invalid routine size')
  return out
}
