// Angular JIT compiler must be available in every test worker. Specs that mount
// components rely on it, and several specs did not import it themselves — they only
// passed when they happened to share a worker with a spec that did. Loading it once
// here removes that ordering-dependent flakiness across the whole suite.
import '@angular/compiler';
