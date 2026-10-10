from pathlib import Path

ROOT = Path(__file__).resolve().parent

def upgrade(html):
    if '// YOUTRUBE 5.1 — safety fixes' in html:
        return html

    def replace(old, new):
        nonlocal html
        assert old in html, old[:120]
        html = html.replace(old, new)

    replace('// Large journals are committed', '// YOUTRUBE 5.1 — safety fixes\n' + (ROOT / 'session-v51.js').read_text() + '\n// Large journals are committed')
    replace('Math.max(.02,hours)*p.returnProbability/18', 'Math.max(0,hours)*p.returnProbability/18')
    # Exponential rates compose across split intervals; capped per-call gains do not.
    replace('(1-Math.exp(-exposures/500))*.28', '1-Math.exp(-exposures*.28/500)')
    replace('confidence=1-Math.exp(-opportunities/1000),step=confidence*.03', 'step=1-Math.exp(-opportunities*.03/1000)')
    replace('speed=Math.min(hours/18,.35)', 'speed=1-Math.exp(-hours/18)')
    replace('data-id="${n.id}"', 'data-id="${esc(n.id)}"')
    replace('data-id="${x.id}"', 'data-id="${esc(x.id)}"')
    replace('data-id="${c.id}"', 'data-id="${esc(c.id)}"')
    replace('return migrateState(s)}}catch(e)', 'return validateImport(s)}}catch(e)')
    replace('<h1>Настройки</h1>', '<h1>Настройки <span class="badge">5.1</span></h1>')
    replace('// APP INIT (v1 state remains under the same browser storage key)', (ROOT / 'security-v51.js').read_text() + '\n// APP INIT (v1 state remains under the same browser storage key)')
    replace('async function boot(){state=await loadStateForBoot();', 'async function boot(){if(!await SessionCoordinator.acquire())return;SessionCoordinator.capture();state=await loadStateForBoot();')
    replace("boot().catch(error=>{console.error(error);", "function showBootError(error){console.error(error);")
    replace("+'</main>'});\nsetInterval(()=>{if(!state||!appReady", "+'</main>'}\nboot().catch(showBootError);\nsetInterval(()=>{if(!state||!appReady")
    replace('settleTime=function(){advance(Math.max(0,RealClock.now()-state.simulation.lastSimulationTimestamp))};', 'settleTime=function(){if(!SessionCoordinator.allowed())return;advance(Math.max(0,RealClock.now()-state.simulation.lastSimulationTimestamp))};')
    replace("function writeInlineState(serialized){try{localStorage.setItem(CONFIG.key,serialized);", "function writeInlineState(serialized){if(!SessionCoordinator.check()||SessionCoordinator.enforced&&SessionCoordinator.mode==='lease'&&!SessionCoordinator.committing)return false;try{localStorage.setItem(CONFIG.key,serialized);SessionCoordinator.expectedRaw=serialized;")

    start = html.index('function queueStateSnapshot(')
    end = html.index('const validateImportV2=validateImport;', start)
    html = html[:start] + (ROOT / 'storage-v51.js').read_text() + '\n' + html[end:]
    return html

if __name__ == '__main__':
    path = ROOT.parent / 'outputs/index.html'
    original = path.read_text()
    # The experiment before this patch removed the same minimum; accept either base.
    if '// YOUTRUBE 5.1 — safety fixes' not in original:
        original = original.replace('Math.max(0,hours)*p.returnProbability/18', 'Math.max(.02,hours)*p.returnProbability/18')
    path.write_text(upgrade(original))
    print('Built YouTrube 5.1')
