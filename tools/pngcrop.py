#!/usr/bin/env python3
"""Crop an 8-bit PNG without Pillow.

The gateway container has no Pillow, no pip and no ImageMagick, so screenshots
pulled off the Fold are cropped here instead. Decodes IDAT, undoes the per-row
filters, slices the pixel rows, then re-emits every row with filter 0.

    pngcrop.py in.png out.png LEFT TOP RIGHT BOTTOM
"""
import struct
import sys
import zlib

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}


def read_chunks(data):
    if data[:8] != PNG_MAGIC:
        raise SystemExit("not a PNG")
    pos = 8
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        kind = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        yield kind, body
        pos += 12 + length


def paeth(a, b, c):
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    return b if pb <= pc else c


def unfilter(raw, width, height, bpp):
    stride = width * bpp
    out = bytearray(stride * height)
    prev = bytearray(stride)
    pos = 0
    for y in range(height):
        ftype = raw[pos]
        pos += 1
        line = bytearray(raw[pos:pos + stride])
        pos += stride
        if ftype == 1:
            for i in range(bpp, stride):
                line[i] = (line[i] + line[i - bpp]) & 0xFF
        elif ftype == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif ftype == 3:
            for i in range(stride):
                left = line[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + ((left + prev[i]) >> 1)) & 0xFF
        elif ftype == 4:
            for i in range(stride):
                left = line[i - bpp] if i >= bpp else 0
                upleft = prev[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + paeth(left, prev[i], upleft)) & 0xFF
        elif ftype != 0:
            raise SystemExit("unsupported filter %d" % ftype)
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return out, stride


def chunk(kind, body):
    return (struct.pack(">I", len(body)) + kind + body
            + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF))


def main():
    src, dst, left, top, right, bottom = sys.argv[1:7]
    left, top, right, bottom = int(left), int(top), int(right), int(bottom)
    data = open(src, "rb").read()

    idat = b""
    for kind, body in read_chunks(data):
        if kind == b"IHDR":
            width, height, depth, colour = struct.unpack(">IIBB", body[:10])
            if body[10:13] != b"\x00\x00\x00":
                raise SystemExit("interlaced or non-deflate PNG unsupported")
        elif kind == b"IDAT":
            idat += body

    if depth != 8:
        raise SystemExit("only 8-bit PNGs supported, got %d" % depth)
    bpp = CHANNELS[colour]

    right = min(right, width)
    bottom = min(bottom, height)
    if not (0 <= left < right and 0 <= top < bottom):
        raise SystemExit("empty crop box")

    pixels, stride = unfilter(zlib.decompress(idat), width, height, bpp)

    out = bytearray()
    for y in range(top, bottom):
        row = y * stride
        out.append(0)
        out += pixels[row + left * bpp:row + right * bpp]

    new_w, new_h = right - left, bottom - top
    png = (PNG_MAGIC
           + chunk(b"IHDR", struct.pack(">IIBBBBB", new_w, new_h, 8, colour, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(bytes(out), 9))
           + chunk(b"IEND", b""))
    open(dst, "wb").write(png)
    print("%s -> %s  %dx%d" % (src, dst, new_w, new_h))


if __name__ == "__main__":
    main()
