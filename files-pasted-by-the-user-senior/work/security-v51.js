// Validate identifiers that are embedded in HTML attributes, including legacy data.
const validateBeforeSafety=validateImport;
validateImport=function(data){
 const fail=()=>{throw Error('Некорректные служебные данные резервной копии. Текущие данные сохранены.')};
 const identifier=x=>typeof x==='string'&&x.length<=160&&/^[-a-zA-Z0-9]+$/.test(x)&&!['constructor','prototype'].includes(x);
 const optionalId=x=>x===undefined||identifier(x),text=(x,n)=>typeof x==='string'&&x.length<=n,finite=x=>Number.isFinite(x)&&x>=0;
 const route=x=>text(x,512)&&/^[a-zA-Z0-9][a-zA-Z0-9/?=&%._~+-]*$/.test(x);
 if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.channels)||!Array.isArray(data.videos))fail();
 if(data.notifications!==undefined){
  if(!Array.isArray(data.notifications)||data.notifications.length>SOCIAL_LIMITS.notifications)fail();
  const ids=new Set();for(const n of data.notifications){if(!n||!optionalId(n.id)||!text(n.text,5000)||!route(n.route)||!finite(n.at)||typeof n.read!=='boolean'||n.id!==undefined&&ids.has(n.id))fail();if(n.id!==undefined)ids.add(n.id);else n.id=uid('notification');if(n.items!==undefined){if(!Array.isArray(n.items)||n.items.length>8||n.items.some(x=>!x||!text(x.text,5000)||!route(x.route)))fail()}if(n.count!==undefined&&!finite(n.count))fail()}
 }
 for(const c of data.channels)if(!c||!identifier(c.id)||!Number.isSafeInteger(c.seed)||c.seed<0||c.seed>0xffffffff||!CATEGORIES.includes(c.niche))fail();
 for(const v of data.videos){
  if(!v||!identifier(v.id))fail();
  if(v.localComments!==undefined){if(!Array.isArray(v.localComments)||v.localComments.length>100)fail();const ids=new Set();for(const x of v.localComments){if(!x||!optionalId(x.id)||!text(x.text,5000)||!text(x.author,200)||!finite(x.at)||x.id!==undefined&&ids.has(x.id))fail();if(x.id!==undefined)ids.add(x.id);else x.id=uid('comment')}}
  for(const x of [...(v.localComments||[]),...(Array.isArray(v.visibleComments)?v.visibleComments:[])]){if(!identifier(x.id))fail();for(const r of x.replies||[])if(!identifier(r.id))fail()}
 }
 return validateBeforeSafety(data);
};
