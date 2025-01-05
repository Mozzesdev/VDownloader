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
