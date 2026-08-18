'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, KeyRound, Loader2, Scale, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { CredentialSheet, type CredentialSheetTarget } from '@/components/credenciais/CredentialSheet/CredentialSheet';
import type { SistemaGroup, ScraperSecretView } from '@/lib/credenciais';
import styles from './OnboardingFlow.module.css';

interface DjenTribunalPreview {
  sigla: string;
  processos: number;
  suportado: boolean;
}

interface DjenPreview {
  totalProcessos: number;
  tribunais: DjenTribunalPreview[];
}

type Stage = 'oab' | 'resultado' | 'erro';

export function OnboardingFlow({ sistemas }: { sistemas: SistemaGroup[] }) {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('oab');
  const [oabNumero, setOabNumero] = useState('');
  const [oabUf, setOabUf] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [preview, setPreview] = useState<DjenPreview | null>(null);
  const [erro, setErro] = useState('');

  const [sheetTarget, setSheetTarget] = useState<CredentialSheetTarget | null>(null);
  const [saved, setSaved] = useState<ScraperSecretView | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  /**
   * Sigla (formato do DJEN, ex. "TRF1") → nome completo do tribunal. Usa
   * `grau.id` (o enum `Tribunal` cru, ex. "TRF1G1") em vez de `grupo.id`
   * (que vem de `baseCodigo`, ex. "TRF-1" com hífen) — é o `grau.id` sem o
   * sufixo de grau que bate exatamente com `siglaTribunal` do DJEN.
   */
  const nomePorSigla = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sistemas) {
      for (const g of s.grupos) {
        for (const grau of g.graus) map.set(grau.id.replace(/G[12]$/, ''), g.nome);
      }
    }
    return map;
  }, [sistemas]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function handleBuscar(e: FormEvent) {
    e.preventDefault();
    if (!oabNumero.trim() || !oabUf.trim()) return;

    setBuscando(true);
    setErro('');
    try {
      const params = new URLSearchParams({ oabNumero: oabNumero.trim(), oabUf: oabUf.trim().toUpperCase() });
      const res = await fetch(`/api/scraper/preview-djen?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? 'Não foi possível consultar o DJEN agora.');
        setStage('erro');
        return;
      }
      setPreview(data as DjenPreview);
      setStage('resultado');
    } catch {
      setErro('Falha ao conectar ao servidor.');
      setStage('erro');
    } finally {
      setBuscando(false);
    }
  }

  function abrirCredencial() {
    setSheetTarget({
      mode: 'create',
      presetOabNumero: oabNumero.trim(),
      presetOabUf: oabUf.trim().toUpperCase(),
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} />
          <span>Ponto Processual</span>
        </div>
        <button type="button" className={styles.logout} onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Saindo…' : 'Sair'}
        </button>
      </div>

      <div className={styles.content}>
        {saved ? (
          <div className={styles.card}>
            <div className={`${styles.icon} ${styles.iconDone}`}>
              <Check size={22} />
            </div>
            <div className={styles.title}>Credencial cadastrada</div>
            <p className={styles.desc}>
              Vamos buscar seus processos usando &quot;{saved.label}&quot; agora. A primeira sincronização
              pode levar alguns minutos — você já pode explorar o resto da plataforma enquanto isso.
            </p>
            <div className={styles.actions}>
              <Button type="button" variant="outline" onClick={() => setSheetTarget({ mode: 'create' })}>
                <KeyRound size={14} /> Cadastrar outro tribunal
              </Button>
              <Button type="button" onClick={() => router.push('/')}>
                Ir para o dashboard →
              </Button>
            </div>
          </div>
        ) : stage === 'oab' ? (
          <form className={`${styles.card} ${styles.cardWide}`} onSubmit={handleBuscar}>
            <div className={styles.icon}>
              <Scale size={22} />
            </div>
            <div className={styles.eyebrow}>Primeiro acesso</div>
            <div className={styles.title}>Vamos localizar seus processos</div>
            <p className={styles.desc}>
              Informe sua OAB — a gente consulta o Diário de Justiça Eletrônico Nacional (DJEN) e mostra
              quantos processos e em quais tribunais você tem atividade. Essa busca é pública: ainda não
              precisa de login nem senha de nenhum tribunal.
            </p>

            <FieldSet className={styles.oabFieldSet}>
              <div className={styles.oabRow}>
                <Field>
                  <FieldLabel htmlFor="onb-oab-numero">Número da OAB</FieldLabel>
                  <Input
                    id="onb-oab-numero"
                    value={oabNumero}
                    onChange={e => setOabNumero(e.target.value)}
                    placeholder="12345"
                    autoFocus
                  />
                </Field>
                <Field className={styles.oabUfField}>
                  <FieldLabel htmlFor="onb-oab-uf">UF</FieldLabel>
                  <Input
                    id="onb-oab-uf"
                    value={oabUf}
                    onChange={e => setOabUf(e.target.value.toUpperCase())}
                    placeholder="DF"
                    maxLength={2}
                  />
                </Field>
              </div>
              <FieldDescription>Mesma OAB e UF que aparecem nas suas publicações.</FieldDescription>
            </FieldSet>

            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={() => router.push('/')}>
                Pular por agora
              </Button>
              <Button type="submit" disabled={buscando || !oabNumero.trim() || !oabUf.trim()}>
                {buscando ? <Loader2 size={14} className={styles.spin} /> : <Search size={14} />}
                {buscando ? 'Buscando…' : 'Buscar meus processos'}
              </Button>
            </div>
          </form>
        ) : stage === 'erro' ? (
          <div className={styles.card}>
            <div className={`${styles.icon} ${styles.iconAlert}`}>
              <AlertTriangle size={22} />
            </div>
            <div className={styles.title}>Não conseguimos consultar o DJEN agora</div>
            <p className={styles.desc}>{erro || 'Tente novamente em instantes, ou cadastre a credencial do tribunal direto.'}</p>
            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={() => router.push('/')}>
                Pular por agora
              </Button>
              <Button type="button" variant="outline" onClick={abrirCredencial}>
                <KeyRound size={14} /> Cadastrar credencial mesmo assim
              </Button>
              <Button type="button" onClick={() => setStage('oab')}>
                Tentar de novo
              </Button>
            </div>
          </div>
        ) : preview && preview.totalProcessos === 0 ? (
          <div className={styles.card}>
            <div className={styles.icon}>
              <Search size={22} />
            </div>
            <div className={styles.title}>Não encontramos publicações recentes para essa OAB</div>
            <p className={styles.desc}>
              O DJEN nem sempre cobre tudo — pode ser uma OAB nova ou um tribunal que ainda não publica lá.
              Você ainda pode cadastrar a credencial de um tribunal diretamente.
            </p>
            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={() => router.push('/')}>
                Pular por agora
              </Button>
              <Button type="button" variant="outline" onClick={() => setStage('oab')}>
                Tentar outra OAB
              </Button>
              <Button type="button" onClick={abrirCredencial}>
                <KeyRound size={14} /> Cadastrar credencial
              </Button>
            </div>
          </div>
        ) : preview ? (
          <div className={`${styles.card} ${styles.cardWide}`}>
            <div className={`${styles.icon} ${styles.iconDone}`}>
              <Search size={22} />
            </div>
            <div className={styles.eyebrow}>Encontramos na OAB {oabNumero}/{oabUf}</div>
            <div className={styles.title}>
              {preview.totalProcessos} {preview.totalProcessos === 1 ? 'processo' : 'processos'} em{' '}
              {preview.tribunais.length} {preview.tribunais.length === 1 ? 'tribunal' : 'tribunais'}
            </div>
            <p className={styles.desc}>
              Isso é só a contagem pública do DJEN. Para ver movimentações, prazos e receber alertas no
              WhatsApp de um tribunal, faça login nele abaixo.
            </p>

            <div className={styles.resultList}>
              {preview.tribunais.map(t => (
                <div key={t.sigla} className={styles.resultRow}>
                  <div className={styles.resultInfo}>
                    <span className={styles.resultSigla}>{t.sigla}</span>
                    <span className={styles.resultNome}>{nomePorSigla.get(t.sigla) ?? ''}</span>
                  </div>
                  <div className={styles.resultRight}>
                    <span className={styles.resultCount}>
                      {t.processos} {t.processos === 1 ? 'processo' : 'processos'}
                    </span>
                    <span className={t.suportado ? styles.badgeSuportado : styles.badgeDjen}>
                      {t.suportado ? 'sincronização automática' : 'só publicações via DJEN'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={() => router.push('/')}>
                Pular por agora
              </Button>
              <Button type="button" onClick={abrirCredencial}>
                <KeyRound size={14} /> Fazer login e ativar alertas
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <CredentialSheet
        target={sheetTarget}
        onOpenChange={open => { if (!open) setSheetTarget(null); }}
        sistemas={sistemas}
        onSaved={secret => { setSaved(secret); setSheetTarget(null); }}
      />
    </div>
  );
}
