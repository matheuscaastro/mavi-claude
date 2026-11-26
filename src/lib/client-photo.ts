import sharp from "sharp";
import { PHOTO_MAX_BYTES, PHOTO_MAX_MB, sniffImageType } from "./employee-photo-shared";

export class ClientPhotoError extends Error {}

export const CLIENT_PHOTO_MAX_PX = 1280;

/** Valida e reduz a foto da cliente (lado maior de 1280 px, WebP). Lança ClientPhotoError com mensagem pronta para a tela. */
export async function processClientPhoto(file: File): Promise<{ data: Buffer; contentType: "image/webp" }> {
  if (file.size > PHOTO_MAX_BYTES) throw new ClientPhotoError(`A foto é maior que ${PHOTO_MAX_MB} MB. Escolha uma imagem menor.`);
  const input = Buffer.from(await file.arrayBuffer());
  if (input.length > PHOTO_MAX_BYTES) throw new ClientPhotoError(`A foto é maior que ${PHOTO_MAX_MB} MB. Escolha uma imagem menor.`);
  if (!sniffImageType(input)) throw new ClientPhotoError("O arquivo não é uma imagem válida. Envie uma foto em JPG, PNG ou WebP.");
  try {
    const data = await sharp(input, { limitInputPixels: 50_000_000, failOn: "error" })
      .rotate()
      .resize(CLIENT_PHOTO_MAX_PX, CLIENT_PHOTO_MAX_PX, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return { data, contentType: "image/webp" };
  } catch {
    throw new ClientPhotoError("Não foi possível ler essa imagem. Ela pode estar corrompida ou ser grande demais; tente outra foto.");
  }
}
