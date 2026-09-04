'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import styles from './WhatsappPageContent.module.css';

/** O que `GET /users/me/whatsapp` devolve — telefone já mascarado pela API. */
interface Canal {
  telefone: string;
  ativo: boolean;
  optInEm: string | null;
  optOutEm: string | null;
  pausadoAte: string | null;
  prazoAtivo: boolean;
  resumoAtivo: boolean;
}

/**
 * Máscara de digitação: `(61) 99169-8451`.
 *
 * Formatar enquanto digita não é enfeite — o campo aceita 10 ou 11 dígitos
 * depois do DDD, e sem os parênteses e o hífen a pessoa não percebe que errou
 * a contagem. Guardamos só os dígitos; o `+55` é acrescentado no envio.
 */
function mascara(bruto: string): string {
  const d = bruto.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function WhatsappPageContent() {
  const [canal, setCanal] = useState<Canal | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [telefone, setTelefone] = useState('');
  const [aceito, setAceito] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/whatsapp', { cache: 'no-store' });
        // 204 = nunca cadastrou. Estado normal, não erro.
        if (res.status === 204) setCanal(null);
        else if (res.ok) setCanal(await res.json());
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  async function salvar() {
    setErro(null);
    setOk(null);
    const digitos = telefone.replace(/\D/g, '');
    if (digitos.length < 10) {
      setErro('Informe o DDD e o número completo.');
      return;
    }
    if (!aceito) {
      setErro('Marque a autorização para receber os avisos.');
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: `55${digitos}`, aceito: true, origem: 'painel' }),
      });
      const corpo = await res.json();
      if (!res.ok) {
        setErro(corpo?.error ?? 'Não foi possível salvar.');
        return;
      }
      setCanal(corpo);
      setTelefone('');
      setAceito(false);
      setOk('Número cadastrado. Os avisos começam na próxima varredura.');
    } catch {
      setErro('Serviço indisponível. Tente de novo em instantes.');
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(campo: 'prazoAtivo' | 'resumoAtivo', valor: boolean) {
    // Otimista: o switch responde na hora e volta atrás se a API recusar —
    // esperar o round-trip faz o controle parecer travado.
    setCanal(c => (c ? { ...c, [campo]: valor } : c));
    const res = await fetch('/api/whatsapp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [campo]: valor }),
    });
    if (res.ok) setCanal(await res.json());
    else setCanal(c => (c ? { ...c, [campo]: !valor } : c));
  }

  async function sair() {
    setSalvando(true);
    try {
      const res = await fetch('/api/whatsapp', { method: 'DELETE' });
      if (res.ok) {
        setCanal(await res.json());
        setOk('Você não receberá mais avisos. Para voltar, cadastre o número de novo.');
      }
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <Loader2 className="animate-spin" size={18} />
        </div>
      </div>
    );
  }

  const cadastrado = canal && !canal.optOutEm;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Avisos no WhatsApp</h2>
        <p className={styles.desc}>
          Receba um alerta quando um processo seu abrir prazo, e um resumo no fim do dia
          com o que se moveu. Sem precisar abrir o painel para descobrir.
        </p>

        {erro && <p className={styles.erro} role="alert">{erro}</p>}
        {ok && <p className={styles.ok}>{ok}</p>}

        {cadastrado ? (
          <>
            <div className={styles.status} style={{ marginTop: 20 }}>
              <MessageSquare size={16} />
              <span className={styles.numero}>{canal.telefone}</span>
              <span className={`${styles.selo} ${canal.ativo ? styles.seloAtivo : styles.seloInativo}`}>
                {canal.ativo ? 'recebendo' : 'pausado'}
              </span>
            </div>

            <div className={styles.switches}>
              <div className={styles.linhaSwitch}>
                <div className={styles.switchTexto}>
                  <div className={styles.switchTitulo}>Alerta de prazo</div>
                  <p className={styles.switchDesc}>
                    Chega assim que um prazo novo é detectado. É o único aviso que interrompe.
                  </p>
                </div>
                <Switch
                  checked={canal.prazoAtivo}
                  onCheckedChange={v => void alternar('prazoAtivo', v)}
                />
              </div>

              <div className={styles.linhaSwitch}>
                <div className={styles.switchTexto}>
                  <div className={styles.switchTitulo}>Resumo do fim do dia</div>
                  <p className={styles.switchDesc}>
                    Uma mensagem só, às 19h, com o que se moveu. Dia sem movimentação não gera aviso.
                  </p>
                </div>
                <Switch
                  checked={canal.resumoAtivo}
                  onCheckedChange={v => void alternar('resumoAtivo', v)}
                />
              </div>
            </div>

            <div className={styles.acoes} style={{ marginTop: 20 }}>
              <Button variant="outline" size="sm" onClick={() => void sair()} disabled={salvando}>
                Parar de receber
              </Button>
            </div>
          </>
        ) : (
          <div className={styles.form}>
            <Field>
              <FieldLabel htmlFor="telefone">Celular com WhatsApp</FieldLabel>
              <Input
                id="telefone"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="(61) 99169-8451"
                value={telefone}
                onChange={e => setTelefone(mascara(e.target.value))}
              />
              <FieldDescription>
                Só números brasileiros. É para onde os avisos vão — confira antes de salvar.
              </FieldDescription>
            </Field>

            <label className={styles.consent}>
              <Checkbox
                checked={aceito}
                onCheckedChange={v => setAceito(v === true)}
                aria-label="Autorizo receber avisos no WhatsApp"
              />
              <span className={styles.consentText}>
                Autorizo o Ponto Processual a enviar avisos sobre meus processos neste
                WhatsApp. Posso sair quando quiser, por aqui ou respondendo <strong>PARE</strong>{' '}
                na conversa.
              </span>
            </label>

            <div className={styles.acoes}>
              <Button size="sm" onClick={() => void salvar()} disabled={salvando}>
                {salvando ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                Salvar número
              </Button>
            </div>
          </div>
        )}

        <p className={styles.rodape}>
          Confira o número com atenção: os avisos citam o número do processo e o nome das
          partes, então um dígito trocado entrega informação do seu cliente a um
          desconhecido.
        </p>
      </div>
    </div>
  );
}
