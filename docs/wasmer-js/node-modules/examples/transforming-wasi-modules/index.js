// Imports
import { WASI } from '@wasmer/wasi';
import { WasmFs } from '@wasmer/wasmfs';
import { lowerI64Imports } from "@wasmer/wasm-transformer";

// The file path to the wasi module we want to run
const wasmFilePath = './qjs.wasm';

// A quick wrapper for console.log, to also output logs to the body
const consoleLog = console.log;
console.log = function() {
  const args = Array.prototype.slice.call(arguments);
  consoleLog(args);
  const log = args.join(' ');
  consoleLog(log);
  document.body.appendChild(document.createTextNode('JavaScript Console: ' + log));
}

// Instantiate a new WASI and WasmFs Instance
// NOTE: For node WasmFs is not needed, and the native Fs module is assigned by default
// In this case, we want to show off WasmFs for the browser use case, and we want to
// "Sandbox" our file system operations
const wasmFs = new WasmFs();
let wasi = new WASI({
  // Arguments to pass to the Wasm Module
  // The first argument usually should be the filepath to the "executable wasi module"
  // That we want to run.
  args: [wasmFilePath],
  // Environment variables that are accesible to the Wasi module
  env: {},
  // Bindings that are used by the Wasi Instance (fs, path, etc...)
  bindings: {
    ...WASI.defaultBindings,
    fs: wasmFs.fs
  }
});

// Async Function to run our wasi module/instance
const startWasiTask = async () => {
  // Fetch our Wasm File
  const response = await fetch(wasmFilePath);
  const responseArrayBuffer = await response.arrayBuffer();
  const wasmBytes = new Uint8Array(responseArrayBuffer);

  // Lower the WebAssembly Module bytes
  // This will create trampoline functions for i64 parameters
  // in function calls like: 
  // https://github.com/WebAssembly/WASI/blob/master/phases/old/snapshot_0/docs/wasi_unstable.md#clock_time_get
  // Allowing the Wasi module to work in the browser / node!
  const loweredWasmBytes = await lowerI64Imports(wasmBytes);

  // Instantiate the WebAssembly file
  let { instance } = await WebAssembly.instantiate(loweredWasmBytes, {
    wasi_unstable: wasi.wasiImport
  });

  // Start the WebAssembly WASI instance!
  wasi.start(instance);

  // Output what's inside of /dev/stdout!
  const stdout = await wasmFs.getStdOut();
  // Add the Standard output to the dom
  console.log('Standard Output: ' + stdout);
};
startWasiTask();
