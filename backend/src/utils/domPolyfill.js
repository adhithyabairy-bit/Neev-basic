import { createRequire } from 'module';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

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

// In-memory fake worker for serverless (AWS Lambda / Vercel)
if (typeof globalThis.pdfjsWorker === 'undefined' && pdfjsWorker) {
  globalThis.pdfjsWorker = pdfjsWorker;
}

export { DOMMatrix, DOMPoint, DOMRect, pdfjsWorker };
export default DOMMatrix;

