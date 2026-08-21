'use client';

import { useEffect, useState } from 'react';
import type { UsuarioAtual } from '@/lib/usuario';

/**
 * O usuário logado, para quem já está dentro de um Client Component — hoje, o
 * rodapé do menu.
 *
 * A busca é cacheada no módulo, não em estado de componente: o `AppLayout`
 * remonta a cada navegação de rota, e o `Sidebar` aparece duas vezes por tela
 * (fixo no desktop, drawer no mobile). Sem o cache seriam três ou quatro idas
 * a `/api/me` por clique no menu, e o nome piscaria a cada troca de página.
 *
 * O cache guarda a *promessa*: instâncias que montam juntas compartilham a
 * mesma requisição em voo em vez de dispararem uma cada.
 */
let emCache: Promise<UsuarioAtual | null> | null = null;

function buscar(): Promise<UsuarioAtual | null> {
  emCache ??= fetch('/api/me')
    .then(res => (res.ok ? (res.json() as Promise<UsuarioAtual>) : null))
    .catch(() => null)
    .then(usuario => {
      // Falha não fica grudada: sem isto, uma queda momentânea de rede deixaria
      // o menu anônimo até o próximo reload completo.
      if (!usuario) emCache = null;
      return usuario;
    });
  return emCache;
}

/** Zera o cache — chame depois de logout, para o próximo login não herdar o nome anterior. */
export function esquecerUsuarioAtual() {
  emCache = null;
}

export function useUsuarioAtual(): { usuario: UsuarioAtual | null; carregando: boolean } {
  const [usuario, setUsuario] = useState<UsuarioAtual | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    void buscar().then(u => {
      if (!vivo) return;
      setUsuario(u);
      setCarregando(false);
    });
    return () => { vivo = false; };
  }, []);

  return { usuario, carregando };
}
