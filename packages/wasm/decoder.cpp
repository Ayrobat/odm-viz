#include <emscripten.h>
#include <laszip_api.h>
#include <cstdint>
#include <cstdlib>
#include <cstring>

extern "C" {

EMSCRIPTEN_KEEPALIVE
uint8_t* decode(const uint8_t* input,
                int            size,
                int*           out_size,
                float          bounds[6],
                uint8_t**      out_rgb,
                int*           out_rgb_size,
                float          scales[3],
                float          offsets[3],
                int*           point_count_out)
{
    if (!input || size <= 0 || !out_size || !bounds) {
        if (out_size) *out_size = 0;
        return nullptr;
    }

      const char* tmp = "/tmp.mem";
    EM_ASM({ FS.writeFile(UTF8ToString($0), HEAPU8.slice($1, $1 + $2)); },
           tmp, input, size);

    laszip_POINTER reader = nullptr;
    laszip_header* header = nullptr;
    laszip_point*  point  = nullptr;

    auto fail = [&] {
        if (reader) {
            char* err = nullptr;
            laszip_get_error(reader, &err);          // ← grab error text
            if (err) printf("LASzip error: %s\n", err);
            laszip_close_reader(reader);
            laszip_destroy(reader);
        }
        *out_size = 0;
        return nullptr;
    };

    laszip_BOOL is_compressed = 0;
    if (laszip_create(&reader) ||
        laszip_open_reader(reader, tmp, &is_compressed) ||
        laszip_get_header_pointer(reader, &header) ||
        laszip_get_point_pointer(reader, &point))
        return fail();
    
    const uint64_t n = header->number_of_point_records;
    if (n == 0) return fail();

    const size_t xyz_bytes = n * 3 * sizeof(float);
    const bool   want_rgb  = out_rgb && out_rgb_size;
    const size_t rgb_bytes = want_rgb ? n * 3 : 0;

    uint8_t* blob = static_cast<uint8_t*>(std::malloc(xyz_bytes + rgb_bytes));
    if (!blob) return fail();

    float*   xyz_p = reinterpret_cast<float*>(blob);
    uint8_t* rgb_p = want_rgb ? blob + xyz_bytes : nullptr;

    for (uint64_t i = 0; i < n; ++i) {
        if (laszip_read_point(reader)) break;

        *xyz_p++ = static_cast<float>(point->X * header->x_scale_factor + header->x_offset);
        *xyz_p++ = static_cast<float>(point->Y * header->y_scale_factor + header->y_offset);
        *xyz_p++ = static_cast<float>(point->Z * header->z_scale_factor + header->z_offset);

        if (want_rgb) {
          // little-endian 16-bit R, G, B
          uint16_t r = point->rgb[0];
          uint16_t g = point->rgb[1];
          uint16_t b = point->rgb[2];
          *rgb_p++ =  r        & 0xFF;   // low byte
          *rgb_p++ = (r >> 8) & 0xFF;   // high byte
          *rgb_p++ =  g        & 0xFF;
          *rgb_p++ = (g >> 8) & 0xFF;
          *rgb_p++ =  b        & 0xFF;
          *rgb_p++ = (b >> 8) & 0xFF;
        }

        if ((i + 1) % 1'000'000 == 0)
            EM_ASM({ if (Module.onProgress) Module.onProgress($0, $1); }, i + 1, n);
    }

    laszip_close_reader(reader);
    laszip_destroy(reader);
    EM_ASM(FS.unlink(UTF8ToString($0)), tmp);   // tidy up

    *out_size = static_cast<int>(xyz_bytes);
    if (point_count_out) *point_count_out = static_cast<int>(n);

    if (want_rgb) { *out_rgb = blob + xyz_bytes; *out_rgb_size = static_cast<int>(rgb_bytes); }

    if (scales)  { scales[0]  = static_cast<float>(header->x_scale_factor);
                   scales[1]  = static_cast<float>(header->y_scale_factor);
                   scales[2]  = static_cast<float>(header->z_scale_factor); }
    if (offsets) { offsets[0] = static_cast<float>(header->x_offset);
                   offsets[1] = static_cast<float>(header->y_offset);
                   offsets[2] = static_cast<float>(header->z_offset); }

    bounds[0] = static_cast<float>(header->min_x);
    bounds[1] = static_cast<float>(header->min_y);
    bounds[2] = static_cast<float>(header->min_z);
    bounds[3] = static_cast<float>(header->max_x);
    bounds[4] = static_cast<float>(header->max_y);
    bounds[5] = static_cast<float>(header->max_z);

    return blob;
}

} // extern "C"