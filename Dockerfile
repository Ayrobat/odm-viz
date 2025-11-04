# Image for building the WASM module, based on emscripten/emsdk:4.0.18
FROM emscripten/emsdk:4.0.18 AS builder

WORKDIR /app/packages/wasm

COPY packages/wasm/decoder.cpp ./
COPY packages/wasm/LAStools ./LAStools

RUN mkdir -p dist

RUN echo "Building WebAssembly module with LAZ flags..." && \
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



FROM scratch AS export
COPY --from=builder /app/packages/wasm/dist/ ./