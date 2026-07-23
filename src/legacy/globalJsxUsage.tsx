// Exercises the custom `<legacy-widget>` intrinsic element declared in
// `globalJsxAugmentation.d.ts` — this is what actually gets type-checked
// against that global augmentation; the `.d.ts` file alone declares nothing
// that fails to compile on its own; using the element is what would break.
//
// Intentionally NOT wired into the live app — `<legacy-widget>` isn't a real
// DOM element, so mounting this would just render an unrecognized custom
// element. It's here purely so `tsc -b` type-checks the JSX usage against the
// global augmentation.
export function LegacyWidgetUsage() {
  return <legacy-widget className="border rounded p-2">legacy custom element</legacy-widget>
}
