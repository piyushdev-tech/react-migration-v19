import { createRoot } from "react-dom/client";

function ReleaseBanner() {
  return (
    <div className="alert alert-info m-0 rounded-0 text-center py-1">
      Running the React 18.3 baseline — see SKILL.md to migrate to React 19.
    </div>
  )
}

// React 18 pattern: imperatively mounting a widget with `ReactDOM.render` into a
// standalone container, and tearing it down with `unmountComponentAtNode`. Both
// are removed in React 19 — SKILL.md Phase 2 / Phase 6 migrate this to
// `createRoot(container).render(...)` and `root.unmount()`.
export function mountReleaseBanner() {
  let container = document.getElementById('release-banner')
  if (!container) {
    container = document.createElement('div')
    container.id = 'release-banner'
    document.body.prepend(container)
  }
  const root = createRoot(container);
  root.render(<ReleaseBanner />);
  return () => {
    root.unmount();
  }
}
