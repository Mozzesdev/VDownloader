import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseMediaString(
  input: string
): { type: string; ext: string; codec: string } | null {
  const regex = /^(\w+)\/([\w.]+);\s*codecs="([\w.]+)"/;
  const match = input.match(regex);

  if (!match) {
    return null; // Retorna null si la cadena no tiene el formato esperado
  }

  const [, type, ext, codecWithVersion] = match;
  const codec = codecWithVersion.split(".")[0].toUpperCase(); // Extrae el tipo del codec y lo convierte a mayúsculas

  return {
    type: type.toUpperCase(),
    ext: ext.toUpperCase(),
    codec,
  };
}

export function filterErrorMessage(input: string): string {
  return input.replace(/^Error invoking remote method '.*?':\s*/, "");
}

export function uuid(): string {
  // Crear un arreglo de 16 bytes aleatorios usando Math.random()
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }

  // Ajustar los valores según la especificación de UUID v4
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // 4 para la versión
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // 10xx para la variante

  // Convertir los bytes al formato UUID
  return Array.from(bytes)
    .map((byte, index) =>
      index === 4 || index === 6 || index === 8 || index === 10
        ? "-" + byte.toString(16).padStart(2, "0") // Añadir guiones
        : byte.toString(16).padStart(2, "0")
    )
    .join("");
}
