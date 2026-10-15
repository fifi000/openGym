// Run manually to refresh approved public sources; private excerpts never enter git.
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {parseHTML} from '../../frontend/node_modules/linkedom/esm/index.js'
const dir=process.argv[2]
if(!dir)throw new Error('Usage: node scripts/training/import-web.mjs /private/knowledge-directory')
const approved=new Set(['a-game.pl','podsztanga.pl','www.strongerbyscience.com'])
const indexes=['https://a-game.pl/arts/','https://podsztanga.pl/wiedza/','https://podsztanga.pl/wiedza/page/2/','https://podsztanga.pl/wiedza/page/3/']
const pending=new Set(['https://www.strongerbyscience.com/autoregulation/','https://www.strongerbyscience.com/training-to-failure-or-just-training-to-fail/','https://podsztanga.pl/stopien-zaawansowania/','https://podsztanga.pl/__trashed/'])
const errors=[]
async function get(url){
  if(!approved.has(new URL(url).hostname))throw new Error('Unapproved source')
  const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(12000)})
  if(!r.ok||!approved.has(new URL(r.url).hostname))throw new Error(`HTTP ${r.status}`)
  return parseHTML(await r.text()).document
}
for(const url of indexes){
 try{
  const doc=await get(url)
  for(const a of doc.querySelectorAll('.post a,.elementor-post a')){
   const u=new URL(a.getAttribute('href')||'',url)
   if(u.hostname===new URL(url).hostname&&a.textContent.trim().length>12&&!/\/(category|tag|author|arts|wiedza)\//.test(u.pathname))pending.add(u.href)
  }
 }catch(e){errors.push({url,error:e.message})}
}
let chunks=JSON.parse(fs.readFileSync(path.join(dir,'chunks.json'),'utf8')).filter(d=>d.kind!=='article')
let manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8')).filter(d=>!d.url)
let fetched=0
for(const url of pending){
 try{
  const doc=await get(url)
  let content=doc.querySelector('.elementor-widget-theme-post-content')||doc.querySelector('.entry-content')||doc.querySelector('.post-content')||doc.querySelector('main')||doc.body
  for(const el of content.querySelectorAll('script,style,nav,footer,header,.comments-area,.elementor-widget-posts'))el.remove()
  const text=content.textContent.replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n\n').trim()
  if(text.length<100)throw new Error('No readable article')
  const title=doc.title||url
  const id=createHash('sha256').update(url).digest('hex').slice(0,12)
  const videos=[...content.querySelectorAll('iframe')].map(e=>e.getAttribute('src')).filter(Boolean)
  const fetchedAt=new Date().toISOString()
  manifest.push({id,title,url,characters:text.length,fetchedAt,videoTranscriptsIncluded:false})
  for(let at=0,n=0;at<text.length;at+=2400,n++)chunks.push({id:`${id}-c${n}`,title,url,text:text.slice(at,at+2700),kind:'article',fetchedAt,...(videos.length?{videoTranscriptsIncluded:false}:{})})
  fetched++
  // A-Game's index exposes the latest three posts. Its previous-post link reaches older posts.
  if(new URL(url).hostname==='a-game.pl'&&fetched<30){for(const a of doc.querySelectorAll('a[rel="prev"]')){const u=new URL(a.getAttribute('href'),url);if(u.hostname==='a-game.pl')pending.add(u.href)}}
  console.log(title,text.length)
 }catch(e){errors.push({url,error:e.message})}
}
fs.writeFileSync(path.join(dir,'chunks.json'),JSON.stringify(chunks))
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2))
fs.writeFileSync(path.join(dir,'import-errors.json'),JSON.stringify(errors,null,2))
console.log(JSON.stringify({articles:fetched,failures:errors.length}))
