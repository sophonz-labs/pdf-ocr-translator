// The package's "exports" map hides its typings from bundler resolution; re-point them.
declare module "tesseract-wasm" {
  export * from "tesseract-wasm-types";
}
