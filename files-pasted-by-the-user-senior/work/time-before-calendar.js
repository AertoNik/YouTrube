// One clock and one batch algorithm for online updates and cooperative offline loading.
let appReady=false;
function* simulationBatch(ms){
 ms=clamp(ms,0,CONFIG.offlineCap);if(!ms)return;npcPublishBudget=12;
 let cursor=state.simulation.now;const from=cursor,end=cursor+ms,step=Math.max(15*60e3,ms/144);
 while(cursor<end){const to=Math.min(end,cursor+step);state.simulation.now=to;publishNPCDue(to);simulateStep(cursor,to);cursor=to;yield (cursor-from)/ms}
 state.simulation.now=end;fastForwardNPCSchedules(end);pruneNPC();syncChannelTotals();
}
advance=function(ms){for(const progress of simulationBatch(ms)){} };
async function settleBootTime(){
 const now=Date.now(),elapsed=clamp(now-state.simulation.lastSimulationTimestamp,0,864e5*7);let lastYield=performance.now();
 for(const progress of simulationBatch(elapsed*CONFIG.timeScale*state.simulation.speed)){
  if(performance.now()-lastYield>50){const message=$('.boot-screen .muted');if(message)message.textContent='Восстанавливаем прогресс… '+Math.round(progress*100)+' %';await new Promise(resolve=>setTimeout(resolve,0));lastYield=performance.now()}
 }
 state.simulation.lastSimulationTimestamp=now;
}
