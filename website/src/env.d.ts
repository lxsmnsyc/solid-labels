declare module 'virtual:repl-runtime' {
  /** `solid-js` and `@solidjs/web` bundled as one ES module. */
  const code: string;
  export default code;
}

declare module '@solidjs/compiler-wasm32-wasi' {
  export interface SolidTransformResult {
    code: string;
    map?: unknown;
  }
  /** The wasm build of the Solid JSX compiler. Options match `@solidjs/compiler`. */
  export function transform(code: string, options?: Record<string, unknown>): SolidTransformResult;
}
