'use client';

import { useMemo, useRef, useState, type RefObject } from 'react';
import { AlertTriangle, Check, ChevronLeft, Eye, EyeOff, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { sistemaMeta, type SistemaGroup, type SistemaMeta, type ScraperSecretView } from '@/lib/credenciais';
import styles from './CredentialSheet.module.css';

type Step = 'sistema' | 'tribunais' | 'acesso';

interface OtpAccountView {
  type: string;
  name: string | null;
  issuer: string | null;
  secret: string | null;
  algorithm: string;
  digits: number;
  period: number;
}

export interface CredentialSheetTarget {
  mode: 'create' | 'edit';
  secret?: ScraperSecretView;
  /** Preenchidos quando o Sheet é aberto a partir de um chip "pendente" do painel de cobertura. */
  presetSistema?: string;
  presetTribunalId?: string;
  /** Preenchidos quando o Sheet é aberto a partir da prévia do DJEN no onboarding — poupa redigitar a OAB. */
  presetOabNumero?: string;
  presetOabUf?: string;
}

interface CredentialSheetProps {
  target: CredentialSheetTarget | null;
  onOpenChange: (open: boolean) => void;
  sistemas: SistemaGroup[];
  onSaved: (secret: ScraperSecretView) => void;
}

export function CredentialSheet({ target, onOpenChange, sistemas, onSaved }: CredentialSheetProps) {
  const open = target !== null;
  const mode = target?.mode ?? 'create';
  const editing = target?.secret ?? null;

  const [step, setStep] = useState<Step>('sistema');
  const [sistema, setSistema] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [label, setLabel] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaMode, setMfaMode] = useState<'qr' | 'manual'>('qr');
  const [qrStatus, setQrStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [qrAccounts, setQrAccounts] = useState<OtpAccountView[]>([]);
  const [qrMessage, setQrMessage] = useState('');
  const [oabNumero, setOabNumero] = useState('');
  const [oabUf, setOabUf] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** `Tribunal` (enum do backend) → metadados de exibição, achatado a partir do catálogo por sistema. */
  const tribunalIndex = useMemo(() => {
    const map = new Map<string, { sistema: string }>();
    for (const s of sistemas) {
      for (const g of s.grupos) {
        for (const grau of g.graus) map.set(grau.id, { sistema: s.sistema });
      }
    }
    return map;
  }, [sistemas]);

  // Reseta/pré-popula o formulário sempre que o Sheet abre para um novo alvo.
  // Ajuste de estado durante a renderização (não em Effect): é o padrão que o
  // próprio React recomenda para "resetar estado quando uma prop muda" — o
  // bail-out re-renderiza com o estado novo antes de pintar a tela, sem o
  // "flash" de um Effect nem o risco de recriar o Sheet inteiro com `key`
  // (que cortaria a animação de fechamento).
  const targetKey = target
    ? `${target.mode}:${target.secret?.id ?? ''}:${target.presetSistema ?? ''}:${target.presetTribunalId ?? ''}:${target.presetOabNumero ?? ''}:${target.presetOabUf ?? ''}`
    : null;
  const [seededKey, setSeededKey] = useState<string | null>(null);

  if (target && targetKey !== seededKey) {
    setSeededKey(targetKey);
    setError('');
    setSaving(false);
    setShowPassword(false);
    setUser('');
    setPassword('');
    setMfaSecret('');
    setMfaMode('qr');
    setQrStatus('idle');
    setQrAccounts([]);
    setQrMessage('');

    if (target.mode === 'edit' && target.secret) {
      const s = target.secret;
      const inferido = s.tribunais[0] ? tribunalIndex.get(s.tribunais[0])?.sistema ?? null : null;
      setSistema(inferido);
      setSelecionados(new Set(s.tribunais));
      setLabel(s.label);
      setOabNumero(s.oabNumero ?? '');
      setOabUf(s.oabUf ?? '');
      setStep('acesso');
    } else {
      setLabel('');
      setOabNumero(target.presetOabNumero ?? '');
      setOabUf(target.presetOabUf ?? '');
      if (target.presetSistema) {
        setSistema(target.presetSistema);
        setSelecionados(new Set(target.presetTribunalId ? [target.presetTribunalId] : []));
        setStep('tribunais');
      } else {
        setSistema(null);
        setSelecionados(new Set());
        setStep('sistema');
      }
    }
  }

  const meta = sistema ? sistemaMeta(sistema) : null;
  const grupo = sistema ? sistemas.find(s => s.sistema === sistema) : undefined;

  const suggestedLabel = useMemo(() => {
    if (!meta) return '';
    const oab = oabNumero.trim()
      ? ` · OAB ${oabNumero.trim()}${oabUf.trim() ? `/${oabUf.trim().toUpperCase()}` : ''}`
      : '';
    return `${meta.titulo}${oab}`;
  }, [meta, oabNumero, oabUf]);

  function toggleTribunal(id: string) {
    setSelecionados(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleQrUpload(file: File) {
    setQrStatus('loading');
    setQrMessage('');
    setQrAccounts([]);
    try {
      const form = new FormData();
      form.set('file', file);
      const res = await fetch('/api/secrets/mfa/extract-qr', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setQrStatus('error');
        setQrMessage(data.error ?? 'Não foi possível ler o QR code dessa imagem.');
        return;
      }
      const accounts: OtpAccountView[] = (data.accounts ?? []).filter((a: OtpAccountView) => a.secret);
      if (accounts.length === 0) {
        setQrStatus('error');
        setQrMessage('Nenhum código válido encontrado nessa imagem.');
        return;
      }
      if (accounts.length === 1) {
        setMfaSecret(accounts[0]!.secret!);
        setQrStatus('done');
        const quem = accounts[0]!.issuer ?? accounts[0]!.name;
        setQrMessage(quem ? `Segredo extraído de "${quem}".` : 'Segredo extraído com sucesso.');
      } else {
        setQrAccounts(accounts);
        setQrStatus('done');
        setQrMessage(`${accounts.length} contas encontradas nessa imagem — escolha qual usar abaixo.`);
      }
    } catch {
      setQrStatus('error');
      setQrMessage('Falha ao enviar a imagem. Tente novamente.');
    }
  }

  function close() {
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (!sistema || !meta) return;
    if (selecionados.size === 0) {
      setError('Selecione ao menos um tribunal.');
      return;
    }
    if (mode === 'create') {
      if (!user.trim()) { setError('Informe o login.'); return; }
      if (!password.trim()) { setError('Informe a senha.'); return; }
      if (meta.exigeMfa && !mfaSecret.trim()) {
        setError('Envie o print do QR code do MFA ou informe o segredo manualmente.');
        return;
      }
    }
    const finalLabel = label.trim() || suggestedLabel;
    if (!finalLabel) { setError('Informe um nome para identificar esta credencial.'); return; }

    setError('');
    setSaving(true);

    const payload: Record<string, unknown> = {
      label: finalLabel,
      oabNumero: oabNumero.trim() || null,
      oabUf: oabUf.trim() ? oabUf.trim().toUpperCase() : null,
      tribunais: Array.from(selecionados),
    };
    if (user.trim()) payload.user = user.trim();
    if (password.trim()) payload.password = password;
    if (mfaSecret.trim()) payload.mfaSecret = mfaSecret.trim();
    // Projudi não usa MFA, mas o backend exige o campo — preenche um valor
    // inerte só na criação (edição sem novo MFA simplesmente não altera o atual).
    else if (mode === 'create' && !meta.exigeMfa) payload.mfaSecret = 'SEM-MFA';

    try {
      const res = await fetch(mode === 'create' ? '/api/secrets' : `/api/secrets/${editing!.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível salvar a credencial.');
        setSaving(false);
        return;
      }
      onSaved(data as ScraperSecretView);
      close();
    } catch {
      setError('Falha ao conectar ao servidor.');
      setSaving(false);
    }
  }

  const stepIndex = { sistema: 1, tribunais: 2, acesso: 3 }[step];

  return (
    <Sheet open={open} onOpenChange={next => { if (!next) close(); }}>
      <SheetContent side="right" className={styles.sheet}>
        <SheetTitle className="sr-only">
          {mode === 'create' ? 'Nova credencial' : `Editar credencial — ${editing?.label ?? ''}`}
        </SheetTitle>

        <div className={styles.header}>
          <div>
            <div className={styles.title}>{mode === 'create' ? 'Nova credencial' : `Editar · ${editing?.label}`}</div>
            <p className={styles.subtitle}>
              {mode === 'create'
                ? 'A plataforma usa este login para acessar o tribunal e sincronizar seus processos.'
                : 'Deixe login, senha e MFA em branco para manter os valores atuais.'}
            </p>
          </div>
          {mode === 'create' && (
            <div className={styles.steps} aria-label={`Etapa ${stepIndex} de 3`}>
              <span className={stepIndex >= 1 ? styles.stepDone : styles.step}>1 · Sistema</span>
              <span className={stepIndex >= 2 ? styles.stepDone : styles.step}>2 · Tribunais</span>
              <span className={stepIndex >= 3 ? styles.stepDone : styles.step}>3 · Acesso</span>
            </div>
          )}
        </div>

        <div className={styles.body}>
          {mode === 'create' && step === 'sistema' && (
            <SistemaPicker
              sistemas={sistemas}
              onPick={sis => { setSistema(sis); setSelecionados(new Set()); setStep('tribunais'); }}
            />
          )}

          {mode === 'create' && step === 'tribunais' && grupo && meta && (
            <TribunalPicker meta={meta} grupo={grupo} selecionados={selecionados} onToggle={toggleTribunal} showCoberto />
          )}

          {step === 'acesso' && meta && (
            <div className={styles.acessoStack}>
              {mode === 'edit' && grupo && (
                <TribunalPicker meta={meta} grupo={grupo} selecionados={selecionados} onToggle={toggleTribunal} />
              )}

              <FieldSet className={styles.fieldSet}>
                <FieldLegend variant="label">Identificação</FieldLegend>
                <Field>
                  <FieldLabel htmlFor="cred-label">Nome da credencial</FieldLabel>
                  <Input id="cred-label" value={label} onChange={e => setLabel(e.target.value)} placeholder={suggestedLabel} />
                  <FieldDescription>Só para você reconhecer — ex.: &quot;Dr. João · OAB DF&quot;.</FieldDescription>
                </Field>
              </FieldSet>

              <FieldSet className={styles.fieldSet}>
                <FieldLegend variant="label">Login no {meta.titulo}</FieldLegend>
                {mode === 'edit' && <p className={styles.hint}>Em branco = mantém o login/senha atuais.</p>}
                <Field>
                  <FieldLabel htmlFor="cred-user">{meta.loginLabel}</FieldLabel>
                  <Input
                    id="cred-user"
                    value={user}
                    onChange={e => setUser(e.target.value)}
                    placeholder={mode === 'edit' ? '••••••••••' : meta.loginPlaceholder}
                    autoComplete="username"
                  />
                  {meta.loginHelp && <FieldDescription>{meta.loginHelp}</FieldDescription>}
                </Field>
                <Field>
                  <FieldLabel htmlFor="cred-password">Senha</FieldLabel>
                  <div className={styles.passwordWrap}>
                    <Input
                      id="cred-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'edit' ? '••••••••••' : 'Senha de acesso'}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Field>
                <div className={styles.fieldGrid}>
                  <Field>
                    <FieldLabel htmlFor="cred-oab-numero">Número da OAB</FieldLabel>
                    <Input id="cred-oab-numero" value={oabNumero} onChange={e => setOabNumero(e.target.value)} placeholder="12345" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="cred-oab-uf">UF</FieldLabel>
                    <Input id="cred-oab-uf" value={oabUf} onChange={e => setOabUf(e.target.value.toUpperCase())} placeholder="DF" maxLength={2} />
                  </Field>
                </div>
                <FieldDescription>OAB opcional — usada para localizar seus processos automaticamente.</FieldDescription>
              </FieldSet>

              <FieldSet className={styles.fieldSet}>
                <FieldLegend variant="label">Autenticação em duas etapas (MFA)</FieldLegend>
                {meta.exigeMfa ? (
                  <MfaBlock
                    mode={mode}
                    mfaMode={mfaMode}
                    onMfaMode={setMfaMode}
                    mfaSecret={mfaSecret}
                    onMfaSecret={setMfaSecret}
                    qrStatus={qrStatus}
                    qrMessage={qrMessage}
                    qrAccounts={qrAccounts}
                    onPickAccount={secret => { setMfaSecret(secret); setQrAccounts([]); }}
                    onFile={handleQrUpload}
                    fileInputRef={fileInputRef}
                  />
                ) : (
                  <div className={styles.infoBox}>
                    <ShieldCheck size={14} />
                    <span>{meta.titulo} não usa autenticação em duas etapas — não é preciso preencher nada aqui.</span>
                  </div>
                )}
              </FieldSet>
            </div>
          )}

          {error && (
            <div className={styles.errorBanner}>
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {mode === 'create' && step !== 'sistema' ? (
            <Button type="button" variant="outline" onClick={() => setStep(step === 'acesso' ? 'tribunais' : 'sistema')}>
              <ChevronLeft size={14} /> Voltar
            </Button>
          ) : <span />}
          <div className={styles.footerRight}>
            <Button type="button" variant="ghost" onClick={close}>Cancelar</Button>
            {mode === 'create' && step === 'tribunais' && (
              <Button type="button" disabled={selecionados.size === 0} onClick={() => setStep('acesso')}>
                Continuar
              </Button>
            )}
            {step === 'acesso' && (
              <Button type="button" onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 size={14} className={styles.spin} /> : <Check size={14} />}
                {saving ? 'Salvando…' : mode === 'create' ? 'Salvar credencial' : 'Salvar alterações'}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SistemaPicker({ sistemas, onPick }: { sistemas: SistemaGroup[]; onPick: (sistema: string) => void }) {
  return (
    <FieldSet className={styles.fieldSet}>
      <FieldLegend variant="label">Qual sistema você vai conectar?</FieldLegend>
      <div className={styles.sistemaGrid}>
        {sistemas.map(s => {
          const meta = sistemaMeta(s.sistema);
          return (
            <button
              type="button"
              key={s.sistema}
              className={styles.sistemaCard}
              disabled={!meta.disponivel}
              onClick={() => onPick(s.sistema)}
            >
              <span className={styles.sistemaCardTitle}>{meta.titulo}</span>
              <span className={styles.sistemaCardDesc}>{meta.descricao}</span>
              <span className={styles.sistemaCardStat}>
                {meta.disponivel ? `${s.cobertos}/${s.totalGraus} tribunais já cadastrados` : 'Em breve'}
              </span>
            </button>
          );
        })}
      </div>
    </FieldSet>
  );
}

function TribunalPicker({
  meta, grupo, selecionados, onToggle, showCoberto = false,
}: {
  meta: SistemaMeta;
  grupo: SistemaGroup;
  selecionados: Set<string>;
  onToggle: (id: string) => void;
  showCoberto?: boolean;
}) {
  return (
    <FieldSet className={styles.fieldSet}>
      <FieldLegend variant="label">Tribunais cobertos por esta credencial</FieldLegend>
      <p className={styles.hint}>{meta.descricao}</p>
      <div className={styles.tribunalList}>
        {grupo.grupos.map(g => (
          <div key={g.id} className={styles.tribunalRow}>
            <div className={styles.tribunalRowHead}>
              <span className={styles.tribunalCode}>{g.codigo}</span>
              <span className={styles.tribunalName}>{g.nome}</span>
            </div>
            <div className={styles.grauChips}>
              {g.graus.map(grau => {
                const checked = selecionados.has(grau.id);
                const coberto = showCoberto && !checked && grau.activeCredentialsCount > 0;
                return (
                  <label key={grau.id} className={`${styles.grauChip} ${checked ? styles.grauChipChecked : ''}`}>
                    <Checkbox checked={checked} onCheckedChange={() => onToggle(grau.id)} />
                    <span>{grau.grauLabel ?? 'Único'}</span>
                    {coberto && (
                      <span className={styles.grauChipBadge} title="Já coberto por outra credencial">
                        já cadastrado
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </FieldSet>
  );
}

function MfaBlock({
  mode, mfaMode, onMfaMode, mfaSecret, onMfaSecret,
  qrStatus, qrMessage, qrAccounts, onPickAccount, onFile, fileInputRef,
}: {
  mode: 'create' | 'edit';
  mfaMode: 'qr' | 'manual';
  onMfaMode: (v: 'qr' | 'manual') => void;
  mfaSecret: string;
  onMfaSecret: (v: string) => void;
  qrStatus: 'idle' | 'loading' | 'done' | 'error';
  qrMessage: string;
  qrAccounts: OtpAccountView[];
  onPickAccount: (secret: string) => void;
  onFile: (file: File) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className={styles.mfaBlock}>
      {mode === 'edit' && <p className={styles.hint}>Em branco = mantém o MFA atual.</p>}

      <div className={styles.mfaTabs}>
        <button type="button" className={mfaMode === 'qr' ? styles.mfaTabActive : styles.mfaTab} onClick={() => onMfaMode('qr')}>
          Enviar print do QR code
        </button>
        <button type="button" className={mfaMode === 'manual' ? styles.mfaTabActive : styles.mfaTab} onClick={() => onMfaMode('manual')}>
          Já tenho o código
        </button>
      </div>

      {mfaMode === 'qr' ? (
        <div className={styles.dropzone}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={styles.hiddenFileInput}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = '';
            }}
          />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={qrStatus === 'loading'}>
            {qrStatus === 'loading' ? <Loader2 size={14} className={styles.spin} /> : <Upload size={14} />}
            {qrStatus === 'loading' ? 'Lendo QR code…' : 'Escolher imagem do QR code'}
          </Button>
          <p className={styles.hint}>
            Tire um print da tela de cadastro do MFA (ou exporte do seu app autenticador) e envie aqui —
            o segredo é extraído automaticamente, sem digitar nada.
          </p>

          {qrStatus === 'done' && mfaSecret && qrAccounts.length === 0 && (
            <div className={styles.mfaSuccess}>
              <Check size={14} /> <span>{qrMessage}</span>
            </div>
          )}
          {qrAccounts.length > 0 && (
            <div className={styles.qrAccountList}>
              <p className={styles.hint}>{qrMessage}</p>
              {qrAccounts.map((acc, i) => (
                <button type="button" key={i} className={styles.qrAccountBtn} onClick={() => onPickAccount(acc.secret!)}>
                  {acc.issuer ?? 'Conta'} {acc.name ? `· ${acc.name}` : ''}
                </button>
              ))}
            </div>
          )}
          {qrStatus === 'error' && (
            <div className={styles.mfaError}>
              <AlertTriangle size={14} /> <span>{qrMessage}</span>
            </div>
          )}
        </div>
      ) : (
        <Field>
          <FieldLabel htmlFor="cred-mfa-secret">Segredo TOTP (base32)</FieldLabel>
          <Input
            id="cred-mfa-secret"
            value={mfaSecret}
            onChange={e => onMfaSecret(e.target.value.toUpperCase().replace(/\s+/g, ''))}
            placeholder="Ex.: JBSWY3DPEHPK3PXP"
          />
          <FieldDescription>O mesmo segredo usado para gerar o código de 6 dígitos no seu autenticador.</FieldDescription>
        </Field>
      )}
    </div>
  );
}
