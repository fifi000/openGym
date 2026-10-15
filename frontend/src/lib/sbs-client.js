import { api } from './api.js'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { sbsRoutine } from '../../../api/coach/core/sbs.js'
let preparing = false
export async function prepareSbsSession(routineIds) {
  if (preparing) throw new Error('Coach is preparing this session. Please wait.')
  preparing = true
  try {
    for (const id of [].concat(routineIds || [])) {
      const state = useStore.getState().S
      const routine = state.routines.find(r=>r.id===id)
      if (!routine?.sbsWeeks) continue
      if(routine.sbsPrepared?.week===state.sbs.week && routine.sbsPrepared?.cycle===state.sbs.cycle)continue
      useUI.getState().toast('Coach is preparing your session…')
      let result
      try {
        result = await api('/api/sbs/prepare',{method:'POST',body:JSON.stringify({state:{sbs:state.sbs,routines:state.routines,workouts:state.workouts.slice(-60),customEx:state.customEx,countDouble:state.countDouble},routineId:id}),timeout:180000})
      } catch (e) {
        result = {routine:sbsRoutine(state,routine),reason:'Coach unavailable: using the workbook baseline. '+e.message,mode:'baseline',sources:[]}
      }
      useStore.getState().update(s=>{
        const i = s.routines.findIndex(r=>r.id===id)
        if(i<0 || s.active || s.sbs.week!==state.sbs.week || s.sbs.cycle!==state.sbs.cycle || JSON.stringify(s.sbs.maxes)!==JSON.stringify(state.sbs.maxes))throw new Error('Plan changed while Coach was preparing. Start again.')
        const before = structuredClone(s.routines[i])
        s.routines[i]={...result.routine,sbsPrepared:{week:s.sbs.week,cycle:s.sbs.cycle}}
        if(result.maxes)s.sbs.maxes=result.maxes
        s.sbs.audit=[{id:crypto.randomUUID(),date:new Date().toISOString(),routineId:id,week:s.sbs.week,cycle:s.sbs.cycle,reason:result.reason,mode:result.mode,sources:result.sources,before,after:structuredClone(s.routines[i]),beforeMaxes:state.sbs.maxes,afterMaxes:s.sbs.maxes},...(s.sbs.audit||[])].slice(0,40)
        if(result.memory?.length)s.sbs.memory=[...(s.sbs.memory||[]),...result.memory].slice(-60)
      })
      useUI.getState().toast(result.mode==='ai'?'Coach applied the session plan.':'Workbook baseline loaded.')
    }
  } finally { preparing=false }
}
