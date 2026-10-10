// Safety regression tests. Synthetic states only; no browser/user storage is accessed.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{performance}=require('node:perf_hooks');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const source=script.slice(0,script.indexOf('// APP INIT')),start=Date.UTC(2026,9,10,10),HOUR=3600000,DAY=24*HOUR,copy=x=>JSON.parse(JSON.stringify(x));
const results=[],cadence=[];function check(b,m){if(!b)throw Error(m);results.push(m)}
function lockManager(){let running=false;const queue=[];function next(){if(running||!queue.length)return;running=true;const {fn,resolve,reject}=queue.shift();Promise.resolve().then(()=>fn({name:'writer'})).then(resolve,reject).finally(()=>{running=false;next()})}return{request(name,options,fn){return new Promise((resolve,reject)=>{queue.push({fn,resolve,reject});next()})}}}
function storage(){const extra=new Map();return{data:null,getItem(k){return k==='kadr.local.v1'?this.data:extra.get(k)??null},setItem(k,v){if(k==='kadr.local.v1')this.data=v;else extra.set(k,v)},removeItem(k){if(k==='kadr.local.v1')this.data=null;else extra.delete(k)}}}
function tab(shared=storage(),locks=lockManager()){
 let now=start;const clock=class extends Date{static now(){return now}},stub=()=>({dataset:{},innerHTML:'',textContent:'',setAttribute(){},querySelector(){return null},querySelectorAll(){return[]},classList:{remove(){},toggle(){}}});
 const document={addEventListener(){},querySelector(){return null},querySelectorAll(){return[]},createElement:stub,body:stub()};
 const context=vm.createContext({document,window:{addEventListener(){},scrollTo(){}},navigator:locks?{locks}:{},location:{hash:'#/playlists'},localStorage:shared,Date:clock,performance,console,setInterval(){return 1},clearInterval(){},setTimeout(){return 1},clearTimeout(){},matchMedia(){return{matches:false}},crypto:require('node:crypto').webcrypto,URLSearchParams,Map,Set,Blob,URL,setWall:n=>now=n});
 vm.runInContext(source+`\nwindow.api={
 fresh(){state=migrateState(freshState());state.videos=[];state.channels=[state.channels[0]];state.community.posts=[];state.ecosystem.shortsSeeded=true;return state},
 own(type='short',serial=0){const v=makeNPCPublication(channelBy('me'),3,RealClock.now(),type);v.id='audit-'+type+'-'+serial;v.dateStatus='real';v.realCreatedAt=v.publishedAt;state.videos.push(v);initializeDistribution(v,channelBy('me'));initializeSocialVideo(v);v.seed+=serial;if(isShort(v))v.shortParams.shortsQuality=Math.min(.95,v.shortParams.shortsQuality+serial*.03);return v},
 get:()=>state,set:s=>{state=JSON.parse(JSON.stringify(s))},validate:validateImport,load:loadStateForBoot,
 comments:v=>commentList(v),notifications:notificationsMarkup,save:()=>saveState(true),persist:persistState,
 async acquire(){const won=await SessionCoordinator.acquire();if(won)SessionCoordinator.capture();return won},
 async resume(){state=await loadStateForBoot()},release:()=>SessionCoordinator.finish(),pause:()=>SessionCoordinator.pause(),active:()=>SessionCoordinator.active,
 setLease:f=>SessionCoordinator.lease=f,leaseMode:()=>SessionCoordinator.mode,commit:f=>SessionCoordinator.commit(f),signalClose:()=>SessionCoordinator.signalClose(),
 setDB:db=>stateDatabase=db,
 playlist:title=>savePlaylist({title,visibility:'public'}),wall:setWall,tick:t=>{setWall(t);settleTime()}
};\n})();`,context);
 const api=context.window.api;api.fresh();return api;
}
async function main(){
 const api=tab();api.own();const valid=copy(api.get());check(!!api.validate(copy(valid)),'Normal v5 backup remains valid');
 for(const [label,mutate]of [
  ['notification attribute injection',s=>s.notifications=[{id:'x\" onclick=\"void(0)',text:'test',at:start,route:'home',read:false}]],
  ['comment attribute injection',s=>s.videos[0].localComments=[{id:'x\" onclick=\"void(0)',text:'test',author:'test',at:start}]],
  ['notification route injection',s=>s.notifications=[{id:'safe',text:'test',at:start,route:'javascript:alert(1)',read:false}]],
  ['invalid notifications container',s=>s.notifications={}],
  ['duplicate notification IDs',s=>s.notifications=Array.from({length:2},()=>({id:'same',text:'test',at:start,route:'home',read:false}))],
  ['reserved video ID',s=>s.videos[0].id='constructor'],
  ['invalid channel seed',s=>s.channels[0].seed=-1],
  ['unknown channel category',s=>s.channels[0].niche='unknown']
 ]){const bad=copy(valid);mutate(bad);let rejected=false;try{api.validate(bad)}catch{rejected=true}check(rejected,'Import rejects '+label)}
 const legacy=copy(valid);legacy.notifications=[{text:'Legacy notification',route:'home',at:start,read:false}];legacy.videos[0].localComments=[{text:'Legacy comment',author:'test',at:start}];const upgraded=api.validate(legacy);check(/^[-a-zA-Z0-9]+$/.test(upgraded.notifications[0].id)&&/^[-a-zA-Z0-9]+$/.test(upgraded.videos[0].localComments[0].id),'Legacy missing IDs receive safe generated identifiers');
 const dirty=copy(valid);dirty.notifications=[{id:'x\" onclick=\"void(0)',text:'<img src=x onerror=void(0)>',at:start,route:'home',read:false}];dirty.videos[0].localComments=[{id:'x\" onclick=\"void(0)',text:'<script>void(0)</script>',author:'test',at:start}];api.set(dirty);check(!api.notifications().includes('onclick="void(0)')&&!api.comments(api.get().videos[0]).includes('onclick="void(0)'),'Rendering escapes IDs even if old local data bypassed import validation');check(api.notifications().includes('&lt;img')&&api.comments(api.get().videos[0]).includes('&lt;script&gt;'),'Comment and notification text remains escaped');
 const dirtyStorage=storage();dirtyStorage.data=JSON.stringify(dirty);const oldRaw=dirtyStorage.data;let loadRejected=false;try{await tab(dirtyStorage).load()}catch{loadRejected=true}check(loadRejected&&dirtyStorage.data===oldRaw,'Boot rejects unsafe old inline data while retaining the original save');

 const shared=storage(),locks=lockManager(),a=tab(shared,locks),b=tab(shared,locks);await a.acquire();a.playlist('Created in A');check(a.save(),'Active tab can commit');const durable=shared.data;
 let acquiredB=false;const pending=b.acquire().then(()=>{acquiredB=true});await Promise.resolve();await Promise.resolve();check(!acquiredB&&!b.active(),'Second tab waits without acquiring writer ownership');check(b.save()===false&&shared.data===durable,'Waiting tab cannot overwrite the active tab');
 await a.release();await pending;await b.resume();check(b.active()&&b.get().playlists[0].title==='Created in A','After owner closes the waiting tab loads the latest playlist');b.playlist('Created in B');check(b.save()&&JSON.parse(shared.data).playlists.length===2,'New owner preserves earlier changes when saving its own');
 const foreign=JSON.parse(shared.data);foreign.channels[0].description='Newer legacy tab';shared.data=JSON.stringify(foreign);check(!b.save()&&!b.active()&&JSON.parse(shared.data).channels[0].description===foreign.channels[0].description,'External old-version write stops stale saves instead of overwriting newer data');
 const closingStorage=storage(),closingLocks=lockManager(),owner=tab(closingStorage,closingLocks),cancelled=tab(closingStorage,closingLocks),successor=tab(closingStorage,closingLocks);await owner.acquire();const cancelledRequest=cancelled.acquire();await cancelled.release();const nextRequest=successor.acquire();await owner.release();check(await cancelledRequest===false&&!cancelled.active(),'Closing a waiting tab cancels its pending acquisition');check(await nextRequest&&successor.active(),'A cancelled waiter does not block the following tab');await successor.release();

 // Emulate atomic IndexedDB transactions; browser QA separately exercises the native API.
 const fallbackStorage=storage();let record=null,queue=Promise.resolve();const atomic=fn=>{const job=queue.then(()=>fn(record,{put:r=>record=r,delete:()=>record=null}));queue=job.catch(()=>{});return job};
 const c=tab(fallbackStorage,null),d=tab(fallbackStorage,null);c.setLease(atomic);d.setLease(atomic);await c.acquire();check(c.leaseMode()==='lease'&&c.active(),'IndexedDB ownership is used without Web Locks');check(await c.persist(),'Fallback commits small state through the atomic ownership transaction');
 record.until=start-1;check(await c.commit(()=>true)&&record.until>start,'A throttled owner safely renews an expired lease if nobody replaced it');
 const beforeHint=fallbackStorage.data;c.signalClose();check(fallbackStorage.data===beforeHint&&!!fallbackStorage.getItem('kadr.local.v1.writerClosed'),'Close notification leaves the durable save unchanged');
 d.wall(start+1000);await d.acquire();check(d.active(),'Close notification allows a successor before the lease timeout');
 const old=fallbackStorage.data;let wrote=false;check(!await c.commit(()=>{wrote=true;return true})&&!wrote&&!c.active()&&fallbackStorage.data===old,'A replaced lease refuses an obsolete writer before its storage callback runs');
 await d.resume();check(d.active()&&d.get().channels[0].id==='me','Fallback successor restores the existing channel');await d.release();check(record===null,'Closing the fallback owner releases its lease');

 const e=tab();await e.acquire();check(e.save(),'Initial durable checkpoint exists before a large write');const original=copy(e.get());let pendingTx=null;
 e.setDB({transaction(){const tx={objectStore(){return{put(){pendingTx=tx},openKeyCursor(){const r={result:null};queueMicrotask(()=>r.onsuccess?.());return r}}}};return tx}});
 e.get().channels[0].description='x'.repeat(4*1024*1024);const writing=e.persist();for(let i=0;i<8&&!pendingTx;i++)await Promise.resolve();check(!!pendingTx,'Large state starts a durable snapshot transaction');e.pause();pendingTx.oncomplete();check(!await writing,'A queued snapshot cannot commit after ownership is lost');await e.release();

 for(const [type,serial]of [['short',0],['short',1],['short',4],['video',0]]){
  const t=tab();t.fresh();t.own(type,serial);const initial=copy(t.get()),samples={};
  for(const [name,step]of [['online',2000],['offline',DAY]]){t.set(initial);t.wall(start);for(let at=start+step;at<=start+DAY;at+=step)t.tick(at);const s=t.get();samples[name]={views:s.videos[0].views,subscribers:s.channels[0].subscribers}}
  const difference=(key)=>Math.abs(samples.online[key]-samples.offline[key])/Math.max(1e-9,samples.online[key],samples.offline[key]);cadence.push({type,serial,...samples,viewsDifference:difference('views'),subscriberDifference:difference('subscribers')});
  check(difference('views')<.05,'Daily views stay within 5% across update cadences: '+type+'/'+serial);check(difference('subscribers')<.025,'Daily subscriber growth stays within 2.5% across update cadences: '+type+'/'+serial);
 }
 console.log(JSON.stringify({passed:results.length,results,cadence},null,2));
}
main().catch(e=>{console.error(e);console.error(JSON.stringify({passed:results.length,cadence}));process.exitCode=1});
