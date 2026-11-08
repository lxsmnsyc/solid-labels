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

declare module 'virtual:search-index' {
  /** One entry per docs page and per `##` or `###` section. */
  const entries: {
    id: string;
    href: string;
    page: string;
    heading: string;
    text: string;
  }[];
  export default entries;
}
