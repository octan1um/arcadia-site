#!/usr/bin/env python3
"""Paste a square image into a circle on an 8-bit PNG, without Pillow.

Companion to pngcrop.py, for the same reason: the container that handles these
screenshots has no Pillow, no pip and no ImageMagick. Used to drop real app
icons onto the notification rows of a staged screenshot, replacing the generic
Android icon that `cmd notification post` leaves behind.

The source is box-averaged down to the target diameter rather than sampled, so
a 1024px icon reduced to 37px keeps its shape instead of aliasing apart. The
circular edge is antialiased by supersampling coverage per pixel.

    pngpaste.py base.png out.png ICON.png CX CY DIAMETER [ICON2 CX CY D ...]

CX and CY are the circle's centre in base-image pixels and may be fractional.
"""
import struct
import sys
import zlib

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}
EDGE_SAMPLES = 4


def read_chunks(data):
    if data[:8] != PNG_MAGIC:
        raise SystemExit("not a PNG")
    pos = 8
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        kind = data[pos + 4:pos + 8]
        yield kind, data[pos + 8:pos + 8 + length]
        pos += 12 + length


def paeth(a, b, c):
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    return b if pb <= pc else c


def decode(path):
    data = open(path, "rb").read()
    idat = b""
    width = height = bpp = 0
    colour = 0
    for kind, body in read_chunks(data):
        if kind == b"IHDR":
            width, height, depth, colour = struct.unpack(">IIBB", body[:10])
            if depth != 8:
                raise SystemExit("%s: only 8-bit PNGs supported" % path)
            if body[10:13] != b"\x00\x00\x00":
                raise SystemExit("%s: interlaced PNG unsupported" % path)
            bpp = CHANNELS[colour]
        elif kind == b"IDAT":
            idat += body

    raw = zlib.decompress(idat)
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
            raise SystemExit("%s: unsupported filter %d" % (path, ftype))
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return out, width, height, bpp


def box_resize(src, sw, sh, sbpp, size):
    """Average each destination pixel over its full source footprint."""
    dst = bytearray(size * size * 3)
    for dy in range(size):
        y0, y1 = dy * sh // size, max(dy * sh // size + 1, (dy + 1) * sh // size)
        for dx in range(size):
            x0, x1 = dx * sw // size, max(dx * sw // size + 1, (dx + 1) * sw // size)
            r = g = b = n = 0
            for sy in range(y0, y1):
                row = sy * sw * sbpp
                for sx in range(x0, x1):
                    i = row + sx * sbpp
                    r += src[i]
                    g += src[i + 1]
                    b += src[i + 2]
                    n += 1
            o = (dy * size + dx) * 3
            dst[o] = r // n
            dst[o + 1] = g // n
            dst[o + 2] = b // n
    return dst


def coverage(px, py, cx, cy, radius):
    """Fraction of this pixel inside the circle, by supersampling."""
    hits = 0
    for sy in range(EDGE_SAMPLES):
        yy = py + (sy + 0.5) / EDGE_SAMPLES
        for sx in range(EDGE_SAMPLES):
            xx = px + (sx + 0.5) / EDGE_SAMPLES
            if (xx - cx) ** 2 + (yy - cy) ** 2 <= radius ** 2:
                hits += 1
    return hits / (EDGE_SAMPLES * EDGE_SAMPLES)


def chunk(kind, body):
    return (struct.pack(">I", len(body)) + kind + body
            + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF))


def main():
    base_path, out_path = sys.argv[1], sys.argv[2]
    jobs = sys.argv[3:]
    if not jobs or len(jobs) % 4:
        raise SystemExit("need groups of ICON CX CY DIAMETER")

    base, bw, bh, bbpp = decode(base_path)
    stride = bw * bbpp

    for i in range(0, len(jobs), 4):
        icon_path = jobs[i]
        cx, cy, diameter = float(jobs[i + 1]), float(jobs[i + 2]), int(jobs[i + 3])
        radius = diameter / 2.0
        icon, iw, ih, ibpp = decode(icon_path)
        small = box_resize(icon, iw, ih, ibpp, diameter)

        left, top = int(round(cx - radius)), int(round(cy - radius))
        for dy in range(diameter):
            y = top + dy
            if not (0 <= y < bh):
                continue
            for dx in range(diameter):
                x = left + dx
                if not (0 <= x < bw):
                    continue
                a = coverage(x, y, cx, cy, radius)
                if a <= 0:
                    continue
                s = (dy * diameter + dx) * 3
                d = y * stride + x * bbpp
                for c in range(3):
                    base[d + c] = int(round(small[s + c] * a + base[d + c] * (1 - a)))
        print("pasted %s at (%s, %s) d=%d" % (icon_path.split("/")[-1], cx, cy, diameter))

    body = bytearray()
    for y in range(bh):
        body.append(0)
        body += base[y * stride:(y + 1) * stride]
    png = (PNG_MAGIC
           + chunk(b"IHDR", struct.pack(">IIBBBBB", bw, bh, 8, 2 if bbpp == 3 else 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(bytes(body), 9))
           + chunk(b"IEND", b""))
    open(out_path, "wb").write(png)
    print("wrote %s  %dx%d" % (out_path, bw, bh))


if __name__ == "__main__":
    main()
