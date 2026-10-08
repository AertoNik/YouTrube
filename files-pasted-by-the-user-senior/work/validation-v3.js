const validateImportV2=validateImport;
function finiteRange(n,min=0,max=1e16){return Number.isFinite(n)&&n>=min&&n<=max}
function validCounts(map){return map&&typeof map==='object'&&!Array.isArray(map)&&Object.values(map).every(n=>finiteRange(n))}
validateImport=function(data){
 unpackState(data);const imported=validateImportV2(data);
 for(const c of imported.channels){
  const p=c.audienceProfile;
  if(!Array.isArray(p.cohorts)||!p.cohorts.length||p.cohorts.length>32||new Set(p.cohorts.map(co=>co.id)).size!==p.cohorts.length||!Array.isArray(p.history)||p.history.length>101)throw Error('Некорректная модель аудитории');
  for(const k of ['trackingSince','baselineViewers','lastDecayAt','lastPublishedAt'])if(!finiteRange(p[k]))throw Error('Некорректная история аудитории');
  for(const k of ['returnProbability','topicTolerance','audienceTrust','longTermSatisfaction','nicheConsistency','loyalty'])if(!finiteRange(p[k],0,1))throw Error('Некорректные предпочтения аудитории');
  for(const k of ['subscribePropensity','likePropensity'])if(!finiteRange(p[k],0,2))throw Error('Некорректная склонность аудитории к взаимодействиям');
  if(!p.formatPreference||!finiteRange(p.formatPreference.short,0,1)||!finiteRange(p.formatPreference.video,0,1)||Math.abs(p.formatPreference.short+p.formatPreference.video-1)>1e-6||!p.topicAffinity||CATEGORIES.some(cat=>!finiteRange(p.topicAffinity[cat],0,1)))throw Error('Некорректные интересы аудитории');
  for(const co of p.cohorts){if(typeof co.id!=='string'||!finiteRange(co.at)||!['video','short','mixed'].includes(co.format))throw Error('Некорректная группа зрителей');for(const k of AUDIENCE_GROUPS)if(!finiteRange(co.groups?.[k])||!finiteRange(co.subscribed?.[k])||co.subscribed[k]>co.groups[k]+1e-6)throw Error('Некорректный состав аудитории')}
  if(Math.abs(audienceTotals(c).subscribers-c.subscribers)>Math.max(1e-5,c.subscribers*1e-7))throw Error('Подписчики не согласованы с аудиторией');
  for(const row of [...p.history,...(p.lifetime?[p.lifetime]:[])]){
   if(!finiteRange(row.at)||!row.byFormat||!validCounts(row.pools)||!validCounts(row.stocks))throw Error('Некорректная аналитика аудитории');
   for(const f of ['video','short']){const x=row.byFormat[f];for(const k of ['views','newViewers','subscriberViews','repeatViews','subscribersGained'])if(!finiteRange(x?.[k]))throw Error('Некорректная статистика зрителей');if(!validCounts(x.reach)||!validCounts(x.births)||x.subscriberViews>x.views+1e-6||x.repeatViews+x.newViewers>x.views+1e-6)throw Error('Некорректная история зрителей')}
  }
 }
 for(const v of imported.videos){
  const d=v.distribution;if(!d.feedback||!Array.isArray(d.waves)||d.waves.length>8||!['normal','failed','slow','viral','evergreen'].includes(d.scenario))throw Error('Некорректные параметры распространения');
  for(const k of ['samples','reachScale','nextRetestAt','startedAt','lastDecisionAt','initialAudience','initialFit','legacyViews','legacyWatchSeconds'])if(!finiteRange(d[k]))throw Error('Некорректные параметры алгоритма');
  for(const k of ['ctr','retention','viewedRate','completion','rewatch','engagement','satisfaction','audienceFit','score'])if(!finiteRange(d.feedback[k],0,3))throw Error('Некорректная обратная связь');
  for(const w of d.waves)if(!finiteRange(w.at)||!finiteRange(w.duration,1)||!finiteRange(w.strength)||!['related','search','retest'].includes(w.reason))throw Error('Некорректная история повторного продвижения');
  for(const k of ['newViewers','returningVisits','uniqueViewers','subscriberViews','nonSubscriberViews','repeatViews','impressionClicks','trackedViews'])if(!finiteRange(v.audienceStats?.[k]))throw Error('Некорректная статистика публикации');
 }
 return imported;
};
