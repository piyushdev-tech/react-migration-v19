import { useReducer, useRef, type MutableRefObject } from 'react'

interface CounterState {
  count: number
}

type CounterAction = { type: 'increment' } | { type: 'reset' }

function reducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 }
    case 'reset':
      return { count: 0 }
  }
}

// React 18 pattern #1: `useReducer<React.Reducer<State, Action>>(reducer)` — a
// single type parameter carrying the *entire* reducer function type. React 19
// changes `useReducer`'s generic signature so it no longer accepts this;
// migrate to relying on contextual inference (`useReducer(reducer, initial)`
// with no type arguments) or supplying `State`/`Action` explicitly
// (`useReducer<State, [Action]>(reducer, initial)`). No automated codemod —
// fix per call site.
function useLegacyCounterReducer() {
  return useReducer<React.Reducer<CounterState, CounterAction>>(reducer, { count: 0 })
}

// React 18 pattern #2: `MutableRefObject<T>` as its own distinct type from
// `RefObject<T>`. React 19 unifies all refs under a single `RefObject<T>` —
// code that specifically typed a ref as `MutableRefObject` (rather than
// letting `useRef` infer it) needs that annotation updated. Codemod:
// `refobject-defaults` (part of `types-react-codemod`'s `preset-19`).
function useIncrementCountRef(): MutableRefObject<number> {
  return useRef<number>(0)
}

export function ReducerDemo() {
  const [state, dispatch] = useLegacyCounterReducer()
  const incrementCountRef = useIncrementCountRef()

  return (
    <div className="d-flex align-items-center gap-2" data-testid="reducer-demo">
      <span data-testid="reducer-count">Count: {state.count}</span>
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        onClick={() => {
          incrementCountRef.current += 1
          dispatch({ type: 'increment' })
        }}
      >
        +
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => dispatch({ type: 'reset' })}
      >
        Reset
      </button>
      <small className="text-muted" data-testid="reducer-increments">
        increments so far: {incrementCountRef.current}
      </small>
    </div>
  )
}
