import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let geometry = null;
try {
  geometry = require('./domMatrixPolyfill.cjs');
} catch (err) {
  console.warn('[domPolyfill] Could not load domMatrixPolyfill.cjs:', err.message);
}

const DOMMatrix = geometry?.DOMMatrix || globalThis.DOMMatrix;
const DOMPoint = geometry?.DOMPoint || globalThis.DOMPoint;
const DOMRect = geometry?.DOMRect || globalThis.DOMRect;

if (typeof globalThis.DOMMatrix === 'undefined' && DOMMatrix) {
  globalThis.DOMMatrix = DOMMatrix;
}
if (typeof globalThis.DOMPoint === 'undefined' && DOMPoint) {
  globalThis.DOMPoint = DOMPoint;
}
if (typeof globalThis.DOMRect === 'undefined' && DOMRect) {
  globalThis.DOMRect = DOMRect;
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {};
}

export { DOMMatrix, DOMPoint, DOMRect };
export default DOMMatrix;
