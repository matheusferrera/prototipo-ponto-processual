'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, KeyRound, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { limparOabNumero, limparOabUf, slugOab } from '@/lib/previa';
import { ROTA_PAINEL } from '@/lib/rotas';
import { CredentialSheet, type CredentialSheetTarget } from '@/components/credenciais/CredentialSheet/CredentialSheet';
import { ScannerTribunais } from '@/components/varredura/ScannerTribunais';
import { EstadoVarredura } from '@/components/varredura/EstadoVarredura';
import { DicasVarredura } from '@/components/varredura/DicasVarredura';
import type { SistemaGroup, ScraperSecretView } from '@/lib/credenciais';
import styles from './OnboardingFlow.module.css';

interface DjenTribunalPreview {
  sigla: string;
  processos: number;
}

interface DjenPreview {
  totalProcessos: number;
  /** `YYYY-MM-DD`: a contagem cobre só o que foi disponibilizado a partir daí. */
  desde?: string;
  tribunais: DjenTribunalPreview[];
}

/**
 * `buscando` é o estado de abertura de quem chega com OAB — a busca dispara
 * sozinha. `oab` é o de quem chega sem ela (criou a conta pelo Google, ou pelo
 * /cadastro sem passar pela consulta): a pergunta acontece uma vez, aqui, e a
 * resposta sai desta tela para `/oab/<numero>-<uf>` em vez de virar uma busca
 * escondida. `credencial` é para quem dispensa a OAB e vai direto ao tribunal.
 */
type Stage = 'buscando' | 'oab' | 'resultado' | 'erro' | 'credencial';

function getNomeTribunalFallback(sigla: string): string {
  const ufMap: Record<string, string> = {
    AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
    DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
    MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
    PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
    RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
    SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
  };

  if (sigla.startsWith('TJ')) {
    const uf = sigla.substring(2);
    if (ufMap[uf]) return `Tribunal de Justiça - ${ufMap[uf]}`;
  }
  if (sigla.startsWith('TRE')) {
    const uf = sigla.replace('TRE-', '').replace('TRE', '');
    if (ufMap[uf]) return `Tribunal Regional Eleitoral - ${ufMap[uf]}`;
  }
  if (sigla.startsWith('TRT')) return `Tribunal Regional do Trabalho - ${sigla.replace('TRT', '')}ª Região`;
  if (sigla.startsWith('TRF')) return `Tribunal Regional Federal - ${sigla.replace('TRF', '')}ª Região`;

  if (sigla === 'STJ') return 'Superior Tribunal de Justiça';
  if (sigla === 'STF') return 'Supremo Tribunal Federal';
  if (sigla === 'TST') return 'Tribunal Superior do Trabalho';
  if (sigla === 'TSE') return 'Tribunal Superior Eleitoral';
  if (sigla === 'STM') return 'Superior Tribunal Militar';

  return sigla;
}

/**
 * Primeiro acesso. Quem chega **com** OAB não é perguntado nada.
 *
 * A OAB tem uma rota só no produto inteiro: `/oab/<numero>-<uf>`, a consulta
 * pública. A busca da home e a do /cadastro navegam para lá, e é de lá que ela
 * chega aqui pela URL (`/oab/<slug>` → `/cadastro?oab=…&uf=…` →
 * `/onboarding?oab=…&uf=…`). Nesse caminho esta tela trata a OAB como resposta
 * dada: dispara a busca sozinha e abre já no resultado. Repetir o formulário
 * com os campos preenchidos, logo depois de a pessoa ter visto os próprios
 * processos, era onde o funil mais vazava.
 *
 * Quem chega **sem** OAB (criou a conta pelo Google, ou pelo /cadastro sem
 * consultar) cai no estágio `oab` — a única pergunta desta tela. Ela não
 * resolve a OAB aqui: manda para `/oab/<slug>`, que mostra os processos e
 * devolve a pessoa para cá com a resposta na URL. Quem prefere não responder
 * agora vai para o painel, que recebe essa conta com "falta a sua OAB" e o
 * campo para informá-la — o pedido continua vivo, sem travar a entrada.
 *
 * O outro lugar onde se digita OAB aqui é a correção, escondida atrás de "não é
 * essa OAB?" nos caminhos de erro e de zero resultados. Ali não é pergunta — é
 * a saída de quem errou um dígito e ficaria sem próximo passo.
 */
export function OnboardingFlow({
  sistemas,
  oabInicial,
}: {
  sistemas: SistemaGroup[];
  oabInicial?: { numero: string; uf: string };
}) {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>(oabInicial ? 'buscando' : 'oab');
  const [oabNumero, setOabNumero] = useState(oabInicial?.numero ?? '');
  const [oabUf, setOabUf] = useState(oabInicial?.uf ?? '');
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

  const buscar = useCallback(async (numero: string, uf: string) => {
    if (!numero || uf.length !== 2) return;

    setBuscando(true);
    setErro('');
    try {
      const params = new URLSearchParams({ oabNumero: numero, oabUf: uf });
      const res = await fetch(`/api/scraper/preview-djen?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? 'Não foi possível consultar o DJEN agora.');
        setStage('erro');
        return;
      }
      const djen = data as DjenPreview;
      setPreview(djen);
      setStage('resultado');

      // A prévia só conta — quem grava `Process`/`Deadline` na conta é o job do
      // DJEN. Sem isto, "pular por agora" levava a um painel vazio. Roda em
      // segundo plano: falhar aqui não deve derrubar o resultado já na tela, e
      // o usuário reobtém o monitoramento cadastrando a credencial.
      if (djen.totalProcessos > 0) {
        void fetch('/api/scraper/monitorar-oab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oabNumero: numero, oabUf: uf }),
        }).catch(() => {});
      }
    } catch {
      setErro('Falha ao conectar ao servidor.');
      setStage('erro');
    } finally {
      setBuscando(false);
    }
  }, []);

  /* A busca de abertura. O ref protege do efeito duplo do StrictMode em dev:
     `monitorar-oab` é idempotente, mas duas idas ao DJEN por carregamento
     gastam o rate limit de quem está entrando agora. */
  const jaBuscou = useRef(false);
  useEffect(() => {
    if (!oabInicial || jaBuscou.current) return;
    jaBuscou.current = true;
    void buscar(oabInicial.numero, oabInicial.uf);
  }, [oabInicial, buscar]);

  function abrirCredencial() {
    setSheetTarget({
      mode: 'create',
      presetOabNumero: oabNumero,
      presetOabUf: oabUf,
    });
  }

  function abrirCredencialParaTribunal(sigla: string) {
    let sistema: string | undefined;
    const tribunalIds: string[] = [];

    for (const s of sistemas) {
      for (const g of s.grupos) {
        const graus = g.graus.filter(grau => grau.id.replace(/G[12]$/, '') === sigla);
        if (graus.length > 0) {
          sistema = s.sistema;
          tribunalIds.push(...graus.map(gr => gr.id));
        }
      }
      if (sistema) break;
    }

    setSheetTarget({
      mode: 'create',
      presetOabNumero: oabNumero,
      presetOabUf: oabUf,
      presetSistema: sistema,
      presetTribunaisIds: tribunalIds.length > 0 ? tribunalIds : undefined,
    });
  }

  const trocarOab = (
    <TrocarOab
      numero={oabNumero}
      uf={oabUf}
      onNumero={setOabNumero}
      onUf={setOabUf}
      buscando={buscando}
      onBuscar={() => void buscar(oabNumero, oabUf)}
    />
  );

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
              <Button type="button" onClick={() => router.push(ROTA_PAINEL)}>
                Ir para o dashboard →
              </Button>
            </div>
          </div>
        ) : stage === 'buscando' ? (
          /* Sem botão e sem campo: a pessoa já respondeu tudo o que precisávamos
             no cadastro. Esta tela só presta contas do que está acontecendo.

             O spinner que ficava aqui não prestava conta nenhuma: girava igual
             no primeiro e no décimo segundo. Trocado pelo scanner de
             `/oab/[slug]/loading.tsx` — que quem chegou pela consulta pública
             acabou de ver — mais o estado real (tempo decorrido) e as dicas,
             que transformam a espera em algo que a pessoa aproveita. */
          <div className={`${styles.card} ${styles.cardWide}`}>
            <ScannerTribunais />
            <div className={styles.eyebrow}>OAB {oabNumero}/{oabUf}</div>
            <div className={styles.title}>Procurando seus processos</div>
            <p className={styles.desc}>
              Estamos varrendo as bases públicas para descobrir em quais tribunais você tem
              atividade.
            </p>
            <EstadoVarredura />
            <DicasVarredura />
          </div>
        ) : stage === 'oab' ? (
          <div className={styles.card}>
            <div className={styles.icon}>
              <Search size={22} />
            </div>
            <div className={styles.eyebrow}>Primeiro acesso</div>
            <div className={styles.title}>Qual é a sua OAB?</div>
            <p className={styles.desc}>
              É por ela que localizamos seus processos nos diários oficiais — a consulta é
              pública e não pede a senha de tribunal nenhum. Vamos mostrar o que encontramos
              antes de ligar o monitoramento.
            </p>
            <form
              className={styles.trocarForm}
              onSubmit={e => {
                e.preventDefault();
                /* Não resolvemos a OAB aqui: quem consulta é `/oab/<slug>`, e é
                   de lá que ela volta para esta tela pela URL. */
                router.push(`/oab/${slugOab(oabNumero, oabUf)}`);
              }}
            >
              <FieldSet className={styles.oabFieldSet}>
                <div className={styles.oabRow}>
                  <Field>
                    <FieldLabel htmlFor="onb-primeira-oab-numero">Número da OAB</FieldLabel>
                    <Input
                      id="onb-primeira-oab-numero"
                      value={oabNumero}
                      onChange={e => setOabNumero(limparOabNumero(e.target.value))}
                      placeholder="12345"
                      inputMode="numeric"
                      autoFocus
                    />
                  </Field>
                  <Field className={styles.oabUfField}>
                    <FieldLabel htmlFor="onb-primeira-oab-uf">UF</FieldLabel>
                    <Input
                      id="onb-primeira-oab-uf"
                      value={oabUf}
                      onChange={e => setOabUf(limparOabUf(e.target.value))}
                      placeholder="DF"
                      maxLength={2}
                    />
                  </Field>
                </div>
              </FieldSet>
              <div className={styles.actions}>
                <Button type="button" variant="ghost" onClick={() => router.push(ROTA_PAINEL)}>
                  Pular por agora
                </Button>
                <Button type="submit" disabled={!oabNumero || oabUf.length !== 2}>
                  <Search size={14} /> Ver meus processos
                </Button>
              </div>
            </form>
            <button type="button" className={styles.trocarLink} onClick={() => setStage('credencial')}>
              Prefiro conectar o login de um tribunal
            </button>
          </div>
        ) : stage === 'credencial' ? (
          <div className={styles.card}>
            <div className={styles.icon}>
              <KeyRound size={22} />
            </div>
            <div className={styles.eyebrow}>Primeiro acesso</div>
            <div className={styles.title}>Vamos conectar seu primeiro tribunal</div>
            <p className={styles.desc}>
              Cadastre o login que você usa no tribunal (PJe, CPE, Projudi…) e o robô assume a
              ronda: descobre seus processos pela OAB e acompanha cada movimentação e prazo,
              inclusive nos autos em segredo de justiça.
            </p>
            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={() => router.push(ROTA_PAINEL)}>
                Pular por agora
              </Button>
              <Button type="button" onClick={abrirCredencial}>
                <KeyRound size={14} /> Cadastrar credencial
              </Button>
            </div>
          </div>
        ) : stage === 'erro' ? (
          <div className={styles.card}>
            <div className={`${styles.icon} ${styles.iconAlert}`}>
              <AlertTriangle size={22} />
            </div>
            <div className={styles.eyebrow}>OAB {oabNumero}/{oabUf}</div>
            <div className={styles.title}>Não conseguimos realizar a consulta pública agora</div>
            <p className={styles.desc}>{erro || 'Tente novamente em instantes, ou cadastre a credencial do tribunal direto.'}</p>
            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={() => router.push(ROTA_PAINEL)}>
                Pular por agora
              </Button>
              <Button type="button" variant="outline" onClick={abrirCredencial}>
                <KeyRound size={14} /> Cadastrar credencial mesmo assim
              </Button>
              <Button type="button" disabled={buscando} onClick={() => void buscar(oabNumero, oabUf)}>
                {buscando ? <Loader2 size={14} className={styles.spin} /> : <Search size={14} />}
                {buscando ? 'Buscando…' : 'Tentar de novo'}
              </Button>
            </div>
            {trocarOab}
          </div>
        ) : preview && preview.totalProcessos === 0 ? (
          <div className={styles.card}>
            <div className={styles.icon}>
              <Search size={22} />
            </div>
            <div className={styles.eyebrow}>OAB {oabNumero}/{oabUf}</div>
            <div className={styles.title}>Não encontramos publicações dos últimos 6 meses para essa OAB</div>
            <p className={styles.desc}>
              As consultas públicas nem sempre cobrem tudo — pode ser uma OAB nova ou processos em segredo de justiça.
              Você ainda pode cadastrar a credencial de um tribunal diretamente para ter acesso completo.
            </p>
            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={() => router.push(ROTA_PAINEL)}>
                Pular por agora
              </Button>
              <Button type="button" onClick={abrirCredencial}>
                <KeyRound size={14} /> Cadastrar credencial
              </Button>
            </div>
            {trocarOab}
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
              Já estamos trazendo esses processos e prazos para o seu painel — pode levar alguns
              minutos. Esses são apenas os processos com publicação nos últimos 6 meses em consultas
              públicas. Para puxar <strong>todos os seus processos</strong>, inclusive os{' '}
              <strong>sigilosos</strong> e em segredo de justiça, faça o login no tribunal abaixo.
            </p>

            <div className={styles.resultList}>
              {preview.tribunais.map(t => (
                <div key={t.sigla} className={styles.resultRow}>
                  <div className={styles.resultInfo}>
                    <span className={styles.resultSigla}>{t.sigla}</span>
                    <span className={styles.resultNome}>{nomePorSigla.get(t.sigla) || getNomeTribunalFallback(t.sigla)}</span>
                  </div>
                  <div className={styles.resultRight}>
                    <span className={styles.resultCount}>
                      {t.processos} {t.processos === 1 ? 'processo' : 'processos'}
                    </span>
                    <Button type="button" size="sm" variant="outline" onClick={() => abrirCredencialParaTribunal(t.sigla)}>
                      Conectar
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={() => router.push(ROTA_PAINEL)}>
                Pular por agora
              </Button>
              <Button type="button" onClick={abrirCredencial}>
                <KeyRound size={14} /> Conectar outro tribunal
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

/**
 * Correção da OAB — só nos caminhos em que a busca não deu em nada.
 *
 * Fica fechada por padrão, atrás de um link discreto: aberta, seria de novo o
 * formulário que esta tela deixou de fazer. Um dígito errado no cadastro não
 * pode virar beco sem saída, mas também não pode competir com o próximo passo,
 * que é conectar o tribunal.
 */
function TrocarOab({
  numero,
  uf,
  onNumero,
  onUf,
  onBuscar,
  buscando,
}: {
  numero: string;
  uf: string;
  onNumero: (v: string) => void;
  onUf: (v: string) => void;
  onBuscar: () => void;
  buscando: boolean;
}) {
  const [aberto, setAberto] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onBuscar();
  }

  if (!aberto) {
    return (
      <button type="button" className={styles.trocarLink} onClick={() => setAberto(true)}>
        Não é essa OAB? Corrigir
      </button>
    );
  }

  return (
    <form className={styles.trocarForm} onSubmit={handleSubmit}>
      <FieldSet className={styles.oabFieldSet}>
        <div className={styles.oabRow}>
          <Field>
            <FieldLabel htmlFor="onb-oab-numero">Número da OAB</FieldLabel>
            <Input
              id="onb-oab-numero"
              value={numero}
              onChange={e => onNumero(limparOabNumero(e.target.value))}
              placeholder="12345"
              inputMode="numeric"
              autoFocus
            />
          </Field>
          <Field className={styles.oabUfField}>
            <FieldLabel htmlFor="onb-oab-uf">UF</FieldLabel>
            <Input
              id="onb-oab-uf"
              value={uf}
              onChange={e => onUf(limparOabUf(e.target.value))}
              placeholder="DF"
              maxLength={2}
            />
          </Field>
        </div>
      </FieldSet>
      <Button type="submit" size="sm" variant="outline" disabled={buscando || !numero || uf.length !== 2}>
        {buscando ? <Loader2 size={14} className={styles.spin} /> : <Search size={14} />}
        {buscando ? 'Buscando…' : 'Buscar de novo'}
      </Button>
    </form>
  );
}
