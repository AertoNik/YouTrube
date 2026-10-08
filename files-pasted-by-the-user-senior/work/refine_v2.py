from pathlib import Path
p=Path('work/extension.js');s=p.read_text()
s=s.replace("initializeShort(v,false);", "{v.shortParams??=shortParameters(v,s.channels.find(c=>c.id===v.channelId));initializeShort(v,false);}")
s=s.replace("toast('Image storage is full. Изображение сохранено в резервном формате.')", "toast('Изображение сохранено в резервном формате.')")
s=s.replace("const refs=state.userChannel;state.userChannel=", "state.userChannel=")
s=s.replace("if(id&&(!target||!isShort(target)))", "if(id&&(!target||!isShort(target)||(target.visibility==='private'&&target.channelId!=='me')))")
s=s.replace("viewed=resolved?s.viewedExposures/resolved:0,average=", "viewed=resolved?s.viewedExposures/resolved:0,swiped=resolved?s.swipedAway/resolved:0,average=")
s=s.replace("pct(1-viewed)","pct(swiped)").replace("(1-viewed)*100", "swiped*100")
s=s.replace("if(!isShort(analyticsFocus))return baseStatCards(stats,video);", "if(!isShort(analyticsFocus)&&readRoute().query.get('type')!=='shorts')return baseStatCards(stats,video).replace('Показы</label>','Показы видео</label>').replace('CTR значков</label>','CTR значков видео</label>');")
s=s.replace("if(chartMetric==='shownInFeed'&&!isShort(v))", "if(chartMetric==='shownInFeed'&&!isShort(v)&&readRoute().query.get('type')!=='shorts')")
s=s.replace("SHORTS / YOUTRUBE", "SHORTS / YouTrube")
s=s.replace("banner=c.banner?safeImage(c.banner):art(", "banner=safeImage(c.banner)||art(")
s=s.replace("else body=grid(channelTab", "else body=(channelTab==='home'&&!videos.length&&shorts.length?'':grid(channelTab")
s=s.replace("'create':'home')+(channelTab==='home'?", "'create':'home'))+(channelTab==='home'?")
s=s.replace("if(!state?.currentRoute.startsWith('shorts')||$('.modal')||", "if(!state?.currentRoute.startsWith('shorts')||$('.modal')||$('.dropdown')||(e.key===' '&&/BUTTON|A/.test(e.target.tagName))||")
# Stop catch-up publication storms after a capped offline batch.
s += """\nfunction fastForwardNPCSchedules(now){for(const c of state.channels)if(c.id!=='me'&&c.nextUploadAt<=now)c.nextUploadAt=now+(0.3+seeded(c.seed,'catchup'+Math.floor(now/864e5)))*864e5/Math.max(1,c.uploadFrequency)}
const baseAvatar=avatar;avatar=function(c,cls=''){return baseAvatar({...c,avatar:safeImage(c.avatar)||null},cls)};
"""
s=s.replace("c.nextUploadAt=at+(1.3+seeded", "c.nextUploadAt=at+(1.3+seeded")
# Preserve UI if image storage is unavailable; metadata refs stay untouched.
s=s.replace("this.available=true;await this.hydrate()", "this.available=true;await this.hydrate()")
# Limit startup cache to referenced records after migration.
s=s.replace("for(const ref of assetCache.keys())if(!used.has(ref))", "for(const ref of assetCache.keys())if(!used.has(ref))")
p.write_text(s)
p=Path('work/upgrade.py');s=p.read_text()
needle="p.write_text(s)"
extra=r'''s=s.replace("if(v.thumbnail)return safeImage(v.thumbnail);", "const resolved=safeImage(v.thumbnail);if(resolved)return resolved;")
s=s.replace("state.simulation.now=end;pruneNPC();", "state.simulation.now=end;fastForwardNPCSchedules(end);pruneNPC();")
s=s.replace("if(!['public','unlisted','private'].includes(v.visibility))", "if(!['public','unlisted','private'].includes(v.visibility))")
s=s.replace("v.tags.some(x=>typeof x!=='string')||", "v.tags.some(x=>typeof x!=='string')||(v.type&&!['video','short'].includes(v.type))||")
s=s.replace("const beforeViews=mine()", "await ImageStore.collect();const beforeViews=mine()")
s=s.replace("${c.banner?safeImage(c.banner):art(", "${safeImage(c.banner)||art(")
s=s.replace("c.banner?safeImage(c.banner):art(", "safeImage(c.banner)||art(")
s=s.replace("YOUTRUBE / КАНАЛ", "YouTrube / КАНАЛ")
s=s.replace('<span>Показы</span><strong data-impressions="${latest.id}">${exact(latest.impressions)}</strong>', '<span>${isShort(latest)?\'Показано в ленте\':\'Показы\'}</span><strong data-${isShort(latest)?\'shown\':\'impressions\'}="${latest.id}">${exact(isShort(latest)?latest.shortStats.shownInFeed:latest.impressions)}</strong>')
s=s.replace('<span>CTR</span><strong>${pct(latest.params.ctr)}</strong>', '<span>${isShort(latest)?\'Продолжили смотреть\':\'CTR\'}</span><strong>${pct(isShort(latest)?latest.shortParams.viewedRate:latest.params.ctr)}</strong>')
s=s.replace('${formatDuration(latest.duration*latest.params.retention)}', '${formatDuration(isShort(latest)?(latest.views?latest.watchSeconds/latest.views:0):latest.duration*latest.params.retention)}')
s=s.replace("set('[data-impressions]',", "set('[data-shown]',el=>exact(videoBy(el.dataset.shown)?.shortStats?.shownInFeed));set('[data-impressions]',")
'''
s=s.replace(needle,extra+'\n'+needle)
p.write_text(s)
