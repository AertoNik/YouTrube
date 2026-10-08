from pathlib import Path
p=Path('outputs/index.html');s=p.read_text()
a=s.index('actions.restore=async function(){',s.index('// IMAGES:'))
b=s.index('\n\n// SHORTS DISTRIBUTION',a)
s=s[:a]+'''actions.restore=async function(){
 if(!pendingImport)return;
 const previousState=state,imported=JSON.parse(JSON.stringify(pendingImport)),modal=$('.modal');
 if(modal?.dataset.busy==='true')return;
 if(modal){modal.dataset.busy='true';$$('button',modal).forEach(b=>b.disabled=true)}
 try{
  if(!ImageStore.db)await ImageStore.open();
  const allRefs=[...imported.channels.flatMap(c=>[c.avatar,c.banner]),...imported.videos.map(v=>v.thumbnail)].filter(x=>x?.startsWith('asset:'));
  for(const [ref,data] of Object.entries(pendingAssets))if(!/^asset:[a-zA-Z0-9-]+$/.test(ref)||!/^data:image\\/(webp|png|jpeg|gif)[;,]/.test(data||''))throw Error('Некорректное изображение в резервной копии.');
  if(allRefs.some(ref=>!pendingAssets[ref]&&!assetCache.has(ref)))throw Error('В резервной копии отсутствуют изображения. Текущие данные сохранены.');
  const replacements=new Map();
  for(const ref of new Set(allRefs))if(pendingAssets[ref])replacements.set(ref,await ImageStore.put(pendingAssets[ref],uid('restored')));
  for(const c of imported.channels)for(const k of ['avatar','banner']){
   if(replacements.has(c[k]))c[k]=replacements.get(c[k]);
   else if(c[k]?.startsWith('data:'))c[k]=await ImageStore.put(c[k],uid('restored'));
  }
  for(const v of imported.videos){
   if(replacements.has(v.thumbnail))v.thumbnail=replacements.get(v.thumbnail);
   else if(v.thumbnail?.startsWith('data:'))v.thumbnail=await ImageStore.put(v.thumbnail,uid('restored'));
  }
  state=migrateState(imported);seedShortEcosystem();settleTime();syncChannelTotals();
  if(!saveState(true))throw Error('Не удалось сохранить резервную копию. Текущие данные сохранены; освободите место в хранилище браузера.');
  pendingImport=null;pendingAssets={};imageCache.clear();await ImageStore.collect();
  if(modal)modal.dataset.busy='false';closeModal();setTheme(state.preferences.theme);render();toast('Данные и изображения восстановлены');
 }catch(e){state=previousState;toast(e.message)}
 finally{if(modal?.isConnected){modal.dataset.busy='false';$$('button',modal).forEach(b=>b.disabled=false)}}
};'''+s[b:];p.write_text(s)
