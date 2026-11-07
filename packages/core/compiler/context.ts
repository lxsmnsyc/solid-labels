import type MagicString from 'magic-string';
import type { Node } from './ast';
import { compileError } from './errors';
import type { Analysis, Binding, Ref } from './scope';

export type ReactiveKind = 'signal' | 'accessor' | 'raw';

export interface ReactiveInfo {
  kind: ReactiveKind;
  /** Accessor identifier (the binding keeps its original name). */
  get: string;
  /** Setter identifier; signals only. */
  set?: string;
}

export interface CaptureInfo {
  /**
   * How reads are captured: `'value'` — read in the compute phase (tracked),
   * the parameter is the raw value; `'accessor'` — every read sits inside
   * `$untrack(...)`, the accessor itself is passed through the capture array
   * (stable identity, never triggers) and body reads stay `name()` calls;
   * `'plain'` — a non-reactive outer value passed through the capture array.
   */
  get: false | 'value' | 'accessor' | 'plain';
  set: boolean;
}

export interface EffectRegion {
  /** Span of the callback function (body included). */
  start: number;
  end: number;
  captured: Map<Binding, CaptureInfo>;
  /** Innermost region enclosing this one. */
  parent?: EffectRegion | null;
}

export interface PendingHoist {
  name: string;
  params: string[];
  body: Node;
  concise: boolean;
  /** Expression used as a statement: emit without `return`. */
  statement?: boolean;
}

function ignoreSpan(): void {}

/**
 * Mutable state for one compile pass: the MagicString being edited, scope
 * analysis, auto-import registry, reactive binding registry, effect capture
 * regions, and callbacks pending module-level hoisting.
 */
export class Ctx {
  s: MagicString;
  code: string;
  dev: boolean;
  disabled: Record<string, boolean>;
  analysis: Analysis;
  names: Set<string>;
  imports = new Map<string, string>();
  importOrder: { name: string; source: string; local: string }[] = [];
  /** Identifier nodes already handled by a structural transform. */
  consumed = new Set<Node>();
  reactive = new Map<Binding, ReactiveInfo>();
  regions: EffectRegion[] = [];
  /** Spans of `$untrack(...)` calls; reads inside them are not tracked by effects. */
  untrackSpans: [number, number][] = [];
  /** Outermost `untrackSpans`, sorted; rebuilt when `untrackSpans` grows. */
  untrackOuter: [number, number][] = [];
  untrackOuterCount = 0;
  pendingHoists: PendingHoist[] = [];
  /** Runs the structural rewrite of every CTF reference inside a span. Set by `transformProgram`. */
  processWithin: (start: number, end: number) => void = ignoreSpan;
  unresolvedByNode = new Map<Node, Ref>();
  /** Declaration order of every binding. */
  bindingOrder = new Map<Binding, number>();
  /** Every resolved reference, sorted by start offset. */
  sortedRefs: Ref[] = [];
  /** Unresolved `arguments` references (block effect hoisting). */
  argumentsRefs: Ref[] = [];
  /** Next free suffix per `unique` base. */
  uniqueCounters = new Map<string, number>();

  constructor(
    s: MagicString,
    code: string,
    analysis: Analysis,
    dev: boolean,
    disabled: Record<string, boolean>,
  ) {
    this.s = s;
    this.code = code;
    this.analysis = analysis;
    this.dev = dev;
    this.disabled = disabled;
    this.names = analysis.names;
    for (const ref of analysis.unresolved) {
      this.unresolvedByNode.set(ref.node, ref);
      if (ref.node.name === 'arguments') {
        this.argumentsRefs.push(ref);
      }
    }
    for (const binding of analysis.bindings) {
      this.bindingOrder.set(binding, this.bindingOrder.size);
      for (const ref of binding.refs) {
        this.sortedRefs.push(ref);
      }
    }
    this.sortedRefs.sort((a, b) => a.node.start - b.node.start);
  }

  /** Resolved references whose identifier lies inside `[start, end)`. */
  refsIn(start: number, end: number): Ref[] {
    const refs = this.sortedRefs;
    let lo = 0;
    let hi = refs.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (refs[mid].node.start < start) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    const result: Ref[] = [];
    for (let i = lo; i < refs.length && refs[i].node.start < end; i++) {
      if (refs[i].node.end <= end) {
        result.push(refs[i]);
      }
    }
    return result;
  }

  /** Returns a collision-free identifier `base_N` and reserves it. */
  unique(base: string): string {
    let index = this.uniqueCounters.get(base) ?? 1;
    while (this.names.has(`${base}_${index}`)) {
      index++;
    }
    const name = `${base}_${index}`;
    this.uniqueCounters.set(base, index + 1);
    this.names.add(name);
    return name;
  }

  /**
   * Returns the local identifier for an auto-import, registering it on first
   * use. Deduplicated per `(source, name)`; locals are `_name` (uniquified on
   * collision) and the header preserves first-use order.
   */
  importIdent(name: string, source: string): string {
    const key = `${source} ${name}`;
    const existing = this.imports.get(key);
    if (existing) {
      return existing;
    }
    let local = `_${name}`;
    if (this.names.has(local)) {
      local = this.unique(`_${name}`);
    }
    this.names.add(local);
    this.imports.set(key, local);
    this.importOrder.push({ name, source, local });
    return local;
  }

  /** Marks a binding as reactive so `rewriteReferences` rewrites its uses. */
  register(binding: Binding, info: ReactiveInfo): void {
    this.reactive.set(binding, info);
  }

  /** True when `[start, end)` lies inside a `$untrack(...)` call span. */
  insideUntrack(start: number, end: number): boolean {
    if (this.untrackOuterCount !== this.untrackSpans.length) {
      // Keep the outermost spans only, sorted; they are disjoint.
      const sorted = [...this.untrackSpans].sort((a, b) => a[0] - b[0] || b[1] - a[1]);
      this.untrackOuter = [];
      let reach = -1;
      for (const span of sorted) {
        if (span[0] >= reach) {
          this.untrackOuter.push(span);
          reach = span[1];
        }
      }
      this.untrackOuterCount = this.untrackSpans.length;
    }
    const spans = this.untrackOuter;
    let lo = 0;
    let hi = spans.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (spans[mid][0] <= start) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo > 0 && end <= spans[lo - 1][1];
  }

  /** Records an effect region; regions arrive in source order. */
  addRegion(region: EffectRegion): void {
    const last = this.regions[this.regions.length - 1];
    if (last && last.start > region.start) {
      throw new Error('Effect regions must be added in source order');
    }
    region.parent = this.enclosingRegion(region.start);
    this.regions.push(region);
  }

  /** Innermost effect region containing the position that captures the binding. */
  regionFor(binding: Binding, pos: number): EffectRegion | null {
    let region = this.enclosingRegion(pos);
    while (region && !region.captured.has(binding)) {
      region = region.parent ?? null;
    }
    return region;
  }

  /** Innermost effect region containing a position, regardless of captures. */
  enclosingRegion(pos: number): EffectRegion | null {
    const regions = this.regions;
    let lo = 0;
    let hi = regions.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (regions[mid].start <= pos) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    let region: EffectRegion | null = lo > 0 ? regions[lo - 1] : null;
    while (region && !(pos >= region.start && pos < region.end)) {
      region = region.parent ?? null;
    }
    return region;
  }

  /** Throws a `CompileError` located at the node. */
  error(node: Node, message: string): never {
    compileError(this.code, node, message);
  }

  /** Prepends the auto-import header (in first-use order). */
  finalize(): void {
    if (this.importOrder.length > 0) {
      let header = '';
      for (const entry of this.importOrder) {
        header += `import { ${entry.name} as ${entry.local} } from "${entry.source}";\n`;
      }
      this.s.prepend(header);
    }
  }
}
