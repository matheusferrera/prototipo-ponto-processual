import { FileText, Lock } from 'lucide-react';
import type { TimelineEvent } from '@/types';
import { DocumentoLink } from '@/components/movimentacoes/DocumentoLink/DocumentoLink';
import styles from './PecasQueAbrem.module.css';

/** Uma peça do processo, já resolvida em "abre" ou "não abre, e por quê". */
interface Peca {
  chave: string;
  nome: string;
  /** `null` quando não há o que abrir — aí a linha é um cadeado com motivo. */
  url: string | null;
  motivo?: string;
  data: string;
}

/**
 * § PEÇAS QUE ABREM — o que substitui a aba "Documentos".
 *
 * ## Por que a aba saiu
 *
 * **195 de 309 pedidos de arquivo ao portal (63%) voltam sem nada.** O
 * contador no rótulo da aba prometia um acervo; o clique entregava uma lista
 * de links mortos, e a promessa era repetida em toda visita. O erro não é o
 * tribunal não servir a peça — é a tela oferecer um botão que sabe que vai
 * voltar vazio.
 *
 * ## O que esta calha faz diferente
 *
 * Ela **nomeia o que não abre**, em vez de esconder ou de oferecer mesmo
 * assim. `documentoEstado` tem quatro valores e os dois negativos são fatos
 * diferentes: `trancado` é o tribunal declarando o bloqueio ("pendente de
 * ciência"), `provavelIndisponivel` é medição nossa — a chave já foi pedida e
 * voltou 404. Os dois viram cadeado; o motivo distingue no rótulo.
 *
 * A certidão de publicação entra como peça de verdade: é o PDF oficial do CNJ,
 * com capa, destinatário, advogados com OAB e o teor integral — e o CNJ a
 * serve para 100% do diário, o que a torna a única peça garantida numa
 * carteira que veio de descoberta pública.
 */
export function PecasQueAbrem({ eventos, totalComPeca, limite = 6 }: {
  /** As movimentações com documento, as mais recentes primeiro. */
  eventos: TimelineEvent[];
  /** Quantas movimentações deste processo têm peça, no acervo inteiro. */
  totalComPeca: number;
  limite?: number;
}) {
  const pecas: Peca[] = [];

  for (const e of eventos) {
    const quando = `${e.date}`;

    for (const [i, doc] of e.documentos.entries()) {
      if (doc.url) pecas.push({ chave: `${e.id}-d${i}`, nome: doc.nome, url: doc.url, data: quando });
      else pecas.push({
        chave: `${e.id}-d${i}`, nome: doc.nome, url: null, data: quando,
        motivo: doc.indisponibilidade ?? 'o portal referencia e não serve',
      });
    }

    if (e.temDocumentoDoAto) {
      pecas.push({
        chave: `${e.id}-ato`, nome: 'Documento do ato',
        url: `/api/movimentacoes/${encodeURIComponent(e.id)}/documento`, data: quando,
      });
    }

    if (e.temCertidao) {
      pecas.push({
        chave: `${e.id}-cert`, nome: 'Certidão de publicação',
        url: `/api/movimentacoes/${encodeURIComponent(e.id)}/certidao`, data: quando,
      });
    }

    /* Ato bloqueado sem nenhuma peça própria: a linha existe para NOMEAR o
       bloqueio. Sem ela o ato simplesmente não apareceria, e a ausência seria
       indistinguível de "não há documento". */
    if (e.documentos.length === 0 && !e.temDocumentoDoAto && !e.temCertidao
      && (e.documentoEstado === 'trancado' || e.documentoEstado === 'provavelIndisponivel')) {
      pecas.push({
        chave: `${e.id}-bloq`, nome: e.title, url: null, data: quando,
        motivo: e.documentoEstado === 'trancado' ? 'pendente de ciência' : 'já voltou vazio',
      });
    }
  }

  if (pecas.length === 0) {
    return (
      <p className={styles.vazio}>
        Nenhuma peça deste processo está disponível nesta consulta. O portal referencia
        documentos que não serve — quando um deles abrir, ele aparece aqui.
      </p>
    );
  }

  const mostradas = pecas.slice(0, limite);
  const abrem = mostradas.filter(p => p.url).length;

  return (
    <div className={styles.calha}>
      <ul className={styles.lista}>
        {mostradas.map(peca => (
          <li key={peca.chave} className={styles.item}>
            {peca.url ? (
              <DocumentoLink url={peca.url} className={styles.link} title="Abrir a peça">
                <FileText aria-hidden="true" size={15} strokeWidth={2} />
                <span className={styles.nome}>{peca.nome}</span>
              </DocumentoLink>
            ) : (
              <span className={styles.trancada} title={peca.motivo}>
                <Lock aria-hidden="true" size={15} strokeWidth={2} />
                <span className={styles.nome}>
                  {peca.nome}
                  <span className={styles.motivo}> — {peca.motivo}</span>
                </span>
              </span>
            )}
            <span className={styles.data}>{peca.data}</span>
          </li>
        ))}
      </ul>

      {/* A conta é do que ESTÁ NA TELA, não uma estatística global: "5 das 14"
          precisa ser verdade sobre estas linhas. O total do acervo entra como
          contexto, separado. */}
      <p className={styles.nota}>
        {abrem} das {mostradas.length} peças mais recentes abrem.
        {totalComPeca > 0 && ` Este processo tem ${totalComPeca} ${totalComPeca === 1 ? 'movimentação' : 'movimentações'} com peça.`}
        {' '}O cadeado marca o que o portal referencia e não serve.
      </p>
    </div>
  );
}
