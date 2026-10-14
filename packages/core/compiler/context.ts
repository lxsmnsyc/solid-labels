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
   * (stable identity, never triggers) and body reads stay `name()` calls.
   */
  get: false | 'value' | 'accessor';
  set: boolean;
}

export interface EffectRegion {
  /** Span of the callback function (body included). */
  start: number;
  end: number;
  captured: Map<Binding, CaptureInfo>;
}

export interface PendingHoist {
  name: string;
  params: string[];
  body: Node;
  concise: boolean;
  /** Expression used as a statement: emit without `return`. */
  statement?: boolean;
  text?: string;
}

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
  pendingHoists: PendingHoist[] = [];
  unresolvedByNode = new Map<Node, Ref>();

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
    }
  }

  /** Returns a collision-free identifier `base_N` and reserves it. */
  unique(base: string): string {
    let index = 1;
    while (this.names.has(`${base}_${index}`)) {
      index++;
    }
    const name = `${base}_${index}`;
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

  /** Innermost effect region containing the position that captures the binding. */
  regionFor(binding: Binding, pos: number): EffectRegion | null {
    let found: EffectRegion | null = null;
    for (const region of this.regions) {
      if (
        pos >= region.start &&
        pos < region.end &&
        region.captured.has(binding) &&
        (!found || region.start >= found.start)
      ) {
        found = region;
      }
    }
    return found;
  }

  /** Innermost effect region containing a position, regardless of captures. */
  enclosingRegion(pos: number): EffectRegion | null {
    let found: EffectRegion | null = null;
    for (const region of this.regions) {
      if (pos >= region.start && pos < region.end && (!found || region.start >= found.start)) {
        found = region;
      }
    }
    return found;
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
