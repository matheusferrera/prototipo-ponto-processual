import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Constrói uma query string mesclando os params atuais com alterações.
 * Params vazios/undefined são omitidos (ex.: opção "TODOS" limpa o filtro).
 * Retorna "" quando não há nenhum param.
 */
export function buildQuery(
  current: Record<string, string | undefined>,
  changes: Record<string, string | undefined> = {},
): string {
  const merged: Record<string, string> = {}
  for (const [key, value] of Object.entries({ ...current, ...changes })) {
    if (value !== undefined && value !== "") merged[key] = value
  }
  const qs = new URLSearchParams(merged).toString()
  return qs ? `?${qs}` : ""
}
