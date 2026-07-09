import { forwardRef } from 'react'

export interface TextFieldProps {
  label: string
  placeholder?: string
  onChange?: (value: string) => void
}

// React 18 pattern demonstrated here (SKILL.md Phase 2 / Phase 6 will migrate it):
//   1. `forwardRef` wrapper — in React 19 `ref` is a normal prop, so the wrapper
//      is unnecessary (codemod: react-19-remove-forward-ref).
//   2. `defaultProps` on a function component — ignored in React 19; use ES6
//      default parameters instead (codemod: react-19-replace-default-props).
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, placeholder = 'Type here…', onChange }, ref) {
    return (
      <label className="d-flex flex-column gap-1">
        <span className="fw-semibold">{label}</span>
        <input
          ref={ref}
          className="form-control"
          placeholder={placeholder}
          onChange={(event) => onChange?.(event.target.value)}
        />
      </label>
    )
  },
)
