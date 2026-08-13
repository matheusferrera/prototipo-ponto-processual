# Expedientes sem data e remoção do filtro de titular

## Objetivo

Exibir na página de prazos os expedientes que o PJe classifica como sem prazo ou
cuja data limite ainda não foi calculada, sem atribuir a eles vencimento, pauta
ou urgência artificiais. A mesma página e a API devem sempre mostrar os
expedientes de todas as partes, removendo o recorte `titular=dr`.

## Contexto

O banco já preserva `Deadline.dataLimite = null` como estado válido. Na base
atual existem quatro expedientes abertos originados do painel com `prazo` e
`dataLimite` nulos, além de expedientes com prazo em dias cuja data ainda está
em cálculo pelo PJe.

Esses registros não aparecem no frontend porque `getPrazos` sempre envia
`from=agora`. A consulta resultante exige `dataLimite >= agora`, condição que
exclui valores nulos. O adaptador do frontend também tipa `dataLimite` como
obrigatória e calcula pauta, vencimento e urgência incondicionalmente.

O filtro de titular é hoje distribuído entre estado da URL, controles, chips,
adaptador do frontend e resolução de identidade no backend. O padrão
`titular=dr` pode ocultar expedientes válidos quando a identificação da parte é
incompleta.

## Solução

### 1. Consulta de prazos futuros ou sem data

O endpoint `GET /deadlines` aceitará o parâmetro booleano `includeSemData`.
Quando houver faixa de data e esse parâmetro estiver ativo, a condição será:

```text
(dataLimite dentro da faixa) OU (dataLimite IS NULL)
```

Isso preserva a exclusão dos prazos antigos vencidos e inclui os expedientes
sem data. Sem faixa de data, `includeSemData` não precisa acrescentar condição,
pois valores nulos já pertencem ao conjunto normal.

O frontend enviará `from=agora&includeSemData=true` na pauta. A paginação e os
demais filtros continuam sendo aplicados ao conjunto combinado.

### 2. Modelo anulável no frontend

`BackendDeadline.dataLimite` passará a ser `string | null`. O modelo `Prazo`
representará como anuláveis os campos derivados que só existem quando há data:

- `vencimento`;
- `vencimentoISO`;
- `pautaISO`;
- `diasParaPauta`;
- `diasRestantes`.

O mapeamento só calculará esses campos quando `dataLimite` for válida. Um prazo
sem data receberá estado visual neutro e nunca contará como crítico, urgente ou
com pauta atrasada.

Filtros de urgência, pauta e intervalos de data não incluirão itens sem data,
porque essas propriedades não existem para eles. Busca textual, tribunal, grau,
situação, natureza, tipo, assunto, órgão e cliente continuarão funcionando.

### 3. Seção universal “Expedientes sem prazo definido”

`PrazosView` separará a resposta em dois conjuntos:

- prazos com data, enviados às visualizações atuais de lista, kanban e
  calendário;
- expedientes sem data, exibidos em uma seção própria no final da área rolável.

A seção será a mesma nas três visualizações e aparecerá depois da lista, do
kanban ou do calendário. Como os itens não têm urgência cronológica, eles não
devem ocupar o início da pauta. Cada item mostrará tribunal/grau, cliente ou
parte, tipo do expediente, natureza quando conhecida, número do processo e
órgão julgador. O rótulo explicará que o PJe ainda não informou uma data limite.
O item continuará levando ao processo correspondente.

O cabeçalho informará a quantidade de expedientes sem data. O estado vazio da
visualização principal só aparecerá quando ambos os conjuntos estiverem vazios.

Os alertas de criticidade e pauta atrasada considerarão somente itens com data.
O PDF de pauta receberá apenas itens com data; o PDF geral deverá aceitar os
itens sem data e identificá-los como “Sem prazo definido”, sem gerar datas
inválidas.

### 4. Remoção completa do titular

O frontend removerá:

- `titular` das chaves, tipos, estado padrão e serialização dos filtros;
- o seletor “Titular do expediente”;
- o chip “Ambos os lados”;
- o parâmetro enviado à API;
- o estado e alerta `titularIndisponivel`.

O backend removerá o parâmetro documentado `titular`, a resolução de identidade
e a condição `id in (...)` da rota de listagem. `GET /deadlines` passará a
retornar sempre todas as partes. URLs antigas com `titular=dr` ou
`titular=todos` serão ignoradas como parâmetros desconhecidos, sem erro.

Os utilitários de identidade podem permanecer no repositório se ainda tiverem
outro consumidor; caso sejam exclusivos da rota de prazos, serão removidos com
seus testes.

## Segurança e consistência

A consulta permanece limitada ao `userId` autenticado. “Todas as partes” não
significa todos os usuários ou escritórios: significa apenas todos os
expedientes pertencentes aos processos visíveis para o usuário atual.

Nenhum dado será reclassificado ou alterado no banco. A mudança é de consulta e
apresentação. Expedientes fechados continuam obedecendo ao filtro de situação.

## Testes

Serão cobertos:

- API com `from` e `includeSemData=true`, retornando futuro e nulo, mas não
  vencido;
- API ignorando `titular=dr` e retornando todas as partes;
- mapeamento de `dataLimite = null` sem `Invalid Date` ou `NaN`;
- itens sem data fora dos contadores de criticidade e pauta atrasada;
- filtros de urgência, pauta e data excluindo corretamente itens sem data;
- seção sem data presente no final das visualizações lista, kanban e calendário;
- remoção do controle e dos chips de titular;
- PDFs sem data inválida;
- regressão dos prazos com data e dos filtros existentes.

Uma verificação local na página `/prazos` deverá confirmar os quatro expedientes
sem prazo atualmente persistidos e a ausência do seletor de titular.

## Fora de escopo

- calcular uma data que o PJe não informou;
- transformar expediente sem data em prazo crítico;
- alterar a reconciliação ou a persistência do scraper;
- mudar a regra dos três dias de antecedência da pauta;
- excluir expedientes antigos do banco.
