// @ts-nocheck
/*
 * React 18 pattern: a "module pattern factory" — a plain function that, instead
 * of returning JSX directly, returns an object with a `render()` method. This
 * predates ES6 classes and hooks; React supported it for backwards compatibility
 * for a long time, but React 19 removes it entirely — components must return
 * JSX (or another valid render return type) directly, not an object wrapping a
 * `render` method.
 *
 * No automated codemod covers this (it's rare enough, and old enough, that
 * codemod.com doesn't ship one) — migrating means inlining the object's
 * `render()` body as the function's own return value.
 *
 * Intentionally NOT wired into the live app or type-checked strictly (`@ts-nocheck`)
 * — this pattern doesn't fit modern `FunctionComponent` typing at all, which is
 * itself part of why it's obscure enough to have no codemod.
 */
export function LegacyModuleFactoryWidget(props: { label: string }) {
  return {
    render() {
      return <div className="border rounded p-2">{props.label}</div>
    },
  }
}
