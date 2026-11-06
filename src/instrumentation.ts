import { AsyncLocalStorage } from "node:async_hooks";

// Runs once at server start, outside any request. Saving this context lets the DB pool open
// connections here instead of inside a page render (see src/db/index.ts).
export function register() {
  (globalThis as { runOutsideRequest?: <R>(fn: () => R) => R }).runOutsideRequest = AsyncLocalStorage.snapshot();
}
