import ctypes, re, json
from pathlib import Path
j=ctypes.CDLL('/System/Library/Frameworks/JavaScriptCore.framework/JavaScriptCore')
def setup(name,args,result):
 f=getattr(j,name);f.argtypes=args;f.restype=result;return f
ptr=ctypes.c_void_p
ctx=setup('JSGlobalContextCreate',[ptr],ptr)(None)
jsstr=setup('JSStringCreateWithUTF8CString',[ctypes.c_char_p],ptr)
evaluate=setup('JSEvaluateScript',[ptr,ptr,ptr,ptr,ctypes.c_int,ctypes.POINTER(ptr)],ptr)
tostring=setup('JSValueToStringCopy',[ptr,ptr,ctypes.POINTER(ptr)],ptr)
length=setup('JSStringGetMaximumUTF8CStringSize',[ptr],ctypes.c_size_t)
getstr=setup('JSStringGetUTF8CString',[ptr,ctypes.c_char_p,ctypes.c_size_t],ctypes.c_size_t)
release=setup('JSStringRelease',[ptr],None)
def run(code):
 string=jsstr(code.encode());exc=ptr();val=evaluate(ctx,string,None,None,1,ctypes.byref(exc));release(string)
 out=tostring(ctx,exc.value or val,None);buf=ctypes.create_string_buffer(length(out));getstr(out,buf,len(buf));release(out)
 result=buf.value.decode()
 if exc.value: raise Exception(result)
 return result
html=Path('outputs/index.html').read_text();script=re.search(r'<script>(.*?)</script>',html,re.S).group(1)
prefix="""const document={addEventListener(){},querySelector(){return {textContent:'',innerHTML:'',querySelector(){return null},classList:{remove(){},toggle(){}}}},querySelectorAll(){return []},body:{classList:{remove(){},toggle(){}}}};const window={addEventListener(){},scrollTo(){}};const location={hash:'#/studio/content'};const matchMedia=()=>({matches:false});const setInterval=()=>1;const setTimeout=()=>1;const clearTimeout=()=>{};const performance={now:()=>0};const localStorage={data:null,getItem(){return this.data},setItem(k,v){this.data=v}};"""
body=script[:script.index('// APP INIT')]
checks=r"""
const results=[];function assert(b,m){if(!b)throw Error(m);results.push(m)}
state=freshState();syncChannelTotals();assert(state.channels.length===21&&state.videos.length===80,'20 NPC channels / 80 videos');
function ownVideo(seed=129,visibility='public',i=0){const v={id:'own-'+i,channelId:'me',title:'Понятный маршрут: первая история о путешествии',description:'Описание',duration:600,category:'Путешествия',tags:['маршрут','горы'],thumbnail:'data:image/webp;base64,a',seed,publishedAt:state.simulation.now,visibility,views:0,impressions:0,likes:0,dislikes:0,comments:0,subscribersGained:0,watchSeconds:0,history:[],traffic:Array(6).fill(0),localComments:[]};v.params=params(v,channelBy('me'));state.videos.push(v);return v}
const v=ownVideo();assert(v.views===0&&v.impressions===0,'New publications begin at zero');const privateV=ownVideo(42,'private',1),unlistedV=ownVideo(48,'unlisted',2);advance(2*3600e3);assert(v.views>0&&v.impressions>v.views,'Initial impressions convert into views');advance(7*864e5);
assert(privateV.views===0&&unlistedV.views===0,'Private / unlisted excluded from distribution');assert(v.likes>=v.views*.019&&v.likes<=v.views*.101,'Likes depend on views within realistic rates');assert(v.dislikes>=0&&v.dislikes<v.views*.021,'Dislikes bounded by audience size');assert(v.comments<v.views*.011,'Comments bounded by audience size');assert(Math.abs(v.watchSeconds-v.views*v.duration*v.params.retention)<1e-7,'Watch time equals views × average duration');assert(Math.abs(v.traffic.reduce((a,b)=>a+b)-v.views)<1e-7,'Traffic sources sum to views');assert(Math.abs(v.history.reduce((n,h)=>n+h.views,0)-v.views)<1e-7,'History and totals match');assert(Math.abs(channelBy('me').totalViews-v.views)<1e-7,'Channel total is sum of own videos');assert(Math.abs(aggregate([v],0).views-v.views)<1e-7,'Lifetime analytics shares source of truth');
for(let n=0;n<15;n++)advance(30*864e5);assert(v.history.length<=420,'Old history bounded and aggregated');assert(Number.isFinite(v.views)&&v.views<v.impressions,'Long running growth remains finite');
const t=state.simulation.now;advance(1e14);assert(state.simulation.now-t===CONFIG.offlineCap,'Large offline interval is capped');
state.simulation.speed=0;const frozen=v.views;state.simulation.lastSimulationTimestamp=Date.now()-3600e3;settleTime();assert(v.views===frozen,'Pause prevents offline growth');state.simulation.speed=1;state.simulation.lastSimulationTimestamp=Date.now()-3600e3;settleTime();assert(v.views>frozen,'Offline progress resumes from saved timestamp');
assert(esc('<img onerror="x">').includes('&lt;'),'User content is escaped');assert(parseDuration('1:30:00')===5400&&parseDuration('10:99')===0,'Duration parser accepts hours and validates seconds');assert(formatViews(1200).endsWith('просмотров'),'Abbreviated Russian counts are grammatical');assert(!recommendations(null,'Все').some(x=>x.visibility!=='public'),'Private content absent from recommendations');
const blocked=state.channels[1].id;state.user.blockedChannels.push(blocked);assert(!recommendations(null,'Все').some(x=>x.channelId===blocked),'Blocked channels removed from recommendations');
render=()=>{};renderContent=()=>{};closeModal=()=>{};toast=()=>{};const removed=v.id;deleteVideo(removed);assert(!videoBy(removed)&&channelBy('me').totalViews===0,'Delete removes publication and synchronizes channel totals');
state=freshState();saveState(true);const original=state.videos[0].id;state=loadState();assert(state.videos[0].id===original&&state.channels.length===21,'Storage round trip preserves ecosystem');
const ctrBackup=state.videos[0];assert(validateImport(JSON.parse(JSON.stringify(state))).videos.length===80,'Export data passes import validation');
window.testResult=JSON.stringify({passed:results.length,results});
})();window.testResult;
"""
result=run(prefix+body+checks)
Path('work/engine-results.json').write_text(result)
print(result)
