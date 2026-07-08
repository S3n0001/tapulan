import { useRef } from "react";

/**
 * Retain the last non-null value across renders — the snapshot-for-exit
 * pattern from ConfirmProvider and TaskPanel, extracted. A caller clears its
 * record (`editing = null`) the moment it closes an overlay; rendering from
 * the retained snapshot lets the surface play its exit animation with the
 * final content still in place instead of blanking or unmounting mid-flight.
 */
export function useRetained<T>(value: T | null): T | null {
  const ref = useRef<T | null>(null);
  if (value !== null) ref.current = value;
  return value ?? ref.current;
}
