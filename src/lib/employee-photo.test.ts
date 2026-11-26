import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processPhoto, PhotoError } from "./employee-photo";
import { initialsOf, photoUrl, PHOTO_MAX_BYTES, sniffImageType } from "./employee-photo-shared";

async function image(format: "jpeg" | "png" | "webp", w = 600, h = 400) {
  const buf = await sharp({ create: { width: w, height: h, channels: 3, background: "#F46150" } })[format]().toBuffer();
  return new File([new Uint8Array(buf)], `foto.${format}`, { type: `image/${format}` });
}

describe("foto da funcionária", () => {
  it("reconhece JPG, PNG e WebP pelos bytes e rejeita o resto", async () => {
    for (const f of ["jpeg", "png", "webp"] as const) expect(sniffImageType(new Uint8Array(await (await image(f)).arrayBuffer()))).toBe(f);
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
  it("reduz para 256×256 em WebP", async () => {
    for (const f of ["jpeg", "png", "webp"] as const) {
      const out = await processPhoto(await image(f));
      const meta = await sharp(out.data).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(["webp", 256, 256]);
      expect(out.contentType).toBe("image/webp");
    }
  });
  it("recusa arquivo que não é imagem, mesmo com nome e tipo de imagem", async () => {
    const fake = new File(["isto não é uma foto"], "foto.jpg", { type: "image/jpeg" });
    await expect(processPhoto(fake)).rejects.toThrow(PhotoError);
    const svg = new File(["<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>"], "foto.png", { type: "image/png" });
    await expect(processPhoto(svg)).rejects.toThrow(/não é uma imagem válida/);
  });
  it("recusa arquivo acima do limite", async () => {
    const big = new File([new Uint8Array(PHOTO_MAX_BYTES + 1)], "grande.jpg", { type: "image/jpeg" });
    await expect(processPhoto(big)).rejects.toThrow(/maior que 5 MB/);
  });
  it("recusa imagem corrompida", async () => {
    const jpg = new Uint8Array(await (await image("jpeg")).arrayBuffer());
    const broken = new File([jpg.subarray(0, 40)], "quebrada.jpg", { type: "image/jpeg" });
    await expect(processPhoto(broken)).rejects.toThrow(PhotoError);
  });
  it("iniciais e endereço", () => {
    expect(initialsOf("Letícia Prado")).toBe("LP");
    expect(initialsOf("Bianca")).toBe("B");
    expect(initialsOf("Ana Maria de Souza")).toBe("AS");
    expect(initialsOf("  ")).toBe("?");
    expect(photoUrl(3, null)).toBeNull();
    expect(photoUrl(3, new Date(1000))).toBe("/api/funcionarios/3/foto?v=1000");
  });
});
