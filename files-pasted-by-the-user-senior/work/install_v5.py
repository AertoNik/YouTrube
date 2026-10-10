from pathlib import Path
p=Path(__file__).parent
html=(p/'index-v4-backup.html').read_text()
def replace(a,b):
 global html
 assert a in html,a[:100]
 html=html.replace(a,b)
replace('</style>',(p/'creator-v5.css').read_text()+'\n</style>')
replace('// APP INIT',(p/'creator-v5.js').read_text()+'\n// APP INIT')
replace("else if(path==='studio')html=dashboard();","else if(path.startsWith('playlist/'))html=playlistPage(playlistBy(path.slice(9)));else if(path==='playlists')html=playlistLibrary();else if(path==='studio/earn')html=earnPage();else if(path==='studio')html=dashboard();")
replace("location.replace('#/shorts/'+path.slice(6));", "location.replace('#/shorts/'+path.slice(6)+(location.hash.includes('?')?'?'+location.hash.split('?')[1]:''));")
replace("readRoute().query.get('tab')==='community')channelTab='community';", "['community','playlists'].includes(readRoute().query.get('tab')))channelTab=readRoute().query.get('tab');")
replace("${navItem('studio/customization','Настройка канала'", "${navItem('studio/earn','Монетизация','analytics',route==='studio/earn')}${navItem('studio/customization','Настройка канала'")
replace("${navItem('later','Смотреть позже','clock',route==='later')}","${navItem('later','Смотреть позже','clock',route==='later')}${navItem('playlists','Плейлисты','content',route==='playlists'||route.startsWith('playlist/'))}")
replace("${menuItem('share','Поделиться','share',attrs)}`)", "${menuItem('save-playlist','Сохранить в плейлист','content',attrs)}${menuItem('share','Поделиться','share',attrs)}`)")
# All Shorts qualification comes from engaged Feed exposures, never loops or external sources.
replace('viewedExposures:viewed,swipedAway:swiped,rewatches,newViewers:', 'viewedExposures:viewed,qualifiedFeedViews:viewed*feed,swipedAway:swiped,rewatches,newViewers:')
replace('{views,watchSeconds:watch,viewedExposures:viewed,rewatches}', '{views,watchSeconds:watch,viewedExposures:viewed,qualifiedFeedViews:viewed,rewatches}')
replace("if(location.hash!=='#/shorts/'+id)history.replaceState(null,'','#/shorts/'+id);", "const playlist=readRoute().query.get('playlist'),shortURL='#/shorts/'+id+(playlist?'?playlist='+encodeURIComponent(playlist):'');if(location.hash!==shortURL)history.replaceState(null,'',shortURL);")
replace('if(state.preferences.shortAutoplay){shortStep(1);shortPlayback.playing=false}',"if(playlistContext()){shortPlayback.playing=false;playlistEnded(v.id)}else if(state.preferences.shortAutoplay){shortStep(1);shortPlayback.playing=false}")
replace("if(player.time>=v.duration)player.playing=false;", "if(player.time>=v.duration){player.playing=false;playlistEnded(v.id)}")
replace("if(moved){state.userChannel=channelBy('me');", "for(const p of state.playlists||[])if(p.cover?.startsWith('data:')){const old=p.cover,ref=await ImageStore.put(old,'legacy-playlist-'+hash(old));if(ref!==old){p.cover=ref;moved++}}if(moved){state.userChannel=channelBy('me');")
replace("state.community?.posts.forEach(p=>{if(p.image?.startsWith('asset:'))p.image=assetCache.get(p.image)||p.image});saveState(true)","state.community?.posts.forEach(p=>{if(p.image?.startsWith('asset:'))p.image=assetCache.get(p.image)||p.image});state.playlists?.forEach(p=>{if(p.cover?.startsWith('asset:'))p.cover=assetCache.get(p.cover)||p.cover});saveState(true)")
replace("try{const tx=this.db.transaction('images','readwrite'),store=tx.objectStore('images');for(const ref of assetCache.keys())","state.playlists?.forEach(p=>{if(p.cover?.startsWith('asset:'))used.add(p.cover)});try{const tx=this.db.transaction('images','readwrite'),store=tx.objectStore('images');for(const ref of assetCache.keys())")
replace('const blob=new Blob([JSON.stringify(backup)]',"state.playlists?.forEach(p=>{if(p.cover?.startsWith('asset:'))backup.assets[p.cover]=assetCache.get(p.cover)});const blob=new Blob([JSON.stringify(backup)]")
replace('...(imported.community?.posts||[]).map(p=>p.image)]','...(imported.community?.posts||[]).map(p=>p.image),...(imported.playlists||[]).map(p=>p.cover)]')
replace('  state=migrateState(imported);seedShortEcosystem();',"  for(const p of imported.playlists||[]){if(replacements.has(p.cover))p.cover=replacements.get(p.cover);else if(p.cover?.startsWith('data:'))p.cover=await ImageStore.put(p.cover,uid('restored'));}\n  state=migrateState(imported);seedShortEcosystem();")
replace('await settleBootTime();socialMaintenance();','await settleBootTime();socialMaintenance();earnMaintenance();')
replace("initializeSocialVideo(v);state.videos.push(v);", "initializeSocialVideo(v);initializeEarningVideo(v);state.videos.push(v);")
(p.parent/'outputs/index.html').write_text(html)
print('Built YouTrube 5.0:',len(html.encode()),'bytes')
