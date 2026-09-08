/**
 * Method metadata key marking a listener as externally managed:
 * it stays discoverable in the ListenerRegistryService but is skipped
 * by the automatic event binding (e.g. handlers owned by @nestwhats/webhook).
 */
export const NESTWHATS_MANAGED_LISTENER = "NESTWHATS::MANAGED_LISTENER";
