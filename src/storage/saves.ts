import type { Simulation } from '../core/engine.ts';
import { requireThat } from '../core/validation.ts';

export interface Store { getItem(key: string): string | null; setItem(key: string, value: string): void }
export class Saves {
  private store: Store;
  private prefix: string;
  constructor(store: Store, prefix = 'roadonden:foundation:v1:') { this.store = store; this.prefix = prefix; }
  write(simulation: Simulation, slot: 1 | 2 | 3): void {
    requireThat([1, 2, 3].includes(slot), '保存枠が不正です');
    this.store.setItem(`${this.prefix}manual:${slot}`, this.export(simulation));
  }
  read(simulation: Simulation, slot: 1 | 2 | 3 | 'auto' | 'previous'): void {
    const data = this.store.getItem(`${this.prefix}${typeof slot === 'number' ? `manual:${slot}` : slot}`);
    requireThat(data !== null, 'この枠にはセーブがありません'); this.import(simulation, data);
  }
  autosave(simulation: Simulation): void {
    const previous = this.store.getItem(`${this.prefix}auto`);
    if (previous !== null) this.store.setItem(`${this.prefix}previous`, previous);
    this.store.setItem(`${this.prefix}auto`, this.export(simulation));
  }
  export(simulation: Simulation): string { return JSON.stringify(simulation.save()); }
  import(simulation: Simulation, json: string): void {
    // Validation and candidate creation both happen before Simulation replaces live state.
    const candidate: unknown = JSON.parse(json); simulation.load(candidate);
  }
}
