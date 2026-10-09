from pathlib import Path
p=Path(__file__).parent
html=(p/'index-v3.1-backup.html').read_text()
def replace(a,b):
 global html
 assert a in html, a[:100]
 html=html.replace(a,b)
replace('</style>',(p/'social-v4.css').read_text()+'\n</style>')
replace('// APP INIT', (p/'social-v4.js').read_text()+'\n// APP INIT')
# Keep content facts inside the existing publication transaction.
replace("description:String(data.get('description')).trim(),category:","description:String(data.get('description')).trim(),contentFacts:String(data.get('contentFacts')||'').trim().slice(0,4000),category:")
replace('<div class="form-row"><div class="field"><label for="video-category">','<div class="field"><label for="video-facts">О чём это видео / Что происходит в видео</label><textarea class="input" id="video-facts" name="contentFacts" maxlength="4000" rows="4" placeholder="Укажите конкретные события, имена и факты. Можно по одному факту на строку.">${esc(v?.contentFacts||\'\')}</textarea><small>Необязательно. Виртуальные комментарии используют только эти сведения и описание. Если фактов мало, видимые сообщения не создаются.</small></div><div class="form-row"><div class="field"><label for="video-category">')
replace("if(moved){state.userChannel=channelBy('me');", "for(const p of state.community?.posts||[])if(p.image?.startsWith('data:')){const old=p.image,ref=await ImageStore.put(old,'legacy-post-'+hash(old));if(ref!==old){p.image=ref;moved++}}if(moved){state.userChannel=channelBy('me');")
replace("state.videos.forEach(v=>{if(v.thumbnail?.startsWith('asset:'))v.thumbnail=assetCache.get(v.thumbnail)||v.thumbnail});saveState(true)","state.videos.forEach(v=>{if(v.thumbnail?.startsWith('asset:'))v.thumbnail=assetCache.get(v.thumbnail)||v.thumbnail});state.community?.posts.forEach(p=>{if(p.image?.startsWith('asset:'))p.image=assetCache.get(p.image)||p.image});saveState(true)")
# Image references participate in the existing export/restore/collection transaction.
replace('try{const tx=this.db.transaction(\'images\',\'readwrite\'),store=tx.objectStore(\'images\');for(const ref of assetCache.keys())',"state.community?.posts.forEach(p=>{if(p.image?.startsWith('asset:'))used.add(p.image)});try{const tx=this.db.transaction('images','readwrite'),store=tx.objectStore('images');for(const ref of assetCache.keys())")
replace("const blob=new Blob([JSON.stringify(backup)]", "state.community?.posts.forEach(p=>{if(p.image?.startsWith('asset:'))backup.assets[p.image]=assetCache.get(p.image)});const blob=new Blob([JSON.stringify(backup)]")
replace('...imported.videos.map(v=>v.thumbnail)]','...imported.videos.map(v=>v.thumbnail),...(imported.community?.posts||[]).map(p=>p.image)]')
replace('  state=migrateState(imported);seedShortEcosystem();',"  for(const p of imported.community?.posts||[]){if(replacements.has(p.image))p.image=replacements.get(p.image);else if(p.image?.startsWith('data:'))p.image=await ImageStore.put(p.image,uid('restored'));}\n  state=migrateState(imported);seedShortEcosystem();")
replace("state.videos.push(v);notify('Опубликовано:", "initializeSocialVideo(v);state.videos.push(v);notify('Опубликовано:")
# Use the shared comment list, preserving aggregate counts and existing user records.
start=html.index('<div id="local-comments">')
end=html.index('</section>',start)
html=html[:start]+'${commentList(v)}</section>'+html[end+len('</section>'):]
replace("state.currentRoute=path;shell(path.startsWith('studio'));", "state.currentRoute=path;if(path.startsWith('channel/')&&readRoute().query.get('tab')==='community')channelTab='community';shell(path.startsWith('studio'));")
# Renaming invalidates the identity, even if it happens between simulation ticks.
replace("Object.assign(channelBy('me'),{name,handle,description:","checkVerificationName(channelBy('me'),name);Object.assign(channelBy('me'),{name,handle,description:")
# Inline badge in visible channel names only (never attributes or input values).
for a,b in [('<h1>${esc(c.name)}</h1>','<h1>${channelLabel(c)}</h1>'),('<h3>${esc(c.name)}</h3>','<h3>${channelLabel(c)}</h3>'),('${esc(c.name)}</a>','${channelLabel(c)}</a>'),('${esc(c.handle)}</a>${subscribeButton(c)}','${esc(c.handle)}${verifiedBadge(c)}</a>${subscribeButton(c)}')]:
 if a in html: html=html.replace(a,b)
replace('await settleBootTime();const offlineViews=', 'await settleBootTime();socialMaintenance();const offlineViews=')
(p.parent/'outputs/index.html').write_text(html)
print('Built YouTrube 4.0:',len(html.encode()),'bytes')
