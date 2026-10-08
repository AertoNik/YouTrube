// Real elapsed intervals feed a bounded intensity multiplier, never an accelerated date.
let appReady=false;
function* simulationBatch(ms){
 const clock=state.simulation,wall=RealClock.now(),watermark=clock.lastSimulationTimestamp;
 const end=Math.min(wall,watermark+Math.max(0,ms));
 if(end<=watermark)return;
 const start=Math.max(watermark,end-CONFIG.offlineCap);
 clock.now=start;clock.intensity=clamp(clock.speed,0,20);npcPublishBudget=12;
 let cursor=start;
 while(cursor<end){
  // Split at real hour/day boundaries, including DST and fractional timezone offsets.
  const age=Math.min(...mine().map(v=>Math.max(0,cursor-v.publishedAt)),Infinity);
  const detailed=age<48*HOUR||cursor>=end-48*HOUR;
  const step=ms<=6*HOUR?5*60e3:detailed?HOUR:6*HOUR;
  const to=Math.min(end,cursor+step,detailed?nextLocalHour(cursor):Infinity,nextLocalDay(cursor));
  clock.now=to;
  if(clock.intensity>0){publishNPCDue(to);simulateStep(cursor,to)}
  cursor=to;clock.lastSimulationTimestamp=to;yield (cursor-start)/(end-start);
 }
 clock.now=end;clock.lastSimulationTimestamp=end;delete clock.intensity;
 // Schedule is real-time; a paused interval cannot produce catch-up publications later.
 fastForwardNPCSchedules(end);pruneNPC();syncChannelTotals();
}
advance=function(ms){for(const progress of simulationBatch(ms)){} };
settleTime=function(){advance(Math.max(0,RealClock.now()-state.simulation.lastSimulationTimestamp))};
async function settleBootTime(){
 const elapsed=Math.max(0,RealClock.now()-state.simulation.lastSimulationTimestamp);let lastYield=performance.now();
 for(const progress of simulationBatch(elapsed)){
  if(performance.now()-lastYield>50){const message=$('.boot-screen .muted');if(message)message.textContent='Восстанавливаем прогресс… '+Math.round(progress*100)+' %';await new Promise(resolve=>setTimeout(resolve,0));lastYield=performance.now()}
 }
}
