// Standalone: node tests-calendar.cjs. No packages or system-clock changes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),{performance}=require('node:perf_hooks');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const source=script.slice(0,script.indexOf('// APP INIT'));
const stub=()=>({innerHTML:'',textContent:'',dataset:{},contains(){return false},setAttribute(){},append(){},querySelector:()=>stub(),querySelectorAll:()=>[],classList:{add(){},remove(){},toggle(){}},remove(){},focus(){}});
const document={createElement:()=>stub(),addEventListener(){},querySelector:()=>stub(),querySelectorAll:()=>[],body:stub()};
const storage={data:null,getItem(){return this.data},setItem(k,v){this.data=v}};
const context=vm.createContext({document,window:{addEventListener(){},scrollTo(){}},location:{hash:'#/studio/content'},localStorage:storage,Date,performance,console,setInterval(){},setTimeout(fn){queueMicrotask(fn);return 1},clearTimeout(){},requestAnimationFrame(){},matchMedia(){return{matches:false}},crypto:require('node:crypto').webcrypto,URLSearchParams,Map,Set,FormData:class{constructor(form){this.data=form}get(k){return this.data[k]??''}}});
vm.runInContext(source+`
window.api={clock:RealClock,fresh:()=>{state=migrateState(freshState());state.videos=[];state.ecosystem.shortsSeeded=true;for(const c of state.channels)c.nextUploadAt=RealClock.now()+10000*DAY;return state},state:()=>state,replace:s=>{state=s},publish:async(type,title)=>{videoDraft={type,seed:hash(title),pending:0,thumbnail:'asset:preserved-image'};await publish({title,description:'Calendar test',category:'Обучение',tags:'test',duration:type==='short'?'0:30':'10:00',visibility:'public'});return mine().find(v=>v.title===title)},advance,settle:settleTime,boot:settleBootTime,save:persistState,load:loadStateForBoot,migrate:migrateState,validate:validateImport,update:updateLive,relative:formatRelativeTime,parse:parseLocalPublicationDate,cutoff:calendarCutoff,day:localDay,nextDay:nextLocalDay,hour:localHour,series,aggregate,audience:()=>audienceMetrics(channelBy('me'),0),correct:correctPublicationDate,npc:()=>{npcPublishBudget=12;publishNPCDue(RealClock.now())},views:()=>state.videos.reduce((n,v)=>n+v.views,0),finite:()=>state.videos.every(v=>Number.isFinite(v.views)&&Number.isFinite(v.impressions)),sync:syncChannelTotals};
closeModal=function(){};render=function(){};notify=function(){};toast=function(){};saveState=function(){return true};
})();`,context);
const api=context.window.api,results=[];const check=(b,m)=>{assert.ok(b,m);results.push(m)};const near=(a,b)=>Math.abs(a-b)<1e-6*Math.max(1,Math.abs(a),Math.abs(b));
let now=+new Date(2026,9,8,14,0);api.clock.now=()=>now;
const tick=ms=>{now+=ms;api.settle()};
(async()=>{
 api.fresh();const first=await api.publish('video','First at 14:00');check(first.publishedAt===now&&first.dateStatus==='real','New video uses injected real timestamp');
 tick(10*60e3);const second=await api.publish('video','Second at 14:10');check(second.publishedAt-first.publishedAt===10*60e3,'Publication dates follow real elapsed ten minutes');
 check(first.views>0&&second.views===0,'First real minutes generate parameter-based views; second is not credited before publication');
 api.state().simulation.speed=20;const before=first.views,date1=first.publishedAt,date2=second.publishedAt;tick(4*3600e3);
 check(first.views>before&&second.views>0,'Speed twenty grows statistics during real hours');
 check(first.publishedAt===date1&&second.publishedAt===date2&&new Date(first.publishedAt).getDate()===8&&new Date(second.publishedAt).getDate()===8,'Both dates remain October eighth after acceleration');
 check(api.relative(first.publishedAt)==='4 часа назад','Real video age is four hours, not eighty accelerated hours');
 const views=api.views();api.advance(100*864e5);check(api.views()===views,'Simulation cannot consume future wall time');
 check(api.state().videos.every(v=>v.history.every(h=>h.timestamp<=now))&&api.state().channels.every(c=>c.audienceProfile.history.every(h=>h.at<=now)),'No future dates in video or audience analytics');
 const points=api.series([first]);check(points.every(p=>p.hourly)&&points.length===5&&points.every(p=>p.t<=now),'New video has real hourly chart through current hour');
 check(near(points.reduce((n,p)=>n+p.value,0),first.history.reduce((n,h)=>n+h.views,0)),'Hourly chart includes the current partial hour');
 now=+new Date(2026,9,10,14,0);check(api.relative(first.publishedAt)==='2 дня назад'&&api.relative(second.publishedAt)==='1 день назад','Relative duration reads real timestamps on October tenth');
 // At 14:10 both are two full days old, independent of processing or speed.
 now+=10*60e3;check(api.relative(first.publishedAt)==='2 дня назад'&&api.relative(second.publishedAt)==='2 дня назад','Both publications display two days after their respective real timestamps');
 await api.boot();const afterBoot=api.views(),watermark=api.state().simulation.lastSimulationTimestamp;await api.boot();api.settle();check(api.views()===afterBoot&&watermark===now,'Offline interval is processed once by both boot and online paths');
 check(api.state().videos.every(v=>v.history.every(h=>h.timestamp<=now)),'Offline statistics never land in a future day');
 api.state().simulation.speed=0;const paused=api.views();tick(864e5);check(api.views()===paused&&api.relative(first.publishedAt)==='3 дня назад','Pause freezes simulated statistics while the real calendar advances');
 const ageElement={dataset:{publicationAge:first.id},textContent:''};document.querySelectorAll=q=>q==='[data-publication-age]'?[ageElement]:[];api.update();check(ageElement.textContent==='3 дня назад','Visible relative-age label updates while statistics are paused');document.querySelectorAll=()=>[];
 api.state().simulation.speed=5;api.settle();check(api.views()===paused,'Resume does not recover the paused interval');tick(3600e3);const speedFive=api.views();api.state().simulation.speed=20;api.settle();check(api.views()===speedFive,'Changing speed at a settled watermark never credits twice');
 await api.save();const loaded=await api.load();check(loaded.simulation.speed===20&&loaded.simulation.lastSimulationTimestamp===now,'Save preserves speed and real watermark');api.replace(loaded);api.settle();check(near(api.views(),speedFive),'Reload does not repeat accrued views');
 const at=now;now-=2*3600e3;api.settle();check(near(api.views(),speedFive)&&api.state().simulation.lastSimulationTimestamp===at,'Clock moving backwards cannot duplicate a previously processed interval');now=at;
 const short=await api.publish('short','Short calendar');const shortsDate=short.publishedAt;tick(3600e3);check(short.views>0&&short.publishedAt===shortsDate&&api.relative(short.publishedAt)==='1 час назад','Shorts use the same immutable real calendar');
 check(near(short.shortStats.shownInFeed,short.shortStats.viewedExposures+short.shortStats.swipedAway)&&near(short.views,short.shortStats.viewedExposures+short.shortStats.rewatches),'Shorts exposure constraints survive acceleration');
 const c=api.state().channels.find(x=>x.id==='c0');c.nextUploadAt=now-3600e3;api.npc();check(api.state().videos.filter(v=>v.channelId==='c0').every(v=>v.publishedAt<=now),'New NPC publications have no future dates');
 const modern=JSON.parse(JSON.stringify(api.state())),same=JSON.stringify(api.migrate(modern));check(JSON.stringify(api.migrate(modern))===same,'Modern calendar migration is idempotent');
 const old=JSON.parse(JSON.stringify(api.state()));delete old.calendarVersion;old.simulation.now=now+40*864e5;old.simulation.lastSimulationTimestamp=now;for(const v of old.videos){delete v.dateStatus;delete v.realCreatedAt;v.publishedAt+=40*864e5;for(const h of v.history)h.timestamp+=40*864e5}for(const ch of old.channels){ch.audienceProfile.lastDecayAt+=40*864e5;ch.audienceProfile.lastPublishedAt+=40*864e5;for(const h of ch.audienceProfile.history)h.at+=40*864e5}
 const original=JSON.parse(JSON.stringify(old)),migrated=api.migrate(old);
 check(migrated.videos.every((v,i)=>['views','impressions','likes','dislikes','comments','watchSeconds','subscribersGained','thumbnail'].every(k=>v[k]===original.videos[i][k])),'Legacy migration preserves every metric and image reference');
 check(migrated.channels.every((c,i)=>c.subscribers===original.channels[i].subscribers),'Legacy migration preserves channel subscriber counts');
 check(migrated.videos.every((v,i)=>JSON.stringify(v.legacyCalendar.history)===JSON.stringify(original.videos[i].history)),'All original dated telemetry is preserved verbatim in backup');
 check(migrated.videos.every(v=>v.publishedAt<=now&&v.dateStatus==='estimated')&&migrated.simulation.now<=now,'Virtual publication dates are marked estimated and cannot be future dates');
 check(migrated.videos.every(v=>v.history.length===0),'Uncertain old view dates are not invented on real-day charts');
 api.replace(migrated);const affected=api.state().videos.find(v=>v.channelId==='me'),oldViews=affected.views,oldDate=affected.publishedAt;let rejected=false;try{api.correct(affected,now+3600e3)}catch{rejected=true}check(rejected&&affected.publishedAt===oldDate,'Manual date correction rejects future timestamps');api.correct(affected,now-2*864e5);check(affected.dateStatus==='corrected'&&affected.views===oldViews&&affected.legacyCalendar.publishedAt>now,'Manual recovery keeps original date and statistics');
 const corrected=affected.publishedAt;api.state().simulation.speed=20;tick(3600e3);check(affected.publishedAt===corrected,'Corrected real date is immutable during simulation');
 const round=api.validate(JSON.parse(JSON.stringify(api.state())));check(round.calendarVersion===1&&round.videos.length===api.state().videos.length,'Migrated calendar passes full backup validation');
 for(const version of [1,2]){const oldVersion=JSON.parse(JSON.stringify(original));oldVersion.version=version;const recovered=api.migrate(oldVersion);check(recovered.videos.every((v,i)=>v.views===original.videos[i].views)&&recovered.calendarVersion===1,'Version '+version+' safely migrates to the real calendar')}
 const reliable=JSON.parse(JSON.stringify(original));delete reliable.calendarVersion;reliable.videos[0].realCreatedAt=now-123456;check(api.migrate(reliable).videos[0].publishedAt===now-123456,'Trusted real creation timestamp is preferred during recovery');
 // Local-day helpers must move civil dates, not assume every day has 24 hours.
 const spring=+new Date(2026,2,8,12),fall=+new Date(2026,10,1,12);
 const springDay=api.day(spring),fallDay=api.day(fall),springLength=(api.nextDay(springDay)-springDay)/3600e3,fallLength=(api.nextDay(fallDay)-fallDay)/3600e3;
 if(process.env.TZ==='America/New_York'){check(springLength===23&&fallLength===25,'DST spring and fall civil days have twenty-three and twenty-five hours');let missingHour=false;try{api.parse('2026-03-08T02:30')}catch{missingHour=true}check(missingHour,'Manual correction rejects nonexistent local spring-forward hour');check(api.cutoff(2,api.nextDay(springDay)+3600e3)===springDay,'Period cutoff uses civil dates across DST');const repeated=[+new Date('2026-11-01T01:30:00-04:00'),+new Date('2026-11-01T01:30:00-05:00')];check(api.hour(repeated[1])-api.hour(repeated[0])===3600e3,'Repeated local hour remains two distinct absolute hourly buckets')}
 if(process.env.TZ==='Asia/Kathmandu')check(new Date(api.hour(+new Date(2026,9,8,14,17))).getMinutes()===0,'Fractional timezone offset uses local hourly boundaries');
 // Thirty-day cap is applied before speed; it never makes the calendar sixty months older.
 api.fresh();const bounded=await api.publish('video','Bounded offline');api.state().simulation.speed=20;now+=90*864e5;api.settle();check(api.state().simulation.lastSimulationTimestamp===now&&bounded.publishedAt<=now&&api.finite(),'Long offline gap is bounded and watermark commits the whole real gap');check(api.state().videos.every(v=>v.history.every(h=>h.timestamp<=now&&h.timestamp>=now-31*864e5)),'Offline cap limits actual processed dates to thirty real days');
 console.log(JSON.stringify({passed:results.length,timeZone:process.env.TZ||Intl.DateTimeFormat().resolvedOptions().timeZone,results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
