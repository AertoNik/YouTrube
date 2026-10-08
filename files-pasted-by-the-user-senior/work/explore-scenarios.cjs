const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const html=fs.readFileSync('outputs/index.html','utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const source=script.slice(0,script.indexOf('// APP INIT'));
let now=Date.UTC(2026,9,8,12),clock=class extends Date{static now(){return now}};
const storage={data:null,getItem(){return this.data},setItem(k,v){this.data=v}};
const document={addEventListener(){},querySelector(){return{innerHTML:'',textContent:'',querySelector(){return null},querySelectorAll(){return[]},classList:{remove(){},toggle(){}}}},querySelectorAll(){return[]},body:{classList:{remove(){},toggle(){}}}};
const context=vm.createContext({document,window:{addEventListener(){},scrollTo(){}},location:{hash:'#/studio/content'},localStorage:storage,Date:clock,performance,console,setInterval(){},setTimeout(){return 1},clearTimeout(){},matchMedia(){return{matches:false}},crypto:globalThis.crypto,URLSearchParams,Map,Set});

const body=`
const result={};for(const scenario of ['normal','slow','evergreen','failed','viral']){state=migrateState(freshState());state.videos=[];for(const c of state.channels)c.nextUploadAt=state.simulation.now+10000*DAY;state.ecosystem.shortsSeeded=true;const c=channelBy('me'),v=makeNPCPublication(c,2,state.simulation.now,'video');v.id='own';Object.assign(v.params,{contentQuality:.94,clickability:.94,retentionPotential:.80,audienceFit:.94,potential:1.3,evergreenFactor:.85});state.videos.push(v);initializeDistribution(v,c);v.distribution.scenario=scenario;const daily=[];for(let day=0;day<30;day++){const before=v.views;advance(DAY);daily.push(Math.round(v.views-before))}result[scenario]=daily;}window.explore=result;
`;
vm.runInContext(source+body+'\n})();',context,{timeout:60000});console.log(context.window.explore);
