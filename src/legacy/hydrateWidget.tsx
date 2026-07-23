import * as ReactDOM from 'react-dom'

function HydratedWidget() {
  return <div className="border rounded p-2">Hydrated widget</div>
}

// React 18 pattern: `ReactDOM.hydrate` for attaching to server-rendered markup.
// React 19 removes `ReactDOM.hydrate` entirely — migrate to
// `hydrateRoot(container, element)` (react-19-migration-recipe handles this).
//
// Intentionally NOT wired into main.tsx — this is a Vite SPA with no real
// server-rendered markup to hydrate against, so calling this for real would be
// misleading. It's still real source under `src/`, so the grep sweep and codemods
// find and rewrite it like they would in a true SSR app.
export function hydrateWidget(container: HTMLElement) {
  ReactDOM.hydrate(<HydratedWidget />, container)
}
