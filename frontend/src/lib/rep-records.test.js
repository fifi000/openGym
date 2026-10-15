import {it,expect} from 'vitest'
import {repRecords} from './rep-records.js'
const workout=(id,d,sets,bw)=>({id,d,bw,name:id,entries:[{id:'0025',sets,target:{}}]})
it('filters by date, exact reps, completion and source set types',()=>{
 const S={workouts:[workout('old','2025-01-01',[{done:true,w:200,r:1}]),workout('new','2026-10-01',[{done:true,w:100,r:5},{done:true,w:150,r:5,phase:'warmup'},{done:true,w:180,r:5,striveType:'partial'},{done:false,w:190,r:5},{done:true,w:120,r:8,striveType:'cluster'}])]}
 const r=repRecords(S,'0025',{from:'2026-01-01',to:'2026-10-15'});expect(r[4].actual.weight).toBe(100);expect(r[0].actual).toBeNull();expect(r[7].actual).toBeNull();expect(r[0].estimated.weight).toBeCloseTo(116.7,1);expect(S.workouts[1].entries[0].sets[0].rir).toBeUndefined();expect(repRecords(S,'0025')[0].actual.weight).toBe(200)
})
it('does not double the max when countDouble changes volume',()=>{const w=workout('w','2026-10-01',[{done:true,w:30,r:12}]);w.entries[0].target.countDouble=true;expect(repRecords({workouts:[w]},'0025')[11].actual.weight).toBe(30)})
it('does not estimate weighted bodyweight without bodyweight, and subtracts it once when known',()=>{const w=workout('w','2026-10-01',[{done:true,w:20,r:5}]);w.entries[0].target.bodyweight=true;expect(repRecords({workouts:[w]},'0025')[4].actual.weight).toBe(20);expect(repRecords({workouts:[w]},'0025')[0].estimated).toBeNull();w.bw=80;expect(repRecords({workouts:[w]},'0025')[0].estimated.weight).toBeCloseTo(36.7,1)})
