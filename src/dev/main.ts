import { Simulation } from '../core/engine.ts';
import { FixedClock } from '../core/clock.ts';
import { foundationContent } from '../content/foundation.ts';
import { Saves } from '../storage/saves.ts';
import type { Command, Custody, WorldState } from '../core/types.ts';

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const select = (id: string): HTMLSelectElement => el<HTMLSelectElement>(id);
const button = (id: string, f: () => void) => el<HTMLButtonElement>(id).addEventListener('click', () => guarded(f));
const c = foundationContent;
let sim = new Simulation(c);
const clock = new FixedClock();
const saves = new Saves({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) });
let running = false;
let lastFrame = performance.now();
let lastRenderedTick = -1;
let observedEventId = 0;
let storageFailed = false;
const name = (id: string): string => c.actors.find(a => a.id === id)?.displayName ?? c.places.find(p => p.id === id)?.name ?? c.objects.find(o => o.id === id)?.name ?? id;
function message(text: string, error = false): void { el('status').textContent = text; el('status').classList.toggle('error', error); }
function pause(): void { running = false; clock.setPaused(true); el('run').textContent = '▶ 進める'; }
function guarded(f: () => void): void {
  try { f(); render(); }
  catch (error) { pause(); message(error instanceof Error ? error.message : String(error), true); }
}
function options(id: string, entries: [string, string][]): void {
  const s = select(id); const previous = s.value;
  if ([...s.options].map(o => `${o.value}:${o.textContent}`).join('|') === entries.map(e => `${e[0]}:${e[1]}`).join('|')) return;
  s.replaceChildren(...entries.map(([value, label]) => new Option(label, value)));
  if (entries.some(e => e[0] === previous)) s.value = previous;
}
function lines(id: string, entries: { text: string; detail?: string }[], empty: string): void {
  const root = el(id); root.replaceChildren();
  if (!entries.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = empty; root.append(p); }
  for (const row of entries) { const div = document.createElement('div'); div.textContent = row.text;
    if (row.detail) { const meta = document.createElement('span'); meta.className = 'meta'; meta.textContent = row.detail; div.append(meta); }
    root.append(div);
  }
}
function custodyText(at: Custody): string { return at.kind === 'consumed' ? '消費済み' : `${name(at.id)}${at.kind === 'actor' ? 'が所持' : at.kind === 'object' ? 'の中' : 'に配置'}`; }
function actorId(): string { return select('actor').value; }
function command(command: Command): void { sim.enqueue(command); message('次の更新に操作を予約しました。'); }
function update(steps: number): void {
  sim.step(steps);
  const state = sim.snapshot();
  const fresh = state.events.filter(e => e.id > observedEventId); observedEventId = state.nextEventId - 1;
  const rejected = fresh.findLast(e => e.type.endsWith('.rejected'));
  if (rejected) message(String(rejected.payload.reason), true);
  if (fresh.some(e => ['engine.goal.completed', 'engine.effect.transfer', 'engine.effect.move'].includes(e.type)) && !storageFailed) {
    try { saves.autosave(sim); } catch (error) { storageFailed = true; message(`自動保存に失敗しました。JSONの書出しは利用できます。${String(error)}`, true); }
  }
}
function afterLoad(): void { pause(); observedEventId = sim.snapshot().nextEventId - 1; lastRenderedTick = -1; storageFailed = false; message('保存した更新時点から再開しました。実時間の経過は加算していません。'); }
function render(): void {
  const s = sim.snapshot(); const id = actorId() || 'player'; const a = s.actors[id]!;
  el('time').textContent = `更新 ${s.tick} / ${Math.floor(s.tick / c.ticksPerDay) + 1}日目 · ${running ? '進行中' : '停止中'}`;
  options('action', c.actions.filter(x => x.actorIds.includes(id) && (!x.movement || x.movement.from === a.locationId)).map(x => [x.id, x.label]));
  options('clue', c.clues.filter(x => x.locationId === a.locationId).map(x => [x.id, x.description]));
  options('recipient', c.actors.filter(x => x.id !== id).map(x => [x.id, `${x.displayName}（${name(s.actors[x.id]!.locationId)}）`]));
  options('information', Object.keys(a.beliefs).map(pid => [pid, c.propositions.find(p => p.id === pid)!.description]));
  el<HTMLButtonElement>('inspect').disabled = !select('clue').value;
  el<HTMLButtonElement>('say').disabled = !select('information').value;
  el<HTMLButtonElement>('cancel').disabled = !s.actions.some(x => c.actions.find(d => d.id === x.definitionId)!.actorIds.includes(id) && x.phase === 'running');
  el<HTMLButtonElement>('accept').disabled = a.offered['agreement.work'] !== 1 || a.accepted['agreement.work'] === 1;
  lines('active', s.actions.map(x => { const d = c.actions.find(a => a.id === x.definitionId)!; return { text: `${d.actorIds.map(name).join('・')}：${d.label} / ${x.phase === 'recovering' ? '復旧中' : '実行中'} ${x.elapsedTicks}/${x.phase === 'recovering' ? d.recovery!.durationTicks : d.durationTicks}`, detail: `確保：${x.resources.join('、')}${x.abortReason ? ` / 中断理由：${x.abortReason}` : ''}` }; }), '実行中の行為はありません。');
  lines('objects', c.objects.map(o => ({ text: `${o.name}：${s.objects[o.id]!.quantity}${o.unit} / ${custodyText(s.objects[o.id]!.custody)}`, detail: `所有者：${name(s.objects[o.id]!.ownerId)}` })), '');
  lines('beliefs', Object.values(a.beliefs).map(b => ({ text: `${c.propositions.find(p => p.id === b.propositionId)!.description}：${b.stance === 'believe' ? 'そう認識している' : b.stance === 'deny' ? 'そうではないと認識' : '未確定'}`, detail: `${b.sourceKind === 'observation' ? '目撃・調査' : b.sourceKind === 'testimony' ? '伝聞' : '初期記憶'} / ${name(b.sourceId)} / 更新 ${b.acquiredAt} / 証拠 ${b.evidenceEventIds.join(', ')}` })), 'まだ情報を取得していません。');
  const agreement = document.createElement('div'); agreement.textContent = `共同作業の手順：${a.accepted['agreement.work'] === 1 ? '受諾済み' : a.offered['agreement.work'] === 1 ? '提案を受領・まだ同意していない' : 'まだ聞いていない'}`; el('beliefs').append(agreement);
  lines('known', Object.keys(s.knownCompletions).map(id => ({ text: `${name(id)}の達成を確認済み` })), '確認した達成はありません。');
  lines('truth', [...c.propositions.map(p => ({ text: `${p.description}：${String(s.facts[p.id])}` })), { text: `内部の達成：${Object.keys(s.completions).map(name).join('・') || 'なし'}` }], '');
  el('positions').replaceChildren(...c.actors.map(d => { const span = document.createElement('span'); span.textContent = `${d.displayName}：${name(s.actors[d.id]!.locationId)}`; return span; }));
  const events = el('events'); events.replaceChildren(...s.events.slice(-18).reverse().map(e => { const li = document.createElement('li'); li.textContent = `[${e.tick}] ${e.type} · ${e.actorIds.map(name).join('・')} ${e.payload.reason ?? e.payload.actionId ?? ''}`; return li; }));
  lastRenderedTick = s.tick; draw(s);
}
function draw(s: WorldState): void {
  const canvas = el<HTMLCanvasElement>('map'); const ctx = canvas.getContext('2d')!;
  const point = (id: string): [number, number] => { const p = c.places.find(p => p.id === id)!; return [155 + p.x * 445, 100 + p.y * 275]; };
  ctx.clearRect(0, 0, 840, 500); ctx.fillStyle = '#f1f1e5'; ctx.fillRect(0, 0, 840, 500);
  for (const p of c.places) for (const to of p.links) { const a = point(p.id), b = point(to); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.strokeStyle = '#d9dcca'; ctx.lineWidth = 30; ctx.stroke(); ctx.strokeStyle = '#eeeee2'; ctx.lineWidth = 22; ctx.stroke(); }
  for (const p of c.places) { const [x, y] = point(p.id); ctx.fillStyle = p.id === 'loc.works' ? '#e3e7d9' : '#e9e2ce'; ctx.fillRect(x - 112, y - 70, 224, 160); ctx.strokeStyle = '#bcc7b4'; ctx.lineWidth = 2; ctx.strokeRect(x - 112, y - 70, 224, 160); ctx.fillStyle = '#445f4c'; ctx.font = '20px system-ui'; ctx.textAlign = 'center'; ctx.fillText(p.name, x, y - 38); }
  c.actors.forEach((a, i) => {
    let [x, y] = point(s.actors[a.id]!.locationId);
    const active = s.actions.find(inst => c.actions.find(d => d.id === inst.definitionId)!.movement?.actorId === a.id && inst.phase === 'running');
    if (active) { const d = c.actions.find(d => d.id === active.definitionId)!; const [tx, ty] = point(d.movement!.to); const progress = active.elapsedTicks / d.durationTicks; x += (tx - x) * progress; y += (ty - y) * progress; }
    else { x += (i % 2 ? 37 : -37); y += Math.floor(i / 2) * 37; }
    ctx.fillStyle = ['#315d49', '#b17b47', '#798caf', '#875e6c'][i]!; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
    if (a.id === actorId()) { ctx.strokeStyle = '#d7a742'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.stroke(); }
    ctx.font = '13px system-ui'; ctx.fillStyle = '#293d30'; ctx.fillText(a.displayName, x, y + 30);
  });
}
options('actor', c.actors.map(a => [a.id, a.displayName])); select('actor').addEventListener('change', render);
button('run', () => { running = !running; clock.setPaused(!running); lastFrame = performance.now(); el('run').textContent = running ? 'Ⅱ 停止' : '▶ 進める'; });
button('step', () => { pause(); update(1); }); button('ten', () => { pause(); update(10); }); button('hundred', () => { pause(); update(100); });
button('start', () => command({ kind: 'start', actorId: actorId(), actionId: select('action').value }));
button('cancel', () => { const a = sim.snapshot().actions.find(x => c.actions.find(d => d.id === x.definitionId)!.actorIds.includes(actorId()) && x.phase === 'running'); if (a) command({ kind: 'cancel', actorId: actorId(), instanceId: a.id }); });
button('inspect', () => command({ kind: 'inspect', actorId: actorId(), clueId: select('clue').value }));
button('say', () => command({ kind: 'say', actorId: actorId(), recipientId: select('recipient').value, propositionId: select('information').value }));
button('offer', () => command({ kind: 'offer', actorId: actorId(), recipientId: select('recipient').value, agreementId: 'agreement.work' }));
button('accept', () => command({ kind: 'accept', actorId: actorId(), agreementId: 'agreement.work', version: 1 }));
button('ask', () => command({ kind: 'askCompletion', actorId: actorId(), recipientId: select('recipient').value }));
button('save', () => { saves.write(sim, Number(select('slot').value) as 1 | 2 | 3); storageFailed = false; message(`手動枠${select('slot').value}へ保存しました。`); });
button('load', () => { pause(); saves.read(sim, Number(select('slot').value) as 1 | 2 | 3); afterLoad(); });
button('auto', () => { pause(); saves.read(sim, 'auto'); afterLoad(); }); button('previous', () => { pause(); saves.read(sim, 'previous'); afterLoad(); });
button('reset', () => { pause(); if (!confirm('検査状態を初期化します。保存済みの枠は残ります。')) return; sim = new Simulation(c); observedEventId = 0; storageFailed = false; message('初期状態に戻しました。'); });
button('export', () => { const blob = new Blob([saves.export(sim)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `roadonden-foundation-tick-${sim.snapshot().tick}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); message('JSONを書き出しました。'); });
button('import', () => { pause(); el<HTMLInputElement>('file').click(); });
el<HTMLInputElement>('file').addEventListener('change', async () => { const file = el<HTMLInputElement>('file').files?.[0]; if (!file) return; try { const text = await file.text(); guarded(() => { saves.import(sim, text); afterLoad(); }); } catch (error) { message(String(error), true); } finally { el<HTMLInputElement>('file').value = ''; } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); render(); } lastFrame = performance.now(); });
function frame(now: number): void {
  if (running && !document.hidden) guarded(() => { clock.advance(Math.min(now - lastFrame, 250), () => update(1)); if (lastRenderedTick !== sim.snapshot().tick) render(); });
  lastFrame = now; requestAnimationFrame(frame);
}
render(); requestAnimationFrame(frame);
