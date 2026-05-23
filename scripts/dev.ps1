$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
$env:NEXT_TEST_WASM_DIR = "node_modules\@next\swc-wasm-nodejs"
node node_modules\next\dist\bin\next dev --port 3000
