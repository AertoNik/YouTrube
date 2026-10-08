// Browser calendar helpers use local civil dates; durations use absolute milliseconds.
const HOUR=3600e3;
const RealClock={now:()=>Date.now()};
function localDay(t){const d=new Date(t);d.setHours(0,0,0,0);return +d}
function localHour(t){const d=new Date(t);return t-(d.getMinutes()*60+d.getSeconds())*1000-d.getMilliseconds()}
function nextLocalHour(t){return localHour(t)+HOUR}
function nextLocalDay(t){const d=new Date(t);d.setHours(24,0,0,0);return +d}
function calendarCutoff(days,until=RealClock.now()){const d=new Date(until);d.setHours(0,0,0,0);d.setDate(d.getDate()-Math.max(0,days-1));return +d}
function dateTimeLabel(t,hourly=false){return new Date(t).toLocaleString('ru-RU',hourly?{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}:{day:'numeric',month:'short',year:'numeric'})}
function publicationRelativeText(v){return (v.dateStatus==='estimated'?'≈ ':'')+formatRelativeTime(v.publishedAt)}
function publicationRelative(v){return `<span data-publication-age="${v.id}" title="${esc(dateTimeLabel(v.publishedAt,true)+(v.dateStatus==='estimated'?' · приблизительная дата':''))}">${publicationRelativeText(v)}</span>`}
function publicationDate(v){return date(v.publishedAt)+(v.dateStatus==='estimated'?' · приблизительно':'')}
function dateInputValue(t){const d=new Date(t),pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())}
// No invented reconstruction of historical view dates: retain the entire old journal.
const migrateBeforeCalendar=migrateState;
migrateState=function(s){
 const modern=s.calendarVersion===1;const virtual=s.simulation.now,wall=RealClock.now(),anchor=Math.min(wall,s.simulation.lastSimulationTimestamp),offset=virtual-anchor;
 migrateBeforeCalendar(s);if(modern)return s;
 const estimated=t=>Math.max(0,Math.min(anchor,t-offset));
 s.legacyCalendar={virtualNow:virtual,lastRealTimestamp:s.simulation.lastSimulationTimestamp,migratedAt:wall};
 for(const v of s.videos){
  v.legacyCalendar={publishedAt:v.publishedAt,history:v.history,commentDates:v.localComments.map(x=>({id:x.id,at:x.at}))};
  const trusted=v.realPublishedAt??v.realCreatedAt;
  v.publishedAt=Number.isFinite(trusted)&&trusted>0&&trusted<=wall?trusted:estimated(v.publishedAt);
  v.dateStatus=Number.isFinite(trusted)&&trusted>0&&trusted<=wall?'real':'estimated';v.history=[];
  for(const comment of v.localComments)comment.at=estimated(comment.at);
  const d=v.distribution;d.startedAt=estimated(d.startedAt);d.lastDecisionAt=anchor;d.nextRetestAt=Math.max(anchor,v.publishedAt+8*DAY)+Math.max(0,d.nextRetestAt-virtual);d.lastRediscoveryDay=-1;
  for(const w of d.waves)w.at=estimated(w.at);
 }
 for(const c of s.channels){
  const p=c.audienceProfile;p.legacyCalendar={trackingSince:p.trackingSince,history:p.history,lifetime:p.lifetime};p.history=[];p.lifetime=null;p.trackingSince=anchor;p.lastDecayAt=anchor;p.lastPublishedAt=Math.max(0,...s.videos.filter(v=>v.channelId===c.id).map(v=>v.publishedAt));
  for(const co of p.cohorts)co.at=estimated(co.at);
  if(c.id!=='me'){c.legacyNextUploadAt=c.nextUploadAt;c.nextUploadAt=anchor+Math.max(0,c.nextUploadAt-virtual);for(const row of c.publicationHistory||[]){row.legacyAt=row.at;row.at=estimated(row.at)}}
  c.legacyCreatedAt=c.createdAt;c.createdAt=estimated(c.createdAt);
 }
 for(const list of [s.history,s.user.shortHistory,s.notifications])for(const row of list||[]){const key='timestamp' in row?'timestamp':'at';row.legacyTimestamp=row[key];row[key]=estimated(row[key])}
 s.simulation.now=anchor;s.simulation.lastSimulationTimestamp=anchor;s.calendarVersion=1;
 return s;
};
const freshBeforeCalendar=freshState;
freshState=function(){const s=freshBeforeCalendar();s.calendarVersion=1;for(const v of s.videos)v.dateStatus='real';return s};
const npcBeforeCalendar=makeNPCPublication;
makeNPCPublication=function(c,index,at,type,initial=false){const v=npcBeforeCalendar(c,index,Math.min(RealClock.now(),at),type,initial);v.dateStatus='real';return v};
// Local hourly buckets preserve the repeated hour's distinct timestamp at DST fall-back.
historyAdd=function(v,t,d){
 t=Math.min(t,RealClock.now());const bucket=localHour(t);let h=v.history.at(-1);if(h?.timestamp!==bucket)h=v.history.find(row=>row.timestamp===bucket);
 if(!h){h={timestamp:bucket,views:0,impressions:0,likes:0,subscribersGained:0,watchSeconds:0,shownInFeed:0,viewedExposures:0,swipedAway:0,rewatches:0};v.history.push(h);v.history.sort((a,b)=>a.timestamp-b.timestamp)}
 for(const [k,n] of Object.entries(d))h[k]=(h[k]||0)+n;
 if(v.history.length>110){const cutoff=RealClock.now()-48*HOUR,merged=new Map();for(const row of v.history){const at=row.timestamp<cutoff?localDay(row.timestamp):row.timestamp,old=merged.get(at)||{timestamp:at};for(const [k,n] of Object.entries(row))if(k!=='timestamp')old[k]=(old[k]||0)+n;merged.set(at,old)}v.history=[...merged.values()].sort((a,b)=>a.timestamp-b.timestamp);if(v.history.length>145){const removed=v.history.splice(0,v.history.length-144);v.historyRollup??={};for(const row of removed)for(const [k,n] of Object.entries(row))if(k!=='timestamp')v.historyRollup[k]=(v.historyRollup[k]||0)+n}}
};
series=function(vs,days=period,metric=chartMetric){
 const now=RealClock.now(),earliest=Math.min(now,...vs.map(v=>v.publishedAt)),hourly=vs.length===1&&now-earliest<=48*HOUR;
 const start=hourly?localHour(earliest):days?calendarCutoff(days,now):Math.max(localDay(earliest),calendarCutoff(90,now));const points=[];
 for(let t=start;t<=now&&points.length<100;t=hourly?t+HOUR:nextLocalDay(t))points.push({t,value:0,hourly});
 if(!points.length)points.push({t:localDay(now),value:0,hourly:false});
 for(const v of vs)for(const h of v.history){if(h.timestamp<start||h.timestamp>now)continue;const key=hourly?localHour(h.timestamp):localDay(h.timestamp),p=points.find(x=>x.t===key);if(p)p.value+=h[metric]||0}
 return points;
};
realtime=function(vs){
 const end=localHour(RealClock.now()),start=end-47*HOUR,points=Array.from({length:48},(_,i)=>({at:start+i*HOUR,views:0}));
 for(const v of vs)for(const h of v.history){const i=Math.floor((h.timestamp-start)/HOUR);if(i>=0&&i<48&&h.timestamp<=RealClock.now())points[i].views+=h.views||0}
 const total=points.reduce((n,h)=>n+h.views,0),max=Math.max(1,...points.map(h=>h.views));return `<div class="panel realtime-panel"><h3>В реальном времени</h3><p class="tiny muted"><span class="realtime-dot"></span>Реальные часы · последние 48 часов</p><div class="rt-number">${formatNumber(channelBy('me').subscribers)}</div><p class="tiny muted">Подписчиков на канале</p><hr class="divider"><strong>${exact(total)}</strong><span class="tiny muted"> просмотров · 48 часов</span><div class="bars">${points.map(h=>`<div class="bar" style="height:${Math.max(2,h.views/max*100)}%" title="${esc(dateTimeLabel(h.at,true))}: ${exact(h.views)} просмотров"></div>`).join('')}</div><div class="row between tiny muted"><span>${dateTimeLabel(start,true)}</span><span>Сейчас</span></div></div>`
};
const contentBeforeCalendar=contentPage;
contentPage=function(){let html=contentBeforeCalendar();for(const v of mine())if(v.dateStatus==='estimated')html=html.replace(`<td data-label="Дата">${publicationDate(v)}</td>`,`<td data-label="Дата">${date(v.publishedAt)}<br><small class="muted">Приблизительная дата</small><br>${btn('correct-date','Уточнить дату','','outline',`data-id="${v.id}"`)}</td>`);return html};
const analyticsBeforeCalendar=analytics;
analytics=function(v=null){let html=analyticsBeforeCalendar(v);const vs=v?[v]:mine();if(vs.some(x=>x.legacyCalendar))html=html.replace('<div class="studio-page">','<div class="studio-page"><p class="audience-note">Статистика до исправления календаря сохранена в итогах и резервной копии. Её даты недостоверны, поэтому старые просмотры не распределяются по реальным дням.</p>');if(v?.dateStatus==='estimated')html=html.replace('<div class="studio-actions">',`<div class="studio-actions">${btn('correct-date','Уточнить дату','','outline',`data-id="${v.id}"`)}`);return html};
function parseLocalPublicationDate(value){if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value))throw Error('Укажите дату и время.');const t=+new Date(value);if(!Number.isFinite(t)||dateInputValue(t)!==value)throw Error('Такого местного времени не существует. Проверьте дату и переход летнего времени.');return t}
function correctPublicationDate(v,t){if(!v||v.channelId!=='me'||v.dateStatus!=='estimated')throw Error('Дата этой публикации уже подтверждена.');if(!Number.isFinite(t)||t<=0||t>RealClock.now())throw Error('Укажите реальную дату не позднее текущего времени.');v.publishedAt=t;v.dateStatus='corrected';v.dateCorrectedAt=RealClock.now();channelBy('me').audienceProfile.lastPublishedAt=Math.max(0,...mine().map(x=>x.publishedAt))}
actions['correct-date']=b=>{const v=videoBy(b.dataset.id);if(v?.dateStatus!=='estimated')return;openModal('Уточнить дату публикации',`<form id="date-correction" data-id="${v.id}"><p class="audience-note">Дата восстановлена из старых виртуальных часов приблизительно. Укажите фактический день и время публикации в вашем местном часовом поясе. Просмотры, подписчики и изображения сохранятся.</p><div class="field"><label for="publication-date">Дата и время публикации</label><input class="input" id="publication-date" name="publicationDate" type="datetime-local" value="${dateInputValue(v.publishedAt)}" max="${dateInputValue(RealClock.now())}" required></div><p id="date-error" role="alert"></p>${btn('','Сохранить дату','','primary','type="submit"')}</form>`,'',true)};
document.addEventListener('submit',e=>{if(e.target.id!=='date-correction')return;e.preventDefault();try{const value=e.target.elements.publicationDate.value;correctPublicationDate(videoBy(e.target.dataset.id),parseLocalPublicationDate(value));saveState(true);closeModal();renderContent();toast('Дата публикации уточнена')}catch(error){$('#date-error').textContent=error.message}});
const validateBeforeCalendar=validateImport;
validateImport=function(data){if(data.calendarVersion!==undefined&&data.calendarVersion!==1)throw Error('Неизвестная версия календаря.');if(data.calendarVersion===1)for(const v of data.videos||[])if(!['real','estimated','corrected'].includes(v.dateStatus))throw Error('Не указан источник даты публикации.');return validateBeforeCalendar(data)};

// Calendar labels refresh even when statistical growth is paused.
const updateBeforeCalendar=updateLive;
updateLive=function(){for(const el of $$('[data-publication-age]')){const v=videoBy(el.dataset.publicationAge);if(v)el.textContent=publicationRelativeText(v)}updateBeforeCalendar()};
