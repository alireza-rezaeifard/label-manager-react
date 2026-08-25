'use strict'
// Minimal `performance-now` stub (missing in this repo's node_modules).
module.exports = function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}