import type { NluEngine } from './engine';
import { RulesEngine } from './rules';

export * from './engine';
export { readWhen } from './when';

/** The one line to change when an LLM-backed engine arrives (see assistant/assistant.ts). */
export const nlu: NluEngine = new RulesEngine();
