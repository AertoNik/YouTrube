from pathlib import Path
p=Path('outputs/index.html');s=p.read_text()
s=s.replace('<button class="btn create-top" data-action="create">','<button class="btn create-top" data-action="create" aria-label="Создать">')
s=s.replace("'<strong>'+", "'<strong>'+")
start=s.index('function analytics(v=null)');end=s.index('\nfunction speedSelect',start);fn=s[start:end]
bstart=fn.index('<div class="below-analytics">');bend=fn.rfind('`}')
bottom=fn[bstart:bend][:-6].replace('<div class="below-analytics">','<div class="below-analytics" id="analytics-bottom">')
bottom=bottom.replace('<strong>${formatNumber(v.views)}</strong>','<strong data-views="${v.id}">${formatViews(v.views)}</strong>')
fn=fn[:bstart]+'${analyticsBottom(vs,v)}</div>`}'
s=s[:start]+fn+'\nfunction analyticsBottom(vs,v){return `'+bottom+'`}'+s[end:]
s=s.replace('<div>${realtime(vs)}</div>', '<div id="dashboard-realtime">${realtime(vs)}</div>')
s=s.replace('if(rt)rt.innerHTML=realtime(vs)}}updateDebug()', 'if(rt)rt.innerHTML=realtime(vs);const bottom=$(\'#analytics-bottom\');if(bottom)bottom.outerHTML=analyticsBottom(vs,v)}}if(route===\'studio\'&&Date.now()-lastAnalyticsRender>5000){lastAnalyticsRender=Date.now();const rt=$(\'#dashboard-realtime\');if(rt)rt.innerHTML=realtime(mine())}updateDebug()')
# watch time axis uses hours, same unit as tooltip/cards.
s=s.replace('function chart(vs){const points=series(vs),', "function chart(vs){const points=series(vs).map(p=>({...p,value:chartMetric==='watchSeconds'?p.value/3600:p.value})),")
s=s.replace("(points[i].value/3600).toLocaleString", "points[i].value.toLocaleString")
# Labels inside thumbnail keep sufficient contrast on light compositions.
s=s.replace('fill="${p[2]}" font-family="Arial,sans-serif" font-weight="800"', 'fill="${v.seed%8===6?p[1]:p[2]}" font-family="Arial,sans-serif" font-weight="800"')
p.write_text(s)
print('Refined analytics refresh, mobile labels and chart units')
