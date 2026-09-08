'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock3, Loader2, Smartphone } from 'lucide-react';
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
  const [previa, setPrevia] = useState<keyof Preferencias>('prazoAtivo');
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
        {([['prazoAtivo', 'Alerta de novo prazo', 'Um aviso quando for identificado um novo prazo nos seus processos.', 'Quando um novo prazo for detectado'], ['resumoAtivo', 'Resumo das movimentações', 'As movimentações do dia reunidas em uma mensagem.', 'Todos os dias às 19h · horário de Brasília']] as const).map(([key, title, desc, cadence]) => <div key={key} className={styles.notice}>
          <div><label className={styles.noticeTitle} htmlFor={key}>{title}</label><p>{desc}</p><span className={styles.cadence}><Clock3 size={14} aria-hidden="true" />{cadence}</span></div>
          <Switch id={key} checked={preferencias[key]} disabled={salvando} onCheckedChange={v => { setPreferencias(p => ({ ...p, [key]: v })); setPrevia(key); setOk(null); }} />
        </div>)}
        <details className={styles.details}><summary>Quando não há novidades</summary><p>Dias sem movimentação não geram resumo. Desativar um aviso não interrompe o acompanhamento dos processos no painel.</p></details>
        {precisaNumero && <label className={styles.consent}><Checkbox checked={aceito} disabled={salvando} onCheckedChange={v => setAceito(v === true)} aria-label="Autorizo receber avisos no WhatsApp" /><span>Autorizo o Ponto Processual a enviar avisos sobre meus processos neste WhatsApp. Posso cancelar por aqui ou responder <strong>PARE</strong> na conversa.</span></label>}
        {erro && <p className={styles.error} role="alert">{erro}</p>}
        <div className={styles.save}><p role="status">{ok || (alterado ? 'Alterações não salvas' : 'Preferências salvas')}</p><Button type="submit" disabled={salvando || (!alterado && !erro)}>{salvando && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}{!cadastrado ? 'Ativar avisos' : 'Salvar preferências'}</Button></div>
        {cadastrado && <div className={styles.stop}><p>Quer deixar de receber os avisos?<br />O acompanhamento dos processos continua no painel.</p><button type="button" className={styles.link} disabled={salvando} onClick={() => void mudarEnvio('parar')}>Parar de receber</button></div>}
      </form>
      <aside className={styles.preview} aria-label="Exemplo de mensagem no WhatsApp">
        <div className={styles.previewHead}><h2>Como chega no WhatsApp</h2><span>Exemplo</span></div>
        <div className={styles.previewTabs} role="group" aria-label="Tipo de mensagem"><button type="button" aria-pressed={previa === 'prazoAtivo'} onClick={() => setPrevia('prazoAtivo')}>Alerta de prazo</button><button type="button" aria-pressed={previa === 'resumoAtivo'} onClick={() => setPrevia('resumoAtivo')}>Resumo diário</button></div>
        <div className={styles.conversation}><div className={styles.chatHead}><strong>Ponto Processual</strong><span>Avisos sobre seus processos</span></div><div className={styles.chatBody}>
          {!preferencias[previa] ? <p className={styles.off}>Este tipo de aviso está desativado.<br />Ative a opção para ver o exemplo.</p> : <div className={styles.bubble}>{previa === 'prazoAtivo' ? <><strong>Novo prazo identificado</strong><p>Intimação para manifestação</p><p className={styles.sample}>Processo de exemplo<br />0712345-00.2026.8.07.0001</p><p><strong>Vencimento: 15/09/2026</strong><br />Data estimada · confira o ato no painel.</p><span className={styles.chatAction}>Ver o prazo no Ponto</span><span className={styles.time}>14:32</span></> : <><strong>Seu resumo de hoje</strong><p>3 movimentações em 2 processos.</p><p><strong>Intimação</strong><br />Processo de exemplo · TJDFT</p><p><strong>Juntada de petição</strong><br />Processo de exemplo · TRF1</p><span className={styles.chatAction}>Ver o resumo completo</span><span className={styles.time}>19:00</span></>}</div>}
        </div></div>
        <p className={styles.previewNote}>{canal && !canal.ativo ? 'Os envios estão interrompidos. Esta é uma prévia dos avisos.' : 'Exemplo ilustrativo. O conteúdo varia conforme as informações disponíveis em cada processo.'}</p>
      </aside>
    </div>
  </div>;
}
