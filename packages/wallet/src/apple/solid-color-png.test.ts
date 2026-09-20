import { describe, it, expect } from "vitest";
import { inflateSync } from "node:zlib";
import { solidColorPng, hexToRgbTuple } from "./solid-color-png.js";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("solidColorPng", () => {
  it("produce un PNG valido con la firma, IHDR y dimensiones correctas", () => {
    const png = solidColorPng(29, 29, [17, 24, 39]);
    expect(png.subarray(0, 8)).toEqual(PNG_SIGNATURE);

    const ihdrChunkStart = 8;
    const ihdrLength = png.readUInt32BE(ihdrChunkStart);
    expect(ihdrLength).toBe(13);
    expect(png.subarray(ihdrChunkStart + 4, ihdrChunkStart + 8).toString("ascii")).toBe("IHDR");

    const ihdrData = png.subarray(ihdrChunkStart + 8, ihdrChunkStart + 8 + 13);
    expect(ihdrData.readUInt32BE(0)).toBe(29); // width
    expect(ihdrData.readUInt32BE(4)).toBe(29); // height
    expect(ihdrData.readUInt8(9)).toBe(2); // color type RGB
  });

  it("el IDAT decodifica de vuelta al color solido esperado en cada pixel", () => {
    const [r, g, b] = [200, 50, 10] as [number, number, number];
    const width = 4;
    const height = 3;
    const png = solidColorPng(width, height, [r, g, b]);

    // IHDR chunk: 8 (sig) + 4 (len) + 4 (type) + 13 (data) + 4 (crc) = 33
    const idatStart = 8 + 25;
    const idatLength = png.readUInt32BE(idatStart);
    expect(png.subarray(idatStart + 4, idatStart + 8).toString("ascii")).toBe("IDAT");
    const idatData = png.subarray(idatStart + 8, idatStart + 8 + idatLength);

    const raw = inflateSync(idatData);
    const rowLength = 1 + width * 3;
    expect(raw.length).toBe(rowLength * height);
    for (let y = 0; y < height; y++) {
      expect(raw[y * rowLength]).toBe(0); // filter byte
      for (let x = 0; x < width; x++) {
        const px = y * rowLength + 1 + x * 3;
        expect([raw[px], raw[px + 1], raw[px + 2]]).toEqual([r, g, b]);
      }
    }
  });
});

describe("hexToRgbTuple", () => {
  it("convierte un hex a su tupla RGB", () => {
    expect(hexToRgbTuple("#111827")).toEqual([17, 24, 39]);
    expect(hexToRgbTuple("F59E0B")).toEqual([245, 158, 11]);
  });
});
