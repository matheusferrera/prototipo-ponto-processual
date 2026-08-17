'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, KeyRound, Pause, Pencil, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CredentialSheet, type CredentialSheetTarget } from '@/components/credenciais/CredentialSheet/CredentialSheet';
import { sistemaMeta, type SistemaGroup, type ScraperSecretView } from '@/lib/credenciais';
import styles from './CredenciaisPageContent.module.css';

interface CredenciaisPageContentProps {
  initialSecrets: ScraperSecretView[];
  sistemas: SistemaGroup[];
  /** true quando o catálogo de tribunais não pôde ser consultado — a cobertura pode estar incompleta. */
  unavailable?: boolean;
  pageInfo?: ReactNode;
}

type TribunalMeta = { codigo: string; grauLabel: string | null; sistema: string };

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'há poucos segundos';
  if (diffMin === 1) return 'há 1 minuto';
  if (diffMin < 60) return `há ${diffMin} minutos`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return 'há 1 hora';
  if (diffHours < 24) return `há ${diffHours} horas`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'há 1 dia';
  return `há ${diffDays} dias`;
}

function absoluteTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function CredenciaisPageContent({
  initialSecrets,
  sistemas,
  unavailable = false,
  pageInfo,
}: CredenciaisPageContentProps) {
  const [secrets, setSecrets] = useState(initialSecrets);
  const [sheetTarget, setSheetTarget] = useState<CredentialSheetTarget | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [totpOpenId, setTotpOpenId] = useState<string | null>(null);
  const [totp, setTotp] = useState<{ code: string; expiresIn: number } | null>(null);
  const [totpError, setTotpError] = useState('');

  const { tribunalIndex, secretsBySistema } = useMemo(() => {
    const idx = new Map<string, TribunalMeta>();
    for (const s of sistemas) {
      for (const g of s.grupos) {
        for (const grau of g.graus) idx.set(grau.id, { codigo: g.codigo, grauLabel: grau.grauLabel, sistema: s.sistema });
      }
    }

    const bySistema = new Map<string, ScraperSecretView[]>();
    for (const secret of secrets) {
      const primeiro = secret.tribunais[0];
      const sis = primeiro ? idx.get(primeiro)?.sistema ?? 'Outro' : 'Outro';
      const list = bySistema.get(sis);
      if (list) list.push(secret);
      else bySistema.set(sis, [secret]);
    }
    return { tribunalIndex: idx, secretsBySistema: bySistema };
  }, [secrets, sistemas]);

  function upsertSecret(secret: ScraperSecretView) {
    setSecrets(current => {
      const exists = current.some(s => s.id === secret.id);
      return exists ? current.map(s => (s.id === secret.id ? secret : s)) : [...current, secret];
    });
  }

  async function toggleActive(secret: ScraperSecretView) {
    setBusyId(secret.id);
    try {
      const res = await fetch(`/api/secrets/${secret.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !secret.isActive }),
      });
      if (res.ok) upsertSecret(await res.json());
    } finally {
      setBusyId(null);
    }
  }

  async function syncNow(secret: ScraperSecretView) {
    setBusyId(secret.id);
    try {
      await fetch(`/api/secrets/${secret.id}/sync`, { method: 'POST' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(secret: ScraperSecretView) {
    setBusyId(secret.id);
    try {
      const res = await fetch(`/api/secrets/${secret.id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        setSecrets(current => current.filter(s => s.id !== secret.id));
      }
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
    }
  }

  // Sem setState síncrono antes do primeiro `await`: assim o efeito de
  // contagem regressiva pode chamar esta função sem disparar
  // `react-hooks/set-state-in-effect` — o update só acontece depois que o
  // fetch resolve, fora da pilha síncrona do Effect.
  async function fetchTotp(id: string) {
    try {
      const res = await fetch(`/api/secrets/${id}/totp`);
      const data = await res.json();
      if (!res.ok) {
        setTotp(null);
        setTotpError(data.error ?? 'Não foi possível gerar o código.');
        return;
      }
      setTotpError('');
      setTotp({ code: data.code, expiresIn: data.expiresIn });
    } catch {
      setTotp(null);
      setTotpError('Falha ao gerar código.');
    }
  }

  function toggleTotp(secret: ScraperSecretView) {
    if (totpOpenId === secret.id) {
      setTotpOpenId(null);
      setTotp(null);
      return;
    }
    // Reset síncrono aqui é seguro: é um handler de clique, não um Effect —
    // evita mostrar por um instante o código da credencial anterior.
    setTotpOpenId(secret.id);
    setTotp(null);
    setTotpError('');
    void fetchTotp(secret.id);
  }

  // Contador do código TOTP — se autoagenda a cada segundo e refaz a busca
  // quando expira, em vez de um setInterval solto que sobreviveria ao fechamento.
  useEffect(() => {
    if (!totpOpenId || !totp) return;
    if (totp.expiresIn <= 0) {
      // setTimeout(0): mesmo escape do ramo de contagem abaixo — o setState
      // fica fora da pilha síncrona do Effect (react-hooks/set-state-in-effect).
      const id = totpOpenId;
      const timer = setTimeout(() => { void fetchTotp(id); }, 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setTotp(current => (current ? { ...current, expiresIn: current.expiresIn - 1 } : current));
    }, 1000);
    return () => clearTimeout(timer);
  }, [totpOpenId, totp]);

  const noSecretsAtAll = secrets.length === 0;

  return (
    <div className={styles.container}>
      {pageInfo}

      <div className={styles.toolbar}>
        <div>
          <h2 className={styles.toolbarTitle}>Suas credenciais</h2>
          <p className={styles.toolbarDesc}>
            Cada credencial é um login que o robô usa para entrar em um ou mais tribunais.
          </p>
        </div>
        <Button type="button" onClick={() => setSheetTarget({ mode: 'create' })}>
          <Plus size={14} /> Nova credencial
        </Button>
      </div>

      {unavailable && (
        <div className={styles.unavailableBanner}>
          <AlertTriangle size={16} />
          <span>Não foi possível consultar o catálogo de tribunais. A cobertura abaixo pode estar incompleta.</span>
        </div>
      )}

      <div className={styles.coverageGrid}>
        {sistemas.map(s => {
          const meta = sistemaMeta(s.sistema);
          return (
            <div key={s.sistema} className={`${styles.coverageCard}${meta.disponivel ? '' : ` ${styles.coverageCardDisabled}`}`}>
              <div className={styles.coverageHead}>
                <span className={styles.coverageTitle}>{meta.titulo}</span>
                <span className={styles.coverageCount}>{meta.disponivel ? `${s.cobertos}/${s.totalGraus}` : 'em breve'}</span>
              </div>
              <p className={styles.coverageDesc}>{meta.descricao}</p>
              {meta.disponivel && (
                <div className={styles.coverageChips}>
                  {s.grupos.flatMap(g =>
                    g.graus.map(grau => {
                      const coberto = grau.activeCredentialsCount > 0;
                      const rotulo = `${g.codigo}${grau.grauLabel ? ` ${grau.grauLabel}` : ''}`;
                      return (
                        <button
                          key={grau.id}
                          type="button"
                          className={coberto ? styles.coverageChipDone : styles.coverageChipPending}
                          disabled={coberto}
                          title={coberto ? `${rotulo} já cadastrado` : `Cadastrar ${rotulo}`}
                          onClick={() => setSheetTarget({ mode: 'create', presetSistema: s.sistema, presetTribunalId: grau.id })}
                        >
                          {rotulo}
                          {!coberto && <Plus size={10} />}
                        </button>
                      );
                    }),
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {noSecretsAtAll ? (
        <div className={styles.emptyState}>
          <KeyRound size={32} />
          <strong>Nenhuma credencial cadastrada</strong>
          <p>Cadastre um login de tribunal para o robô começar a monitorar seus processos.</p>
          <Button type="button" onClick={() => setSheetTarget({ mode: 'create' })}>
            <Plus size={14} /> Nova credencial
          </Button>
        </div>
      ) : (
        sistemas
          .filter(s => (secretsBySistema.get(s.sistema)?.length ?? 0) > 0)
          .map(s => {
            const meta = sistemaMeta(s.sistema);
            const lista = secretsBySistema.get(s.sistema) ?? [];
            return (
              <section key={s.sistema} className={styles.sistemaSection}>
                <h3 className={styles.sistemaSectionTitle}>{meta.titulo}</h3>
                <div className={styles.cardGrid}>
                  {lista.map(secret => (
                    <CredentialCard
                      key={secret.id}
                      secret={secret}
                      tribunalIndex={tribunalIndex}
                      busy={busyId === secret.id}
                      confirmDelete={confirmDeleteId === secret.id}
                      onEdit={() => setSheetTarget({ mode: 'edit', secret })}
                      onToggleActive={() => toggleActive(secret)}
                      onSync={() => syncNow(secret)}
                      onDeleteClick={() => setConfirmDeleteId(current => (current === secret.id ? null : secret.id))}
                      onDeleteConfirm={() => handleDelete(secret)}
                      onCancelDelete={() => setConfirmDeleteId(null)}
                      showTotpAction={meta.exigeMfa}
                      totpOpen={totpOpenId === secret.id}
                      totp={totpOpenId === secret.id ? totp : null}
                      totpError={totpOpenId === secret.id ? totpError : ''}
                      onToggleTotp={() => toggleTotp(secret)}
                    />
                  ))}
                </div>
              </section>
            );
          })
      )}

      <CredentialSheet
        target={sheetTarget}
        onOpenChange={open => { if (!open) setSheetTarget(null); }}
        sistemas={sistemas}
        onSaved={upsertSecret}
      />
    </div>
  );
}

function credentialStatus(secret: ScraperSecretView): { label: string; className: string } {
  if (!secret.isActive) return { label: 'Pausada', className: styles.statusPausada };
  if (secret.lastError) return { label: 'Com erro', className: styles.statusErro };
  if (secret.lastSuccessAt) return { label: 'Ativa', className: styles.statusAtiva };
  return { label: 'Nunca sincronizada', className: styles.statusPendente };
}

function CredentialCard({
  secret, tribunalIndex, busy, confirmDelete,
  onEdit, onToggleActive, onSync, onDeleteClick, onDeleteConfirm, onCancelDelete,
  showTotpAction, totpOpen, totp, totpError, onToggleTotp,
}: {
  secret: ScraperSecretView;
  tribunalIndex: Map<string, TribunalMeta>;
  busy: boolean;
  confirmDelete: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onSync: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onCancelDelete: () => void;
  showTotpAction: boolean;
  totpOpen: boolean;
  totp: { code: string; expiresIn: number } | null;
  totpError: string;
  onToggleTotp: () => void;
}) {
  const chips = secret.tribunais
    .map(id => ({ id, ...(tribunalIndex.get(id) ?? { codigo: id, grauLabel: null, sistema: '' }) }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR') || (a.grauLabel ?? '').localeCompare(b.grauLabel ?? ''));

  const status = credentialStatus(secret);

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardHeadMain}>
          <span className={styles.cardLabel}>{secret.label}</span>
          {secret.oabNumero && (
            <span className={styles.cardOab}>OAB {secret.oabNumero}{secret.oabUf ? `/${secret.oabUf}` : ''}</span>
          )}
        </div>
        <span className={`${styles.statusPill} ${status.className}`}>
          <span className={`${styles.dot} ${status.className}`} />
          {status.label}
        </span>
      </div>

      <div className={styles.cardChips}>
        {chips.map(c => (
          <span key={c.id} className={styles.tribChip}>{c.codigo}{c.grauLabel ? ` ${c.grauLabel}` : ''}</span>
        ))}
      </div>

      <div className={styles.cardMeta}>
        {secret.lastSuccessAt ? (
          <>
            <span>Último sucesso {relativeTime(secret.lastSuccessAt)}</span>
            <span className={styles.cardMetaAbs}>{absoluteTime(secret.lastSuccessAt)}</span>
          </>
        ) : secret.lastUsedAt ? (
          <span>Última tentativa {relativeTime(secret.lastUsedAt)}</span>
        ) : (
          <span>Ainda não sincronizada</span>
        )}
      </div>

      {secret.lastError && (
        <div className={styles.cardError}>
          <AlertTriangle size={12} />
          <span>{secret.lastError}</span>
        </div>
      )}

      {totpOpen && (
        <div className={styles.totpPanel}>
          {totpError ? (
            <span className={styles.totpErrorText}>{totpError}</span>
          ) : totp ? (
            <>
              <span className={styles.totpCode}>{totp.code.replace(/(\d{3})(\d{3})/, '$1 $2')}</span>
              <span className={styles.totpExpires}>expira em {totp.expiresIn}s</span>
            </>
          ) : (
            <span className={styles.totpLoading}>Gerando código…</span>
          )}
        </div>
      )}

      <div className={styles.cardActions}>
        <button type="button" className={styles.actionBtn} onClick={onSync} disabled={busy || !secret.isActive}>
          <RefreshCw size={13} /> Sincronizar
        </button>
        {showTotpAction && (
          <button type="button" className={styles.actionBtn} onClick={onToggleTotp}>
            <KeyRound size={13} /> {totpOpen ? 'Ocultar código' : 'Ver código TOTP'}
          </button>
        )}
        <button type="button" className={styles.actionBtn} onClick={onEdit}>
          <Pencil size={13} /> Editar
        </button>
        <button type="button" className={styles.actionBtn} onClick={onToggleActive} disabled={busy}>
          {secret.isActive ? <><Pause size={13} /> Pausar</> : <><Play size={13} /> Ativar</>}
        </button>
        {confirmDelete ? (
          <span className={styles.confirmDelete}>
            <button type="button" className={styles.confirmDeleteBtn} onClick={onDeleteConfirm} disabled={busy}>
              Confirmar exclusão
            </button>
            <button type="button" className={styles.confirmCancelBtn} onClick={onCancelDelete}>cancelar</button>
          </span>
        ) : (
          <button type="button" className={styles.actionBtnDanger} onClick={onDeleteClick}>
            <Trash2 size={13} /> Excluir
          </button>
        )}
      </div>
    </div>
  );
}
