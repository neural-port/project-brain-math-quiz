const STORAGE_KEY = 'quiz-seen-prompts';
const MAX_HISTORY = 2000; // cap to prevent unbounded localStorage growth

/**
 * Persistent question history — tracks seen question prompts across
 * browser sessions using localStorage. This prevents the same question
 * from appearing again on subsequent plays.
 *
 * When the history fills up (MAX_HISTORY), the oldest entries are
 * evicted to make room for new ones.
 */
export class SeenHistory {
  private prompts: string[];
  private dirty = false;

  constructor() {
    this.prompts = this.load();
  }

  private load(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    if (!this.dirty) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prompts));
      this.dirty = false;
    } catch {
      // localStorage might be full or disabled — silently ignore
    }
  }

  has(prompt: string): boolean {
    return this.prompts.includes(prompt);
  }

  /** Returns the set of seen prompts for the generator's dedup logic. */
  asSet(): Set<string> {
    return new Set(this.prompts);
  }

  /** Mark a prompt as seen. */
  add(prompt: string): void {
    if (this.prompts.includes(prompt)) return;
    this.prompts.push(prompt);
    // Evict oldest entries if over cap
    if (this.prompts.length > MAX_HISTORY) {
      this.prompts = this.prompts.slice(this.prompts.length - MAX_HISTORY);
    }
    this.dirty = true;
  }

  /** Add multiple prompts at once. */
  addAll(prompts: string[]): void {
    for (const p of prompts) this.add(p);
    this.save();
  }

  /** Clear all history. */
  clear(): void {
    this.prompts = [];
    this.dirty = true;
    this.save();
  }

  get size(): number {
    return this.prompts.length;
  }

  flush(): void {
    this.save();
  }
}

/** Singleton instance — shared across the app. */
let instance: SeenHistory | null = null;

export function getSeenHistory(): SeenHistory {
  if (!instance) instance = new SeenHistory();
  return instance;
}
