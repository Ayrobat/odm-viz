#!/bin/bash
set -e

# Create output directories
mkdir -p dist

# Check if emcc is available
if ! command -v emcc &> /dev/null; then
    echo "Error: emcc not found. Please make sure Emscripten is installed and sourced."
    echo "Run: source /path/to/emsdk/emsdk_env.sh"
    exit 1
fi

# Build with Emscripten
echo "Building WebAssembly module..."
emcc \
  decoder.cpp \
  LAStools/LASzip/src/*.cpp \
  -std=c++17 \
  -D LASZIPDLL_EXPORTS \
  -I LAStools/LASzip/include/laszip \
  -I LAStools/LASzip/dll \
  -I LAStools/LASzip/src \
  -I LAStools/LASlib/inc \
  -s WASM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=16MB \
  -s MAXIMUM_MEMORY=1024MB \
  -s EXPORT_ES6=1 \
  -s MODULARIZE=1 \
  -s EXPORTED_FUNCTIONS='["_decode","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","lengthBytesUTF8","stringToUTF8","HEAPU8","HEAP32","HEAPU32","HEAPF32"]' \
  -s ENVIRONMENT='web,worker' \
  -s FORCE_FILESYSTEM=1 \
  -s EXIT_RUNTIME=0 \
  -s ALLOW_TABLE_GROWTH=1 \
  -s ASSERTIONS=1 \
  -s DISABLE_EXCEPTION_CATCHING=0 \
  -s SINGLE_FILE=1 \
  -O3 \
  -o dist/laszip.js

echo "Build complete!"