import sharp from "sharp";
import { PHOTO_MAX_BYTES, PHOTO_MAX_MB, PHOTO_SIZE_PX, sniffImageType } from "./employee-photo-shared";

export class PhotoError extends Error {}

export type ProcessedPhoto = { data: Buffer; contentType: "image/webp" };

/** Valida (tamanho e formato) e reduz a foto. Lança PhotoError com mensagem pronta para a tela. */
export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  if (file.size > PHOTO_MAX_BYTES) throw new PhotoError(`A foto é maior que ${PHOTO_MAX_MB} MB. Escolha uma imagem menor.`);
  const input = Buffer.from(await file.arrayBuffer());
  if (input.length > PHOTO_MAX_BYTES) throw new PhotoError(`A foto é maior que ${PHOTO_MAX_MB} MB. Escolha uma imagem menor.`);
  if (!sniffImageType(input)) throw new PhotoError("O arquivo não é uma imagem válida. Envie uma foto em JPG, PNG ou WebP.");
  try {
    const data = await sharp(input, { limitInputPixels: 50_000_000, failOn: "error" })
      .rotate() // respeita a orientação gravada pelo celular
      .resize(PHOTO_SIZE_PX, PHOTO_SIZE_PX, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
    return { data, contentType: "image/webp" };
  } catch {
    throw new PhotoError("Não foi possível ler essa imagem. Ela pode estar corrompida ou ser grande demais; tente outra foto.");
  }
}

