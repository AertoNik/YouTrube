from pathlib import Path
parts=['// Run with Node.js: node tests-v3.cjs. No npm packages required.\nconst summaries=[];\nasync function main(){']
for filename,suite in [('test_v3.cjs','engine'),('test_v3_stress.cjs','stress'),('test_storage_v3.cjs','storage'),('test_restore_v3.cjs','restore')]:
 s=Path('work',filename).read_text()
 s=s.replace("fs.readFileSync('outputs/index.html','utf8')", "fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8')")
 if suite=='engine':
  s=s.replace("fs.writeFileSync('work/v3-results.json',JSON.stringify(context.window.v3Results,null,2));console.log(JSON.stringify(context.window.v3Results));", "summaries.push({suite:'engine',...context.window.v3Results});")
 elif suite=='stress':
  s=s.replace('fs.writeFileSync("work/v3-large-fixture.json",context.window.largeFixture);fs.writeFileSync("work/v3-stress-results.json",JSON.stringify(context.window.stressResults,null,2));console.log(JSON.stringify(context.window.stressResults));', "summaries.push({suite:'stress',...context.window.stressResults});")
 elif suite=='storage':
  s=s.replace('(async()=>{','await (async()=>{')
  s=s.replace("console.log(JSON.stringify({passed:results.length,results}));fs.writeFileSync('work/v3-storage-results.json',JSON.stringify({passed:results.length,results},null,2));", "summaries.push({suite:'storage',passed:results.length,results});")
  s=s.replace('})().catch(e=>{console.error(e);process.exitCode=1});','})();')
 if suite=='restore':
  s=s.replace('(async()=>{await context.window.restoreTestPromise;', 'await (async()=>{await context.window.restoreTestPromise;')
  s=s.replace('console.log(JSON.stringify(result));fs.writeFileSync("work/v3-restore-node-results.json",JSON.stringify(result,null,2));', "summaries.push({suite:'restore',...result});")
  s=s.replace('})().catch(e=>{console.error(e);process.exitCode=1});','})();')
 s=s.replace('crypto:globalThis.crypto', "crypto:require('node:crypto').webcrypto")
 parts.append('{\n'+s+'\n}')
parts.append("console.log(JSON.stringify({passed:summaries.reduce((n,x)=>n+x.passed,0),suites:summaries},null,2));\n}\nmain().catch(error=>{console.error(error);process.exitCode=1});\n")
Path('outputs/tests-v3.cjs').write_text('\n'.join(parts))
