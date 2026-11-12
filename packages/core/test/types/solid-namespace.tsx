/** @jsxImportSource @solidjs/web */

// Type-only test. `pnpm -C packages/core typecheck` checks it, nothing runs it.
// Each `solid:` element must accept what the bare component accepts.
//
// An intrinsic element cannot be generic, so generic parameters of the bare
// components become their constraints on the `solid:` elements. For example
// `item` in `<solid:for>` is `any` where `<For>` infers the element type.

import type { Accessor } from 'solid-js';
import type { Hydration, HydrationScript, NoHydration } from '@solidjs/web';
import { Portal } from '@solidjs/web';
import type { Props } from '../../src/index';
import { Errored, For, Loading, Match, Repeat, Reveal, Show, Switch } from 'solid-js';

declare const list: number[];
declare const maybe: { name: string } | undefined;
declare const mount: Element;
declare const key: (item: number) => number;

// Exact type equality. The `T` of the inner functions is what makes it exact.
/* oxlint-disable typescript/no-unnecessary-type-parameters */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
/* oxlint-enable typescript/no-unnecessary-type-parameters */
type Assert<T extends true> = T;

// Same as `Props` in src/index.ts, with a sixth overload. A component with six
// overloads makes the two differ, so `Props` has to grow with it.
type Props6<T> = T extends {
  (props: infer A): any;
  (props: infer B): any;
  (props: infer C): any;
  (props: infer D): any;
  (props: infer E): any;
  (props: infer F): any;
}
  ? A | B | C | D | E | F
  : never;

export type OverloadGuards = [
  Assert<Equal<Props6<typeof For>, Props<typeof For>>>,
  Assert<Equal<Props6<typeof Show>, Props<typeof Show>>>,
  Assert<Equal<Props6<typeof Switch>, Props<typeof Switch>>>,
  Assert<Equal<Props6<typeof Match>, Props<typeof Match>>>,
  Assert<Equal<Props6<typeof Repeat>, Props<typeof Repeat>>>,
  Assert<Equal<Props6<typeof Errored>, Props<typeof Errored>>>,
  Assert<Equal<Props6<typeof Loading>, Props<typeof Loading>>>,
  Assert<Equal<Props6<typeof Reveal>, Props<typeof Reveal>>>,
  Assert<Equal<Props6<typeof Portal>, Props<typeof Portal>>>,
  Assert<Equal<Props6<typeof HydrationScript>, Props<typeof HydrationScript>>>,
  Assert<Equal<Props6<typeof Hydration>, Props<typeof Hydration>>>,
  Assert<Equal<Props6<typeof NoHydration>, Props<typeof NoHydration>>>,
];

// Known limits: an intrinsic element cannot be generic. If a change makes
// these types precise, update the assertions on purpose.
export type KnownLimits = [
  Assert<Equal<Parameters<Props<typeof For>['children']>[0], any>>,
  Assert<Equal<Props<typeof Show>['when'], unknown>>,
  Assert<Equal<Props<typeof Match>['when'], unknown>>,
];

// Fails to compile if the value is not assignable to `Expected`.
// oxlint-disable-next-line typescript/no-unnecessary-type-parameters
declare function expectType<Expected>(value: Expected): void;

// For: the default and `keyed: true` pass the raw item and an index accessor.
export const forDefault = (
  <>
    <For each={list}>
      {(item, index) => {
        expectType<number>(item);
        expectType<Accessor<number>>(index);
        return <span>{item}</span>;
      }}
    </For>
    <solid:for each={list}>
      {(item, index) => {
        expectType<Accessor<number>>(index);
        return <span>{item}</span>;
      }}
    </solid:for>
    <solid:for each={list} keyed>
      {(item, index) => {
        expectType<Accessor<number>>(index);
        return <span>{item}</span>;
      }}
    </solid:for>
  </>
);

// For: `keyed={false}` passes an item accessor and a numeric index.
export const forNonKeyed = (
  <>
    <For each={list} keyed={false}>
      {(item, index) => {
        expectType<Accessor<number>>(item);
        expectType<number>(index);
        return <span>{item()}</span>;
      }}
    </For>
    <solid:for each={list} keyed={false}>
      {(item, index) => {
        expectType<number>(index);
        return <span>{item()}</span>;
      }}
    </solid:for>
  </>
);

// For: a key function passes accessors for both. The `solid:for` callback is
// annotated because TypeScript cannot pick an overload from a function value.
export const forKeyFn = (
  <>
    <For each={list} keyed={key}>
      {(item, index) => {
        expectType<Accessor<number>>(item);
        expectType<Accessor<number>>(index);
        return <span>{item()}</span>;
      }}
    </For>
    <solid:for each={list} keyed={key}>
      {(item: Accessor<number>, index: Accessor<number>) => <span>{item() + index()}</span>}
    </solid:for>
  </>
);

export const forOptional = (
  <>
    <For each={list} fallback={<p>empty</p>}>
      {(item) => <span>{item}</span>}
    </For>
    <solid:for each={list} fallback={<p>empty</p>}>
      {(item) => <span>{item}</span>}
    </solid:for>
    <For each={undefined}>{() => <span />}</For>
    <solid:for each={undefined}>{() => <span />}</solid:for>
  </>
);

export const forInvalid = (
  <>
    {/* @ts-expect-error each is required */}
    <For>{(item: number) => <span>{item}</span>}</For>
    {/* @ts-expect-error each is required */}
    <solid:for>{(item: number) => <span>{item}</span>}</solid:for>

    {/* @ts-expect-error children must be a callback */}
    <For each={list}>text</For>
    {/* @ts-expect-error children must be a callback */}
    <solid:for each={list}>text</solid:for>

    {/* @ts-expect-error each must be an array */}
    <For each={5}>{() => <span />}</For>
    {/* @ts-expect-error each must be an array */}
    <solid:for each={5}>{() => <span />}</solid:for>

    {/* @ts-expect-error keyed must be true, false or a function */}
    <For each={list} keyed="id">
      {() => <span />}
    </For>
    {/* @ts-expect-error keyed must be true, false or a function */}
    <solid:for each={list} keyed="id">
      {() => <span />}
    </solid:for>

    {/* @ts-expect-error unknown prop */}
    <For each={list} nope>
      {() => <span />}
    </For>
    {/* @ts-expect-error unknown prop */}
    <solid:for each={list} nope>
      {() => <span />}
    </solid:for>
  </>
);

// Show
export const showValid = (
  <>
    <Show when={maybe}>
      <span>text</span>
    </Show>
    <solid:show when={maybe}>
      <span>text</span>
    </solid:show>

    <Show when={maybe} fallback={<p>none</p>}>
      {(value) => <span>{value().name}</span>}
    </Show>
    <solid:show when={maybe} fallback={<p>none</p>}>
      {(value) => <span>{JSON.stringify(value())}</span>}
    </solid:show>

    <Show when={maybe} keyed>
      {(value) => <span>{value.name}</span>}
    </Show>
    <solid:show when={maybe} keyed>
      {(value) => <span>{JSON.stringify(value)}</span>}
    </solid:show>

    <Show when={maybe} keyed>
      <span>text</span>
    </Show>
    <solid:show when={maybe} keyed>
      <span>text</span>
    </solid:show>
  </>
);

export const showInvalid = (
  <>
    {/* @ts-expect-error when is required */}
    <Show children={<span />} />
    {/* @ts-expect-error when is required */}
    <solid:show>
      <span />
    </solid:show>

    <Show
      when={maybe}
      // @ts-expect-error keyed must be a boolean
      keyed="yes"
      // @ts-expect-error children fail too, because no overload matches
      children={<span />}
    />
    <solid:show
      when={maybe}
      // @ts-expect-error keyed must be a boolean
      keyed="yes"
      children={<span />}
    />

    {/* @ts-expect-error unknown prop */}
    <Show when={maybe} nope children={<span />} />
    {/* @ts-expect-error unknown prop */}
    <solid:show when={maybe} nope>
      <span />
    </solid:show>
  </>
);

// Switch and Match
export const switchValid = (
  <>
    <Switch fallback={<p>none</p>}>
      <Match when={maybe}>
        <span>text</span>
      </Match>
      <Match when={maybe} keyed>
        {(value) => <span>{value.name}</span>}
      </Match>
      <Match when={maybe}>{(value) => <span>{value().name}</span>}</Match>
    </Switch>
    <solid:switch fallback={<p>none</p>}>
      <solid:match when={maybe}>
        <span>text</span>
      </solid:match>
      <solid:match when={maybe} keyed>
        {(value) => <span>{JSON.stringify(value)}</span>}
      </solid:match>
      <solid:match when={maybe}>{(value) => <span>{JSON.stringify(value())}</span>}</solid:match>
    </solid:switch>
  </>
);

export const switchInvalid = (
  <>
    {/* @ts-expect-error when is required */}
    <Match>
      <span />
    </Match>
    {/* @ts-expect-error when is required */}
    <solid:match>
      <span />
    </solid:match>

    {/* @ts-expect-error unknown prop */}
    <Switch nope>
      <span />
    </Switch>
    {/* @ts-expect-error unknown prop */}
    <solid:switch nope>
      <span />
    </solid:switch>

    {/* @ts-expect-error fallback must be an element */}
    <Switch fallback={() => 1}>
      <span />
    </Switch>
    {/* @ts-expect-error fallback must be an element */}
    <solid:switch fallback={() => 1}>
      <span />
    </solid:switch>
  </>
);

// Repeat
export const repeatValid = (
  <>
    <Repeat count={3} from={1} fallback={<p>none</p>}>
      {(index) => {
        expectType<number>(index);
        return <span>{index}</span>;
      }}
    </Repeat>
    <solid:repeat count={3} from={1} fallback={<p>none</p>}>
      {(index) => {
        expectType<number>(index);
        return <span>{index}</span>;
      }}
    </solid:repeat>
    <Repeat count={3}>
      <span />
    </Repeat>
    <solid:repeat count={3}>
      <span />
    </solid:repeat>
  </>
);

export const repeatInvalid = (
  <>
    {/* @ts-expect-error count is required */}
    <Repeat>
      <span />
    </Repeat>
    {/* @ts-expect-error count is required */}
    <solid:repeat>
      <span />
    </solid:repeat>

    {/* @ts-expect-error count must be a number */}
    <Repeat count="3">
      <span />
    </Repeat>
    {/* @ts-expect-error count must be a number */}
    <solid:repeat count="3">
      <span />
    </solid:repeat>
  </>
);

// Errored
export const erroredValid = (
  <>
    <Errored fallback={(error, reset) => <button onClick={reset}>{String(error())}</button>}>
      <span />
    </Errored>
    <solid:errored fallback={(error, reset) => <button onClick={reset}>{String(error())}</button>}>
      <span />
    </solid:errored>
    <Errored fallback={<p>failed</p>}>
      <span />
    </Errored>
    <solid:errored fallback={<p>failed</p>}>
      <span />
    </solid:errored>
  </>
);

export const erroredInvalid = (
  <>
    {/* @ts-expect-error fallback is required */}
    <Errored>
      <span />
    </Errored>
    {/* @ts-expect-error fallback is required */}
    <solid:errored>
      <span />
    </solid:errored>
  </>
);

// Loading
export const loadingValid = (
  <>
    <Loading fallback={<p>loading</p>} on={list}>
      <span />
    </Loading>
    <solid:loading fallback={<p>loading</p>} on={list}>
      <span />
    </solid:loading>
  </>
);

export const loadingInvalid = (
  <>
    {/* @ts-expect-error unknown prop */}
    <Loading nope>
      <span />
    </Loading>
    {/* @ts-expect-error unknown prop */}
    <solid:loading nope>
      <span />
    </solid:loading>
  </>
);

// Reveal
export const revealValid = (
  <>
    <Reveal order="together" collapsed>
      <span />
    </Reveal>
    <solid:reveal order="together" collapsed>
      <span />
    </solid:reveal>
  </>
);

export const revealInvalid = (
  <>
    {/* @ts-expect-error order must be a reveal order */}
    <Reveal order="sideways">
      <span />
    </Reveal>
    {/* @ts-expect-error order must be a reveal order */}
    <solid:reveal order="sideways">
      <span />
    </solid:reveal>
  </>
);

// Portal
export const portalValid = (
  <>
    <Portal mount={mount}>
      <span />
    </Portal>
    <solid:portal mount={mount}>
      <span />
    </solid:portal>
  </>
);

export const portalInvalid = (
  <>
    {/* @ts-expect-error mount must be an element */}
    <Portal mount="body">
      <span />
    </Portal>
    {/* @ts-expect-error mount must be an element */}
    <solid:portal mount="body">
      <span />
    </solid:portal>
  </>
);

// Hydration elements
export const hydrationValid = (
  <>
    <solid:hydration-script />
    <solid:hydration>
      <span />
    </solid:hydration>
    <solid:no-hydration>
      <span />
    </solid:no-hydration>
  </>
);
