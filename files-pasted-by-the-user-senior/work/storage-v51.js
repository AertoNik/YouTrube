function queueStateSnapshot(serialized,revision){
 const job=stateWriteQueue.catch(()=>{}).then(async()=>{try{
  if(revision!==stateSaveRevision)return SessionCoordinator.allowed();if(!SessionCoordinator.check())return false;
  // The fallback performs even small localStorage writes inside the ownership transaction.
  if(serialized.length<=STATE_INLINE_LIMIT&&await SessionCoordinator.commit(()=>writeInlineState(serialized)))return true;
  if(!SessionCoordinator.allowed())return false;
  const db=await openStateDatabase(),id=uid('snapshot');
  await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(serialized,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
  if(revision!==stateSaveRevision)return SessionCoordinator.allowed();
  let oldRef=null;
  const committed=await SessionCoordinator.commit(()=>{if(revision!==stateSaveRevision)return true;const oldRaw=localStorage.getItem(CONFIG.key);oldRef=oldRaw?JSON.parse(oldRaw).snapshotRef:null;return writeInlineState(JSON.stringify({version:3,storage:'indexeddb',snapshotRef:id}))});
  if(!committed)throw Error('Не удалось сохранить указатель статистики');
  if(revision!==stateSaveRevision||!SessionCoordinator.allowed())return true;
  try{const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots'),req=store.openKeyCursor();req.onsuccess=()=>{const cursor=req.result;if(cursor){if(cursor.key!==id&&cursor.key!==oldRef)store.delete(cursor.key);cursor.continue()}}}catch{}
  return true;
 }catch{storageFailed=true;if(SessionCoordinator.allowed())storageMessage('Не удалось сохранить статистику. Предыдущее сохранение осталось целым; экспортируйте текущие данные в настройках.');return false}});
 stateWriteQueue=job;return job;
}
async function persistState(){clearTimeout(saveTimer);saveTimer=null;if(!SessionCoordinator.check())return false;const revision=++stateSaveRevision,serialized=JSON.stringify(packState(state));if(serialized.length<=STATE_INLINE_LIMIT&&writeInlineState(serialized))return true;return queueStateSnapshot(serialized,revision)}
saveState=function(immediate=false){if(!SessionCoordinator.check())return false;if(!immediate){if(!saveTimer)saveTimer=setTimeout(()=>saveState(true),2500);return true}clearTimeout(saveTimer);saveTimer=null;const revision=++stateSaveRevision,serialized=JSON.stringify(packState(state));if(serialized.length<=STATE_INLINE_LIMIT&&writeInlineState(serialized))return true;queueStateSnapshot(serialized,revision);return false};
