'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock3, FileText, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import styles from './WhatsappPageContent.module.css';

interface Canal {
  telefone: string;
  ativo: boolean;
  optInEm: string | null;
  optOutEm: string | null;
  pausadoAte: string | null;
  prazoAtivo: boolean;
  resumoAtivo: boolean;
}
type Preferencias = Pick<Canal, 'prazoAtivo' | 'resumoAtivo'>;

/**
 * Os dois avisos, na ordem em que saem.
 *
 * `resumoAtivo` governa o template `diario_djen` e `prazoAtivo` o
 * `movimentacao_processo` — os dois únicos aprovados na conta da Meta. Os
 * nomes das colunas são herdados (`prazoAtivo` nasceu para um alerta de prazo
 * que não existe mais), e mantê-los é mais barato que uma migration por
 * cosmética.
 *
 * A cadência não é chute: a ronda roda em `MONITOR_CONSULTA_CRON`
 * (`0 8,14,20`), e o resumo é reservado por `(usuário, dia)` — sai uma vez, na
 * primeira passada que achar publicação. O teto de 5 é `TETO_AVISOS_POR_DIA`,
 * e ele é visível para quem recebe: quem tem 20 publicações num dia recebe 5
 * mensagens e o resto no PDF. Esconder isso faria parecer falha.
 */
const AVISOS = [
  [
    'resumoAtivo',
    'Publicações do dia',
    'Uma mensagem com quantas publicações saíram, a mais urgente detalhada, e um PDF com todas as outras — prazo e análise de cada uma.',
    'Uma vez por dia, na primeira varredura que encontrar publicação',
  ],
  [
    'prazoAtivo',
    'Movimentação por processo',
    'Uma mensagem por movimentação, com o que aconteceu e o prazo que ela abriu. Sai depois do resumo.',
    'Até 5 por dia · o excedente vai no PDF do resumo',
  ],
] as const;

function mascara(bruto: string): string {
  const d = bruto.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

async function requisitar(method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<Canal> {
  const res = await fetch('/api/whatsapp', {
    method,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Não foi possível salvar. Tente novamente.');
  return data;
}

export function WhatsappPageContent() {
  const [canal, setCanal] = useState<Canal | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [falhaCarga, setFalhaCarga] = useState(false);
  const [telefone, setTelefone] = useState('');
  const [editando, setEditando] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [preferencias, setPreferencias] = useState<Preferencias>({ prazoAtivo: true, resumoAtivo: true });
  // Abre no resumo do dia, que é o primeiro da lista e o primeiro a sair.
  const [previa, setPrevia] = useState<keyof Preferencias>('resumoAtivo');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp', { cache: 'no-store' });
      if (res.status === 204) setCanal(null);
      else {
        if (!res.ok) throw new Error('Falha ao carregar');
        const data: Canal = await res.json();
        setCanal(data);
        setPreferencias({ prazoAtivo: data.prazoAtivo, resumoAtivo: data.resumoAtivo });
      }
    } catch { setFalhaCarga(true); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const cadastrado = Boolean(canal?.optInEm && !canal.optOutEm);
  const precisaNumero = !cadastrado || editando;
  const alterado = precisaNumero || preferencias.prazoAtivo !== canal?.prazoAtivo || preferencias.resumoAtivo !== canal?.resumoAtivo;

  async function salvar() {
    setErro(null);
    setOk(null);
    const digitos = telefone.replace(/\D/g, '');
    if (precisaNumero && (digitos.length < 10 || digitos.length > 11)) {
      setErro('Informe o DDD e o número completo.');
      return;
    }
    if (precisaNumero && !aceito) {
      setErro('Autorize o recebimento dos avisos para continuar.');
      return;
    }
    setSalvando(true);
    let numeroSalvo = false;
    try {
      if (precisaNumero) {
        const data = await requisitar('POST', { telefone: `55${digitos}`, aceito: true, origem: 'painel' });
        setCanal(data);
        setEditando(false);
        setTelefone('');
        setAceito(false);
        numeroSalvo = true;
      }
      // O cadastro e as preferências têm endpoints distintos. Se só o segundo
      // falhar, conservamos o cadastro confirmado e as escolhas para repetir.
      const data = await requisitar('PATCH', preferencias);
      setCanal(data);
      setOk('Preferências salvas.');
    } catch (error) {
      setErro(numeroSalvo ? 'Número salvo, mas não foi possível salvar os tipos de aviso. Confira suas escolhas e tente salvar novamente.' : error instanceof Error ? error.message : 'Serviço indisponível. Tente novamente.');
    } finally { setSalvando(false); }
  }

  async function mudarEnvio(acao: 'retomar' | 'parar') {
    setSalvando(true);
    setErro(null);
    setOk(null);
    try {
      const data = await requisitar(acao === 'parar' ? 'DELETE' : 'PATCH', acao === 'retomar' ? { pausadoAte: null } : undefined);
      setCanal(data);
      setOk(acao === 'parar' ? 'Avisos interrompidos. Para voltar, informe o número e autorize o recebimento.' : 'Avisos retomados.');
    } catch (error) { setErro(error instanceof Error ? error.message : 'Serviço indisponível. Tente novamente.'); }
    finally { setSalvando(false); }
  }

  if (carregando) return <div className={styles.loading} role="status"><Loader2 size={18} className="animate-spin" aria-hidden="true" />Carregando suas preferências…</div>;
  if (falhaCarga) return <div className={styles.loading}><p role="alert">Não foi possível carregar suas preferências.</p><Button variant="outline" onClick={() => { setCarregando(true); setFalhaCarga(false); void carregar(); }}>Tentar novamente</Button></div>;

  return <div className={styles.container}>
    <p className={styles.description}>Escolha o que receber sobre seus processos e para qual número enviar.</p>
    <div className={styles.layout}>
      <form className={styles.settings} onSubmit={e => { e.preventDefault(); if (!salvando) void salvar(); }}>
        {cadastrado && !canal?.ativo && <div className={styles.pause}><p>Os avisos estão pausados. Suas preferências continuam guardadas.</p><button type="button" className={styles.link} disabled={salvando} onClick={() => void mudarEnvio('retomar')}>Retomar avisos</button></div>}
        {canal?.optOutEm && <p className={styles.note}>Os envios estão interrompidos. Para voltar, informe o número e autorize o recebimento abaixo.</p>}
        <h2 className={styles.section}>Número de destino</h2>
        {precisaNumero ? <div className={styles.numberForm}>
          <Field>
            <FieldLabel htmlFor="telefone">Celular com WhatsApp</FieldLabel>
            <div className={styles.phoneField}><span>+55</span><Input id="telefone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(61) 99999-0000" value={telefone} disabled={salvando} onChange={e => { setTelefone(mascara(e.target.value)); setOk(null); }} /></div>
            <FieldDescription>Informe o DDD e o número que deve receber os avisos.</FieldDescription>
          </Field>
          {editando && <button type="button" className={styles.link} disabled={salvando} onClick={() => { setEditando(false); setTelefone(''); setAceito(false); setErro(null); }}>Cancelar alteração do número</button>}
        </div> : <>
          <div className={styles.numberLine}><Smartphone size={22} aria-hidden="true" /><div className={styles.numberInfo}><strong>{canal?.telefone}</strong><span className={styles.state}>{canal?.ativo ? 'Avisos ativos' : 'Avisos pausados'}</span></div><button type="button" className={styles.link} disabled={salvando} onClick={() => { setEditando(true); setAceito(false); setOk(null); }}>Alterar número</button></div>
          <p className={styles.note}>Este número recebe os avisos da sua carteira de processos.</p>
        </>}
        <h2 className={styles.section}>O que receber</h2>
        {/* A ORDEM aqui é a ordem do envio: o resumo do dia sai primeiro e as
            movimentações vêm depois dele. Inverter na tela faria a pessoa
            esperar as bolhas antes do relatório.

            As chaves seguem sendo `resumoAtivo`/`prazoAtivo` — são colunas de
            `CanalWhatsapp`, e renomeá-las quebraria o contrato do backend por
            ganho cosmético. O que mudou foi o que elas governam. */}
        {AVISOS.map(([key, title, desc, cadence]) => <div key={key} className={styles.notice}>
          <div><label className={styles.noticeTitle} htmlFor={key}>{title}</label><p>{desc}</p><span className={styles.cadence}><Clock3 size={14} aria-hidden="true" />{cadence}</span></div>
          <Switch id={key} checked={preferencias[key]} disabled={salvando} onCheckedChange={v => { setPreferencias(p => ({ ...p, [key]: v })); setPrevia(key); setOk(null); }} />
        </div>)}
        <details className={styles.details}><summary>Quando não há novidades</summary><p>Dia sem publicação não gera mensagem nenhuma — nem o resumo, nem as movimentações. Desativar um aviso não interrompe o acompanhamento dos processos no painel.</p></details>
        <details className={styles.details}><summary>Por que só 5 movimentações por dia</summary><p>Uma carteira grande pode ter dezenas de publicações num único dia, e receber dezenas de mensagens em sequência é o que faz qualquer pessoa silenciar o número. As 5 saem por ordem de urgência — prazo mais próximo primeiro — e <strong>nenhuma se perde</strong>: todas as publicações do dia estão no PDF que acompanha o resumo, com o prazo e a análise de cada uma.</p></details>
        {precisaNumero && <label className={styles.consent}><Checkbox checked={aceito} disabled={salvando} onCheckedChange={v => setAceito(v === true)} aria-label="Autorizo receber avisos no WhatsApp" /><span>Autorizo o Ponto Processual a enviar avisos sobre meus processos neste WhatsApp. Posso cancelar por aqui ou responder <strong>PARE</strong> na conversa.</span></label>}
        {erro && <p className={styles.error} role="alert">{erro}</p>}
        <div className={styles.save}><p role="status">{ok || (alterado ? 'Alterações não salvas' : 'Preferências salvas')}</p><Button type="submit" disabled={salvando || (!alterado && !erro)}>{salvando && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}{!cadastrado ? 'Ativar avisos' : 'Salvar preferências'}</Button></div>
        {cadastrado && <div className={styles.stop}><p>Quer deixar de receber os avisos?<br />O acompanhamento dos processos continua no painel.</p><button type="button" className={styles.link} disabled={salvando} onClick={() => void mudarEnvio('parar')}>Parar de receber</button></div>}
      </form>
      <aside className={styles.preview} aria-label="Exemplo de mensagem no WhatsApp">
        <div className={styles.previewHead}><h2>Como chega no WhatsApp</h2><span>Exemplo</span></div>
        <div className={styles.previewTabs} role="group" aria-label="Tipo de mensagem"><button type="button" aria-pressed={previa === 'resumoAtivo'} onClick={() => setPrevia('resumoAtivo')}>Publicações do dia</button><button type="button" aria-pressed={previa === 'prazoAtivo'} onClick={() => setPrevia('prazoAtivo')}>Movimentação</button></div>
        <div className={styles.conversation}><div className={styles.chatHead}><strong>Ponto Processual</strong><span>Avisos sobre seus processos</span></div><div className={styles.chatBody}>
          {!preferencias[previa]
            ? <p className={styles.off}>Este tipo de aviso está desativado.<br />Ative a opção para ver o exemplo.</p>
            : previa === 'resumoAtivo'
              /* `diario_djen`. O cabeçalho é um DOCUMENTO obrigatório — a
                 mensagem não sai sem o PDF —, por isso o anexo aparece como
                 parte da bolha, e não como enfeite. */
              ? <div className={styles.bubble}>
                  <span className={styles.chatAnexo}><FileText size={15} aria-hidden="true" />publicacoes-2026-09-15.pdf</span>
                  <p>Olá, Dr. Matheus. Seu monitoramento processual registrou <strong>2 novas publicações</strong> no Diário Oficial em 15/09/2026.</p>
                  <p><strong>--- Atenção ---</strong></p>
                  <p className={styles.sample}>➡️ Agência de Fomento do Estado do RJ × Daniel Nunes Nascimento (0003777-06.2018.8.19.0083)</p>
                  <p>▪️ O juiz determinou a remessa dos autos ao juiz natural da causa, sem prazo ou providência exigida das partes.</p>
                  <p>O relatório em anexo traz as demais publicações do dia, com o prazo e a análise de cada uma.</p>
                  <span className={styles.rodape}>Ao acompanhar iremos notificar a cada nova movimentação</span>
                  <span className={styles.chatAction}>Acompanhar movimentaçoes</span>
                  <span className={styles.time}>08:12</span>
                </div>
              /* `movimentacao_processo`. Dois botões de resposta rápida, e o
                 segundo é o `Parar de acompanhar` — que hoje não tem quem o
                 receba, mas renderiza porque está no template aprovado. */
              : <div className={styles.bubble}>
                  <strong>Nova movimentação no processo 0003777-06.2018.8.19.0083</strong>
                  <p>Olá, Dr. Matheus. O processo que você acompanha registrou uma nova movimentação em 15/09/2026.</p>
                  <p><strong>--- Movimentação ---</strong></p>
                  <p className={styles.sample}>➡️ Agência de Fomento do Estado do RJ × Daniel Nunes Nascimento</p>
                  <p>▪️ Despacho determinando a retirada dos bens móveis do imóvel, cujo prazo anterior decorreu in albis.</p>
                  <p><strong>Prazo:</strong> ≈ faltam 15 dias, até 30/09/2026</p>
                  <p>Você recebe este aviso porque ativou o acompanhamento deste processo.</p>
                  <span className={styles.rodape}>Acompanhamento ativo neste processo</span>
                  <span className={styles.chatAction}>Entender todo o contexto</span>
                  <span className={styles.chatAction}>Parar de acompanhar</span>
                  <span className={styles.time}>08:13</span>
                </div>}
        </div></div>
        <p className={styles.previewNote}>{canal && !canal.ativo ? 'Os envios estão interrompidos. Esta é uma prévia dos avisos.' : 'Exemplo ilustrativo — o texto é o dos modelos aprovados. O símbolo ≈ marca a data que calculamos, e não a que o tribunal declarou.'}</p>
      </aside>
    </div>
  </div>;
}
