import type { Metadata } from 'next';
import Link from 'next/link';
import { BellRing, KeyRound, Scale, SearchX } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { CadastrarOab } from '@/components/dashboard/CadastrarOab/CadastrarOab';
import { CartaoDeTriagem } from '@/components/dashboard/CartaoDeTriagem/CartaoDeTriagem';
import { LinhaDeConfianca } from '@/components/dashboard/LinhaDeConfianca/LinhaDeConfianca';
import { MaisAdiante } from '@/components/dashboard/MaisAdiante/MaisAdiante';
import { SoParaSaber } from '@/components/dashboard/SoParaSaber/SoParaSaber';
import { Veredito } from '@/components/dashboard/Veredito/Veredito';
import { MarcarVistas } from '@/components/movimentacoes/MarcarVistas/MarcarVistas';
import { BaixarPrazo } from '@/components/prazos/BaixarPrazo/BaixarPrazo';
import { PainelSincronizando } from '@/components/varredura/PainelSincronizando';
import {
  getCanalWhatsapp,
  getMovimentacoes,
  getPrazos,
  getScraperSecrets,
  getTribunaisStatus,
  getUsuarioAtual,
} from '@/lib/api.server';
import { montarTriagem } from '@/lib/triagem';
import { formatarOab, type UsuarioAtual } from '@/lib/usuario';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Hoje',
  description: 'Caixa de triagem da sua carteira processual.',
};

export default async function DashboardPage() {
  const [prazoPage, movimentos, status, secrets, usuario, canalWhatsapp] = await Promise.all([
    getPrazos(1, 100),
    getMovimentacoes(1, 50, { novas: true }),
    getTribunaisStatus(),
    getScraperSecrets(),
    getUsuarioAtual(),
    getCanalWhatsapp(),
  ]);

  const novidades = movimentos.groups.flatMap(grupo => grupo.items);
  const triagem = montarTriagem(prazoPage.prazos, novidades);
  const totalProcessos = status.tribunals.reduce((soma, tribunal) => soma + tribunal.activeProcessesCount, 0);
  const temCarteira = totalProcessos > 0 || prazoPage.prazos.length > 0 || novidades.length > 0;
  const jaVarreu = Boolean(usuario.djenSyncedUntil) || secrets.some(secret => secret.isActive && secret.lastSuccessAt);
  const semWhatsapp = !canalWhatsapp?.optInEm || Boolean(canalWhatsapp.optOutEm);
  const prazosEmAberto = prazoPage.prazos.filter(prazo => !prazo.fechado && prazo.deQuem !== 'parteContraria').length;

  return (
    <AppLayout
      active="Dashboard"
      mobileTitle="Hoje"
      mobileBreadcrumb="Sua caixa de triagem"
      contadores={{ prazos: prazosEmAberto, movimentacoes: movimentos.naoVistas }}
    >
      <PageHeader basePath="/painel" eyebrow="Sua pauta" title="Hoje" breadcrumb="Início / Hoje" />

      <div className={styles.scroll}>
        <div className={styles.conteudo}>
          {semWhatsapp && !temCarteira && <AvisoSemWhatsapp temNumero={Boolean(canalWhatsapp?.telefone)} />}

          {!temCarteira ? (
            !usuario.oab ? <PainelSemOab />
              : !jaVarreu ? <PainelSincronizando oab={usuario.oab} />
                : <PainelSemResultado oab={usuario.oab} />
          ) : (
            <>
              <div className={styles.abertura}>
                <Veredito itens={triagem.veredito} />
                <LinhaDeConfianca tribunais={status.tribunals} djenSyncedUntil={usuario.djenSyncedUntil} />
              </div>

              {triagem.grupos.length === 0 ? (
                <EstadoZerado baixados={triagem.baixados} />
              ) : (
                <div className={styles.corpo}>
                  <main className={styles.pilha}>
                    {triagem.grupos.map(grupo => (
                      <section key={grupo.chave} id={grupo.chave} className={styles.grupo}>
                        <header className={styles.grupoCabecalho}>
                          <div><span>{grupo.total}</span><h2>{grupo.titulo}</h2></div>
                          {grupo.chave === 'chegou' && grupo.total > 0 && (
                            <MarcarVistas vistasAte={movimentos.vistasAte} destino="/painel" />
                          )}
                        </header>
                        <div className={styles.cartoes}>
                          {grupo.itens.map(item => (
                            <CartaoDeTriagem
                              key={item.tipo === 'prazo' ? item.prazo.id : item.movimentacao.id}
                              item={item}
                              grupo={grupo.chave}
                            />
                          ))}
                        </div>
                        {grupo.excedentes > 0 && (
                          <Link href={grupo.chave === 'chegou' ? '/movimentacoes?vista=novas' : '/prazos'} className={styles.excedentes}>
                            Mais {grupo.excedentes} {grupo.excedentes === 1 ? 'item' : 'itens'} nesta pergunta ›
                          </Link>
                        )}
                      </section>
                    ))}
                  </main>

                  <aside className={styles.lateral}>
                    <MaisAdiante prazos={triagem.maisAdiante} />
                    <SoParaSaber processos={triagem.soParaSaber.processos} cartorio={triagem.soParaSaber.cartorio} />
                    <Whatsapp ativo={Boolean(canalWhatsapp?.ativo)} telefone={canalWhatsapp?.telefone ?? null} />
                  </aside>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function EstadoZerado({ baixados }: { baixados: ReturnType<typeof montarTriagem>['baixados'] }) {
  return (
    <section className={styles.zerado}>
      <span className={styles.zeradoMarca}>✓</span>
      <h2>Nada pede sua ação agora.</h2>
      <p>A varredura está em dia. O que vencer depois continua na seção “Mais adiante”.</p>
      {baixados.length > 0 && (
        <div className={styles.baixados}>
          <h3>Baixados · {baixados.length}</h3>
          {baixados.slice(0, 5).map(prazo => (
            <div key={prazo.id}><span>{prazo.ato?.ia.peca || prazo.tipo}</span><BaixarPrazo prazoId={prazo.id} fechado compacto /></div>
          ))}
        </div>
      )}
      <Link href="/prazos">Ver a semana completa ›</Link>
    </section>
  );
}

function Whatsapp({ ativo, telefone }: { ativo: boolean; telefone: string | null }) {
  return (
    <Link href="/whatsapp" className={styles.whatsapp}>
      <BellRing aria-hidden="true" />
      <span><strong>{ativo ? 'Avisos ativos' : 'Ative seus avisos'}</strong><small>{telefone || 'WhatsApp ainda não informado'}</small></span>
      <b aria-hidden="true">›</b>
    </Link>
  );
}

function AvisoSemWhatsapp({ temNumero }: { temNumero: boolean }) {
  return (
    <div className={styles.avisoCanal} role="status">
      <div><strong>{temNumero ? 'Falta autorizar os avisos no WhatsApp' : 'Falta o seu WhatsApp'}</strong><p>{temNumero ? 'Nada é enviado até você autorizar.' : 'É por ele que publicação e prazo chegam no mesmo dia.'}</p></div>
      <Link href="/whatsapp">{temNumero ? 'Autorizar' : 'Informar número'} ›</Link>
    </div>
  );
}

function PainelSemOab() {
  return (
    <div className={styles.vazio}>
      <Scale aria-hidden="true" />
      <h2>Falta a sua OAB</h2>
      <p>É pela OAB que localizamos seus processos nos diários oficiais. Informe abaixo; não precisa da senha de tribunal.</p>
      <CadastrarOab rotuloBotao="Buscar meus processos" />
      <Link href="/credenciais"><KeyRound aria-hidden="true" /> Prefiro conectar o login de um tribunal</Link>
    </div>
  );
}

function PainelSemResultado({ oab }: { oab: NonNullable<UsuarioAtual['oab']> }) {
  return (
    <div className={styles.vazio}>
      <SearchX aria-hidden="true" />
      <h2>Nada publicado para a OAB {formatarOab(oab)}</h2>
      <p>Procuramos nos diários oficiais e não encontramos publicações recentes. Confira a inscrição ou conecte um tribunal.</p>
      <CadastrarOab oabInicial={oab} rotuloBotao="Procurar de novo" />
      <Link href="/credenciais"><KeyRound aria-hidden="true" /> Conectar o login de um tribunal</Link>
    </div>
  );
}
