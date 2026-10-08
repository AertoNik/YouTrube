exec(open('work/test_engine.py').read().split('result=run(prefix+body+checks)')[0])
restore_checks=r'''
const results=[];function assert(b,m){if(!b)throw Error(m);results.push(m)}
document.querySelector=selector=>selector==='.modal'?null:{textContent:'',innerHTML:''};document.querySelectorAll=()=>[];toast=()=>{};closeModal=()=>{};render=()=>{};setTheme=()=>{};ImageStore.db={};ImageStore.available=false;let collected=0;ImageStore.collect=async()=>{collected++};
window.restoreTestPromise=(async()=>{
state=migrateState(freshState());state.simulation.speed=0;state.ecosystem.shortsSeeded=true;
const originalState=state;saveState(true);const raw=localStorage.data;
pendingImport=JSON.parse(JSON.stringify(state));pendingImport.userChannel=pendingImport.channels.find(c=>c.id==='me');pendingImport.userChannel.name='Новый канал';pendingAssets={};
const setter=localStorage.setItem;localStorage.setItem=()=>{throw Error('QuotaExceededError')};await actions.restore();
assert(state===originalState&&localStorage.data===raw,'Failed backup commit retains current state and stored source');assert(collected===0&&pendingImport!==null,'Failed commit keeps backup retryable and preserves image assets');localStorage.setItem=setter;
await actions.restore();assert(state.userChannel.name==='Новый канал'&&JSON.parse(localStorage.data).channels.find(c=>c.id==='me').name==='Новый канал','Successful restore commits imported state durably');assert(pendingImport===null&&collected===1,'Asset cleanup occurs only after successful commit');
const restoredState=state;pendingImport=JSON.parse(JSON.stringify(state));pendingImport.channels.find(c=>c.id==='me').avatar='asset:missing';pendingAssets={};let writes=0;const put=ImageStore.put;ImageStore.put=async()=>{writes++;return 'asset:new'};await actions.restore();assert(state===restoredState&&writes===0,'Missing backup images rejected before image writes or state replacement');ImageStore.put=put;
state.userChannel.avatar='data:image/png;base64,test';const inline=state.userChannel.avatar;await migrateImages();assert(state.userChannel.avatar===inline,'Unavailable IndexedDB retains inline legacy image data');
window.restoreTestResult=JSON.stringify({passed:results.length,results});
})().catch(e=>window.restoreTestResult=String(e));
})();
'''
run(prefix+body+restore_checks)
result=run('window.restoreTestResult')
print(result)
if not result.startswith('{'):raise Exception(result)
Path('work/restore-results.json').write_text(result)
