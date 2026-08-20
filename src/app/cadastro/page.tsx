import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthShell, type AuthFeature } from '@/components/auth/AuthShell';
import { getPrevia } from '@/lib/previa.server';
import { nomeProprio } from '@/lib/previa';
import { CadastroForm } from './CadastroForm';
import { PainelContexto, PainelEsqueleto, ResumoMobile } from './PainelContexto';

export const metadata: Metadata = {
  title: 'Criar conta',
  description: 'Crie sua conta no Ponto Processual e comece a monitorar seus processos.',
};

/* Benefícios do visitante sem OAB na URL. O WhatsApp saiu da lista: a tela de
   configuração dele ainda não existe, e o pior lugar para prometer o que não
   está pronto é o instante do cadastro. */
const FEATURES: AuthFeature[] = [
  { icon: '§', title: 'Todos os tribunais', desc: 'TRF1, TRF3, TJDFT, STJ e mais em uma única plataforma.' },
  { icon: '◎', title: 'Movimentação no mesmo dia', desc: 'O robô entra nos autos várias vezes por dia e mostra o que mudou.' },
  { icon: '▣', title: 'Controle de prazos', desc: 'Prazo fatal e data de pauta calculados a partir do expediente.' },
];

type Params = { searchParams: Promise<{ oab?: string; uf?: string }> };

/** Só aceita a OAB no formato que a busca pública produz — o resto é ruído de URL. */
function lerOab(sp: { oab?: string; uf?: string }) {
  const numero = (sp.oab ?? '').replace(/\D/g, '').slice(0, 8);
  const uf = (sp.uf ?? '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
  return numero && uf.length === 2 ? { numero, uf } : null;
}

export default async function CadastroPage({ searchParams }: Params) {
  const oab = lerOab(await searchParams);

  return (
    <AuthShell
      eyebrow="Plataforma jurídica"
      headline={
        oab ? <>Falta pouco para<br />ligar o monitoramento.</> : <>Comece a monitorar<br />seus processos hoje.</>
      }
      description={
        oab
          ? 'Assim que a conta existir, começamos pelos processos que acabamos de encontrar na sua OAB.'
          : 'Crie sua conta e acompanhe movimentações e prazos de todos os seus processos em um lugar só.'
      }
      features={oab ? undefined : FEATURES}
      painel={
        oab ? (
          /* O painel depende do DJEN, que é lento e pode cair. Em Suspense, o
             formulário pinta na hora e o contexto entra quando chega — a
             consulta nunca atrasa o campo de e-mail. */
          <Suspense fallback={<PainelEsqueleto />}>
            <PainelContexto numero={oab.numero} uf={oab.uf} />
          </Suspense>
        ) : undefined
      }
    >
      {oab && (
        <Suspense fallback={null}>
          <ResumoMobile numero={oab.numero} uf={oab.uf} />
        </Suspense>
      )}

      {/* O nome sugerido também vem do DJEN, e é um campo do formulário — não
          dá para deixá-lo esperando em Suspense sem segurar o form junto. A
          prévia está em cache de 300s (o visitante acabou de vê-la em /oab),
          então na prática isso não custa uma segunda ida ao DJEN. */}
      <CadastroForm oab={oab} nomeSugerido={oab ? await nomeDaOab(oab.numero, oab.uf) : null} />
    </AuthShell>
  );
}

async function nomeDaOab(numero: string, uf: string): Promise<string | null> {
  const r = await getPrevia(numero, uf);
  return r.ok && r.previa.advogado ? nomeProprio(r.previa.advogado) : null;
}
