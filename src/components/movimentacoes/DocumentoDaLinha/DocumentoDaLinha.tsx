import { FileText, Lock } from 'lucide-react';
import type { Movimentacao } from '@/types';
import { DocumentoLink } from '../DocumentoLink/DocumentoLink';
import styles from './DocumentoDaLinha.module.css';

type ComDocumento = Pick<Movimentacao, 'id' | 'documentoEstado' | 'temDocumentoDoAto' | 'temCertidao'>;

/**
 * Dá para abrir o documento deste ato? A resposta, sem abrir o ato.
 *
 * A mesma regra que `MovimentacaoRow` já usava: a PEÇA quando o tribunal a
 * serve, senão a certidão de publicação (100% dos atos do diário). Sem nenhuma
 * das duas e com bloqueio — declarado pelo tribunal ou medido por nós —, o
 * cadeado, sem clique.
 */
export function viaDoDocumento(m: ComDocumento): { url: string; peca: boolean } | 'trancado' | null {
  const estado = m.documentoEstado ?? 'nenhum';
  const abre = estado === 'disponivel' || Boolean(m.temDocumentoDoAto);
  if (abre) return { url: `/api/movimentacoes/${encodeURIComponent(m.id)}/documento`, peca: true };
  if (m.temCertidao) return { url: `/api/movimentacoes/${encodeURIComponent(m.id)}/certidao`, peca: false };
  if (estado === 'trancado' || estado === 'provavelIndisponivel') return 'trancado';
  return null;
}

/**
 * `icone` é o botão de 48px da linha; `sem acesso` é o rótulo com cadeado da
 * lista "Só cartório", onde há largura para dizer por quê.
 */
export function DocumentoDaLinha({ m, variante = 'icone' }: { m: ComDocumento; variante?: 'icone' | 'rotulo' }) {
  const via = viaDoDocumento(m);
  if (!via) return null;

  if (via === 'trancado') {
    const motivo = m.documentoEstado === 'trancado'
      ? 'O tribunal ainda não liberou este documento'
      : 'O portal cita um documento, mas já respondeu que não o serve';
    return (
      <span className={variante === 'rotulo' ? styles.trancadoRotulo : styles.trancado} title={motivo}>
        <Lock size={variante === 'rotulo' ? 14 : 16} aria-hidden="true" />
        {variante === 'rotulo' ? 'sem acesso' : <span className="sr-only">{motivo}</span>}
      </span>
    );
  }

  const rotulo = via.peca ? 'Abrir o documento do ato' : 'Abrir a certidão de publicação';
  return (
    <DocumentoLink url={via.url} className={styles.link} title={rotulo}>
      <FileText size={20} aria-hidden="true" />
      <span className="sr-only">{rotulo}</span>
    </DocumentoLink>
  );
}
