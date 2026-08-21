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

/**
 * Destino interno seguro para redirecionar. Só caminho absoluto do próprio
 * site: `//evil.com` e `https://evil.com` são endereços externos válidos, e
 * aceitá-los transformaria o `?next=` num redirecionador aberto — atacante
 * manda o link do NOSSO login e a pessoa termina noutro site, autenticada e
 * sem perceber a troca.
 */
export function destinoSeguro(valor: string | null | undefined, padrao = "/"): string {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//")) return padrao
  return valor
}
