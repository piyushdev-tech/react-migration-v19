import type { ReactElement } from 'react'

// React 18 pattern: `ReactElement`'s `props` type parameter defaults to `any`
// (`interface ReactElement<P = any, ...>`), so reading arbitrary properties off
// `element.props` without a type argument or a guard compiles cleanly — `any`
// allows anything. React 19 changes that default to `unknown`, so the same
// unnarrowed access becomes a compile error ("Property does not exist on type
// 'unknown'"). Fix per call site: supply an explicit type argument
// (`ReactElement<{ title: string }>`), narrow with a type guard, or (as a
// stopgap only) run `npx types-react-codemod@latest react-element-default-any-props`
// to restore the old `any` default project-wide.
//
// Intentionally NOT wired into the live app (this pattern — reading arbitrary
// props off a generically-typed element — belongs to devtool/utility-style
// code, not ordinary components), but real, type-checked source.
export function readTitleUnsafely(element: ReactElement) {
  // Relies entirely on `props` being `any` (React 18) to compile; under React
  // 19's `unknown` default this line needs a type argument or guard.
  return element.props.title
}
