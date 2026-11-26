/**
 * Foto da funcionária.
 * Limite de 5 MB, como Google, Facebook e a maioria dos sistemas para foto de perfil (GitHub aceita 1 MB, X 2 MB; fotos
 * tiradas no celular costumam passar de 2 MB, então um limite menor atrapalharia). O servidor reduz a imagem para
 * 256×256 em WebP, então o banco guarda só alguns KB por foto.
 */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MAX_MB = 5;
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
export const PHOTO_SIZE_PX = 256;

/** Identifica o formato pelos primeiros bytes (não confia no nome nem no tipo declarado pelo navegador). */
export function sniffImageType(buf: Uint8Array): "jpeg" | "png" | "webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return "png";
  if (buf.length >= 12 && String.fromCharCode(...buf.subarray(0, 4)) === "RIFF" && String.fromCharCode(...buf.subarray(8, 12)) === "WEBP") return "webp";
  return null;
}

/** Iniciais para quando não há foto: primeira letra do primeiro e do último nome. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : "";
  return (first + last).toUpperCase();
}

export function photoUrl(employeeId: number, photoUpdatedAt: Date | null | undefined): string | null {
  return photoUpdatedAt ? `/api/funcionarios/${employeeId}/foto?v=${photoUpdatedAt.getTime()}` : null;
}
