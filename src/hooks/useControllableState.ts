import * as React from "react"

type ChangeHandler<T> = (state: T) => void
type SetStateFn<T> = React.Dispatch<React.SetStateAction<T>>

interface UseControllableStateParams<T> {
  prop?: T | undefined
  defaultProp: T
  onChange?: ChangeHandler<T>
  caller?: string
}

/**
 * Manages state as controlled (via `prop`) or uncontrolled (via `defaultProp`).
 * PersianLabs/ui `use-controllable-state` hook (Radix/Base UI pattern).
 */
export function useControllableState<T>({
  prop,
  defaultProp,
  onChange = () => {},
  caller,
}: UseControllableStateParams<T>): [T, SetStateFn<T>] {
  const [uncontrolledProp, setUncontrolledProp] = React.useState(defaultProp)
  const isControlled = prop !== undefined
  const value = isControlled ? prop : uncontrolledProp

  const valueRef = React.useRef(value)
  valueRef.current = value

  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  return [
    value,
    React.useCallback(
      (next) => {
        if (isControlled) {
          const v = isFunction(next) ? next(valueRef.current) : next
          if (v !== valueRef.current) onChangeRef.current?.(v)
        } else {
          setUncontrolledProp((prev) => {
            const v = isFunction(next) ? next(prev) : next
            if (v !== prev) onChangeRef.current?.(v)
            return v
          })
        }
      },
      [isControlled]
    ),
  ]
}

function isFunction(value: unknown): value is (...args: never[]) => unknown {
  return typeof value === "function"
}

export default useControllableState