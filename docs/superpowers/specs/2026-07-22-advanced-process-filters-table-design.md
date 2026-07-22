# Filtros avançados e tabela configurável de processos

Data: 2026-07-22

Status: design aprovado; aguardando revisão da especificação escrita

Escopo inicial: `/processos`

## Objetivo

Substituir os filtros experimentais e a grade fixa da página de processos por um workspace de dados profissional. A primeira entrega deve permitir filtrar usando o contrato real de `GET /processes`, salvar visualizações no navegador e personalizar a tabela sem depender de alterações adicionais no backend.

O núcleo será reutilizável por outras listagens, mas somente `/processos` será migrado nesta entrega. Seleção de linhas e ações em lote ficam fora do escopo.

## Direção de experiência aprovada

A interface seguirá a direção “barra compacta + painéis laterais”:

- a barra da página mantém busca, filtros, ordenação, visualizações salvas e configuração da tabela;
- filtros e configuração abrem em painel lateral no desktop e bottom sheet no mobile;
- filtros são editados como rascunho e só alteram a URL ao acionar **Aplicar filtros**;
- filtros aplicados aparecem em uma faixa de chips removíveis, com ação **Limpar tudo**;
- a tabela ocupa a maior largura disponível;
- controles usam a identidade editorial atual: fundos creme, verde-floresta, Manrope/JetBrains Mono e bordas retas;
- interações têm foco visível, rótulos acessíveis e alvos de pelo menos 44 px no mobile.

## Filtros e contrato da API

O Server Component continuará sendo responsável por buscar dados. `getProcessos` deixará de baixar 100 registros e filtrar em memória: passará todos os filtros válidos ao backend e preservará a paginação real.

### Campos expostos

| Interface | Query da API | Formato | Observação |
|---|---|---|---|
| Busca livre | `q` | string | Busca da API não inclui parte nem tribunal. O placeholder e a ajuda refletirão os campos suportados. |
| Tribunal | `tribunal` | CSV | Multisseleção; valores-base como `TRF1` são expandidos pela API para G1 e G2. |
| Grau | `grau` | `1` ou `2` | Seleção única. |
| Estado visual | `state` | `signal`, `alert` ou `quiet` | Seleção única porque o backend não aceita CSV nesse campo. |
| Status do processo | `status` | CSV | Multisseleção com `active` (Ativo) e `archived` (Arquivado). Não será confundido com o estado visual. |
| Monitoramento | `monitored` | `true` ou `false` | Substitui o parâmetro legado `whats`. |
| Assunto | `assunto` | string | Correspondência parcial, sem diferenciar maiúsculas/minúsculas. |
| Classe judicial | `classe` | string | Correspondência parcial. |
| Órgão julgador | `orgao` | string | Correspondência parcial. |
| Valor da causa | `valorMin`, `valorMax` | número | Campos vazios são omitidos para evitar que sejam convertidos em zero. |
| Data de autuação | `autuadoFrom`, `autuadoTo` | ISO 8601 | A data final será serializada para o fim do dia selecionado. |
| Última movimentação | `movFrom`, `movTo` | ISO 8601 | Mesma regra de início/fim do dia. |
| Ordenação | `sort`, `order` | chave + `asc`/`desc` | Chaves aceitas: `recent`, `cnj`, `tribunal`, `valor`, `autuado`. |
| Paginação | `page`, `limit` | inteiro | Primeira entrega mantém 20 itens por página. |

Filtros são combinados com `E`. A busca livre usa `OU` internamente entre número, classe, assunto, órgão e última movimentação. Não haverá construtor arbitrário `E/OU` nesta versão.

### Normalização e compatibilidade

- a URL do front será a fonte de verdade para filtros, ordenação e página;
- valores multisselecionados serão armazenados na URL como CSV, exatamente como a API espera;
- parâmetros vazios e inválidos serão omitidos ou normalizados;
- qualquer mudança de filtro ou ordenação volta para `page=1`;
- o parâmetro antigo `status=signal|alert|quiet` será migrado para `state`;
- o parâmetro antigo `whats=ativos|inativos` será migrado para `monitored=true|false`;
- a ordenação antiga `sort=status` será removida, pois não é suportada pela API;
- o total, a página atual e `totalPages` virão sempre da resposta do backend;
- uma lista vazia será tratada como zero páginas na apresentação, sem produzir navegação inválida.

## Composição do front

### `ProcessosPage`

Permanece Server Component. Ele valida os `searchParams`, cria um `ProcessoQuery`, chama `getProcessos` e fornece dados e estado serializado ao workspace.

### `ProcessWorkspace`

Será um Client Component focado em interação e apresentação. Receberá apenas dados já carregados, metadados de paginação e filtros aplicados. Responsabilidades:

- abrir/fechar os painéis;
- manter rascunhos de filtro antes de aplicar;
- atualizar a URL com `router.push` sem chamar o backend diretamente;
- remover chips individualmente;
- gerenciar visualizações salvas e preferências da tabela;
- renderizar a tabela desktop ou os cards mobile.

### `ProcessFilterPanel`

Formulário controlado com grupos progressivos:

1. filtros frequentes: tribunal, estado, grau e monitoramento;
2. dados processuais: assunto, classe e órgão;
3. faixas: valor, autuação e última movimentação.

O painel contém **Aplicar filtros**, **Limpar rascunho** e fechar. Fechar sem aplicar descarta o rascunho e restaura o estado aplicado. Não haverá contagem preditiva antes de aplicar porque a API não oferece endpoint de facets/preview.

### `ActiveFilterChips`

Cada chip mostra rótulo humano e remove somente seu valor. Em um campo multivalorado, cada tribunal/status aparece como chip próprio. A ação **Limpar tudo** remove filtros e busca, preservando a configuração visual da tabela.

### Visualizações salvas

Uma visualização salva reúne filtros, busca, ordenação e preferências da tabela. A primeira versão permite:

- salvar com nome;
- aplicar;
- substituir a configuração de uma visualização existente;
- renomear;
- excluir com confirmação;
- restaurar a visualização padrão.

Persistência local usa uma camada isolada e versionada, permitindo trocar `localStorage` por API posteriormente sem alterar os componentes visuais.

## Tabela configurável

### Colunas

O backend já retorna dados suficientes para disponibilizar:

- estado visual;
- tribunal;
- número CNJ e órgão julgador;
- classe judicial;
- assunto;
- polo ativo;
- polo passivo;
- valor da causa;
- data de autuação;
- última movimentação;
- data da última movimentação;
- estado de sincronização;
- monitoramento.

Número CNJ permanece obrigatório para preservar a identidade e o link do registro. As demais colunas podem ser mostradas ou ocultadas. Estado e CNJ formam o conjunto fixo padrão; o usuário pode fixar outras colunas respeitando a largura disponível.

`BackendProcess` aceitará `valorCausa` como `string | number | null`, normalizando-o para apresentação monetária. Datas e campos adicionais retornados pela API serão preservados no tipo de UI em vez de descartados durante o mapeamento.

### Preferências

O painel **Configurar tabela** oferece:

- mostrar ou ocultar colunas;
- reordenar por arraste;
- alternativa por teclado com ações subir/descer;
- redimensionar por alça no cabeçalho;
- duplo clique na alça para restaurar a largura recomendada;
- fixar/desafixar colunas;
- densidade compacta, confortável ou ampla;
- tamanho de fonte entre 12 e 18 px, em passos de 1 px;
- prévia instantânea das alterações;
- restaurar configuração padrão.

O tamanho da fonte é independente da densidade: tipografia altera a escala do conteúdo; densidade altera altura e espaçamento das linhas. Textos secundários acompanham a escala proporcionalmente e a linha cresce quando necessário para não cortar conteúdo.

### Ordenação

Somente cabeçalhos suportados pela API exibem affordance de ordenação. O primeiro clique usa a direção padrão do campo, o segundo inverte a direção. `aria-sort` comunica o estado atual.

### Desktop e mobile

No desktop, a tabela permite scroll horizontal e mantém colunas fixas visíveis. No mobile, a tabela vira cards para evitar uma grade larga. Número CNJ e estado permanecem; o usuário escolhe quais campos secundários aparecem, usando a mesma configuração de visibilidade.

## Persistência local

Chaves versionadas:

- `ponto-processual:process-table:v1` para colunas, ordem, largura, fixação, densidade e fonte;
- `ponto-processual:process-views:v1` para visualizações salvas.

Leitura e escrita serão protegidas contra ambiente SSR, JSON inválido, versões futuras e indisponibilidade do storage. Em qualquer falha, o sistema usa os defaults sem bloquear a listagem.

## Estados, erros e acessibilidade

- carregamento de nova URL usa o feedback já previsto pelo App Router e mantém dimensões estáveis;
- erro de backend apresenta mensagem com ação de tentar novamente;
- zero resultados mostra os filtros ativos e oferece limpar filtros;
- painel e bottom sheet restauram foco ao gatilho ao fechar;
- `Escape` fecha painéis; Tab segue a ordem visual;
- drag nunca será o único meio de reordenar;
- alças de resize terão área de interação ampliada e controle equivalente por teclado;
- controles icon-only terão nome acessível;
- nenhuma informação depende apenas de cor;
- animações respeitam `prefers-reduced-motion`.

## Verificação

### Comportamento

- serialização correta de CSV, booleanos, números e datas ISO;
- aplicação, remoção individual e limpeza de filtros;
- reset de página ao filtrar/ordenar;
- paginação preservando todos os filtros;
- ordenação bidirecional somente em campos aceitos pela API;
- persistência e recuperação de preferências e visualizações;
- fallback seguro para storage corrompido;
- mostrar/ocultar, reordenar, redimensionar e fixar colunas;
- fonte 12–18 px e densidade independentes;
- cards mobile refletindo visibilidade configurada.

### Qualidade

- `npm run typecheck`;
- `npm run lint`;
- `npm run build`;
- teste manual em 375, 768, 1024 e 1440 px;
- navegação completa por teclado;
- foco visível e sem armadilhas;
- verificação com `prefers-reduced-motion`;
- comparação das queries emitidas com o contrato de `GET /processes`.

## Fora do escopo

- seleção de várias linhas e ações em lote;
- persistência de preferências no backend;
- endpoint de facets ou contagem antes de aplicar;
- grupos arbitrários de condições `E/OU`;
- migração das páginas Movimentações e Prazos;
- novos filtros que a API ainda não suporta, como nome da parte.
