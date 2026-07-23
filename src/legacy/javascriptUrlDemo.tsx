// React 18 pattern: a `javascript:` URL in an `href`/`src` attribute. React 18
// renders this without complaint (the browser itself may still block it on
// click depending on context, but React doesn't intervene). React 19 makes
// React itself throw an error when it encounters a `javascript:` URL in `src`
// or `href` during render, treating it as the security footgun it's always
// been (XSS-adjacent), rather than silently passing it through to the DOM.
//
// Intentionally NOT wired into the live app — rendering this for real would
// throw as intended once migrated to React 19, which would break the running
// app rather than demonstrate a fix. The migration here is simply: remove the
// `javascript:` URL and use a real `href`/`src`, or an `onClick` handler
// instead of an inline `javascript:void(0)` no-op link.
export function LegacyJavascriptUrlLink() {
  return (
    <a href="javascript:void(0)" className="text-muted">
      Legacy no-op link
    </a>
  )
}
