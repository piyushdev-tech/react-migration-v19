// React 18 pattern: augmenting JSX's `IntrinsicElements` via the bare global
// `JSX` namespace. Already `@deprecated` as of @types/react 18.3 ("Use React.JSX
// instead of the global JSX namespace") but still merges and works — React 19
// removes the global namespace entirely, so this augmentation stops applying
// and any usage of the custom element (see `globalJsxUsage.tsx`) becomes a type
// error ("Property 'legacy-widget' does not exist on type 'IntrinsicElements'").
//
// Fix: move this into `declare module "react/jsx-runtime"` (for this project's
// `"jsx": "react-jsx"` tsconfig setting), or `declare module "react"` /
// `"react/jsx-dev-runtime"` depending on the project's own `"jsx"` setting —
// codemod: `scoped-jsx` (part of `types-react-codemod`'s `preset-19`).
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'legacy-widget': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
}

export {}
