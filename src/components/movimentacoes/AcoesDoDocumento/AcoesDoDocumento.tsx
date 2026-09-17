import { ArrowUpRight, FileText } from 'lucide-react';
import type { MovimentacaoDetail } from '@/lib/api.server';
import { DocumentoLink } from '../DocumentoLink/DocumentoLink';
import styles from './AcoesDoDocumento.module.css';

/**
 * OS DOCUMENTOS DO ATO, como botões — o rodapé do card e a barra do painel.
 *
 * | botão | quando |
 * |---|---|
 * | **Abrir documento** (cheio) | o tribunal serve a peça |
 * | **Certidão de publicação** (cheio, ou contorno ao lado da peça) | o ato saiu no diário — 100% do DJEN |
 * | **Ver no TRIBUNAL ↗** | o link do ato não é o documento (o PJe, com captcha) |
 *
 * A peça vem na frente da certidão quando as duas existem: a peça é o ato, a
 * certidão prova que ele foi publicado. A lista completa (e as peças
 * trancadas, com o motivo) fica no bloco "Processo" do corpo.
 *
 * `DocumentoLink` busca antes de abrir: quando a rota responde o JSON de erro
 * (peça que o token do serviço não alcança), a mensagem substitui o botão em
 * vez de uma aba com JSON cru.
 */
export function AcoesDoDocumento({ mov }: { mov: MovimentacaoDetail }) {
  const { peca, certidao, linkAvulso } = viasDoAto(mov);
  const tribunal = mov.processData?.tribunal.replace(/G[12]$/, '') || 'tribunal';

  if (!peca && !certidao && !linkAvulso) return null;

  return (
    <div className={styles.acoes} data-com-extra={peca || linkAvulso ? '' : undefined}>
      {peca && (
        <DocumentoLink
          url={peca.url}
          className={styles.principal}
          title={peca.provavelIndisponivel
            ? 'O tribunal costuma não servir este arquivo — o portal referencia a peça, mas o download volta vazio na maioria das vezes.'
            : undefined}
        >
          <FileText size={18} aria-hidden="true" />
          {peca.provavelIndisponivel ? 'Documento (pode não abrir)' : 'Abrir documento'}
        </DocumentoLink>
      )}

      {certidao && (
        <DocumentoLink url={certidao} className={peca ? styles.secundario : styles.principal}>
          {!peca && <FileText size={18} aria-hidden="true" />}
          {/* Um span só: o botão é flex com `gap`, e o pedaço opcional solto
              viraria um terceiro item, com o vão entre "Certidão" e "de". */}
          <span>{peca ? 'Certidão' : <>Certidão<span className={styles.longo}> de publicação</span></>}</span>
        </DocumentoLink>
      )}

      {/* Saída SECUNDÁRIA, e com o aviso: o link do PJe serve uma página com
          hCaptcha, não o documento. */}
      {linkAvulso && (
        <a
          href={linkAvulso}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.secundario}
          title="O tribunal costuma pedir captcha nesta página."
        >
          Ver no {tribunal}
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

function viasDoAto(mov: MovimentacaoDetail) {
  const pecas = mov.documentos.filter(doc => doc.url);
  return {
    peca: pecas.find(doc => !doc.provavelIndisponivel) ?? pecas[0] ?? null,
    certidao: mov.temCertidao ? `/api/movimentacoes/${encodeURIComponent(mov.id)}/certidao` : null,
    linkAvulso: mov.link && !mov.documentos.some(doc => doc.url === mov.link) ? mov.link : null,
  };
}

/** Há algum botão a mostrar? Sem isto o rodapé do card desenharia uma faixa vazia. */
export function temAcoesDeDocumento(mov: MovimentacaoDetail): boolean {
  const { peca, certidao, linkAvulso } = viasDoAto(mov);
  return Boolean(peca || certidao || linkAvulso);
}
