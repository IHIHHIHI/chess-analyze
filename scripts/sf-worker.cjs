// Worker thread entry that boots Stockfish (single-threaded WASM build) and
// bridges its custom-message API to parentPort.
//
// The npm `stockfish` build was designed for browser web workers. In Node
// worker_threads, its top-level guard `!isMainThread` short-circuits the
// branch that wires up `module.exports`, so we hijack the worker_threads
// require to lie about isMainThread, then call the factory ourselves.
const { parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const SF_DIR = path.resolve(__dirname, '..', 'node_modules', 'stockfish', 'src');
const SF_PATH = path.join(SF_DIR, 'stockfish-nnue-16-single.js');
const code = fs.readFileSync(SF_PATH, 'utf8');

const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'worker_threads') {
    return { ...origRequire.call(this, id), isMainThread: true };
  }
  return origRequire.call(this, id);
};
const mod = new Module(SF_PATH);
mod.filename = SF_PATH;
mod.paths = Module._nodeModulePaths(SF_DIR);
mod._compile(code, SF_PATH);
const Stockfish = mod.exports;
Module.prototype.require = origRequire;

if (typeof Stockfish !== 'function') {
  throw new Error('Failed to load stockfish factory');
}

const factory = Stockfish();
const sfPromise = factory({
  locateFile: (file) => path.join(SF_DIR, file),
});

sfPromise.then((sf) => {
  sf.addMessageListener((msg) => parentPort.postMessage({ kind: 'line', line: String(msg) }));
  parentPort.on('message', (msg) => sf.onCustomMessage(msg));
  parentPort.postMessage({ kind: 'ready' });
}).catch((err) => {
  parentPort.postMessage({ kind: 'error', message: String(err && err.message || err) });
  process.exit(2);
});
