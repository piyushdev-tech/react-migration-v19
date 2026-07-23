import { createElement, createFactory } from 'react'

interface BadgeProps {
  label: string
}

function Badge({ label }: BadgeProps) {
  return createElement('span', { className: 'badge bg-secondary', 'data-testid': 'factory-badge' }, label)
}

// React 18 pattern: `React.createFactory(Component)` creates a reusable
// element-factory function, an alternative to JSX predating widespread JSX
// adoption. Still works in React 18, but React 19 removes it entirely — the
// fix is simply to use JSX (or call the component as a plain function)
// instead. Codemod: `react-19-replace-create-factory`.
//
// Unlike most of this repo's other fixtures, this one IS wired into the live
// app (via `Home.tsx`) and has its own test — `createFactory` is safe to call
// at runtime under React 18, so it can demonstrate the full
// fails-to-build-then-fixed migration story like `OutsideClick`/`SearchBox` do,
// rather than needing to stay unwired.
const badgeFactory = createFactory(Badge)

export function CreateFactoryWidget({ label }: BadgeProps) {
  return badgeFactory({ label })
}
