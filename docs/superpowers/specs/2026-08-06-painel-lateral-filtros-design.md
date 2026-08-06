# Painel lateral de filtros

## Objetivo

Substituir os painéis de filtros horizontais, atualmente exibidos acima do conteúdo, por uma coluna lateral direita alternável. A mudança deve atender as páginas de Processos e Prazos sem alterar o funcionamento dos filtros, das URLs ou da aplicação automática.

## Direção visual aprovada

No desktop, o conteúdo principal e o painel formam duas colunas. O painel ocupa aproximadamente 360 px à direita e reduz temporariamente a largura disponível para a tabela ou pauta. Quando fechado, o conteúdo principal recupera toda a largura.

O painel abre e fecha pelo botão de filtros. Também possui um botão `X` no cabeçalho. Na página de Processos, o painel de configuração de colunas usa a mesma região lateral para evitar a permanência de um segundo painel expansível acima da tabela.

## Comportamento responsivo

- Em viewports com pelo menos 1100 px, o painel é uma coluna estrutural à direita, com largura responsiva limitada entre 320 e 380 px.
- Abaixo de 1100 px, o painel usa uma folha lateral sobreposta à direita para não comprimir excessivamente o conteúdo.
- Em celulares, a folha pode ocupar toda a largura disponível e preserva os alvos de toque existentes.
- A tabela mantém seu próprio scroll horizontal quando necessário.

O breakpoint é baseado no espaço necessário para o conteúdo, não apenas na distinção entre desktop e celular.

## Arquitetura de componentes

Um componente compartilhado de workspace será responsável por organizar:

1. a região principal rolável;
2. a região lateral opcional;
3. um host lateral identificado, usado como destino do painel no desktop.

O workspace não conhecerá os campos de Processos ou Prazos. Cada controle continuará responsável por seu estado aberto, rascunho, navegação e aplicação automática. Um invólucro responsivo compartilhado renderizará o conteúdo do painel por portal no host estrutural em telas largas e por `Sheet` nas telas menores. Assim, os controles podem permanecer no cabeçalho sem elevar seu estado para a página server-side.

Na página de Processos, `ProcessFilterControls` continuará alternando entre os estados `filters`, `columns` e fechado. O conteúdo selecionado será enviado ao workspace lateral. A área acima da tabela manterá apenas os indicadores e chips de filtros ativos.

Na página de Prazos, `PrazoFilterControls` controlará o estado aberto e enviará seu formulário ao mesmo workspace. As abas Lista, Kanban e Calendário não serão alteradas.

## Fluxo de interação

- Ao selecionar o botão de filtros, o painel abre na lateral.
- Um segundo clique no mesmo botão fecha o painel.
- Em Processos, clicar em `Colunas` troca o conteúdo da lateral sem fechar o workspace.
- Clicar em `X`, pressionar `Escape` na folha sobreposta ou fechar pela interação padrão do componente móvel encerra o painel.
- Quando o painel abre, o foco vai para o título correspondente.
- Quando fecha, o foco retorna ao botão que o abriu quando esse botão ainda estiver disponível.
- Alterações de filtros continuam atualizando a URL e o conteúdo automaticamente.
- Chips de filtros ativos continuam removendo critérios sem depender de o painel estar aberto.

## Rolagem e dimensões

O cabeçalho e o rodapé do formulário permanecem visíveis dentro da lateral. Apenas o corpo dos campos rola verticalmente. O painel usa a altura disponível abaixo do cabeçalho da página e não cria rolagem horizontal própria.

No desktop largo, a paginação de Processos permanece associada à coluna da tabela, não ao painel. Em Prazos, barras de exportação, alertas e visualizações permanecem dentro da coluna principal.

## Acessibilidade

- Os botões preservam `aria-expanded` e apontam para o identificador do painel.
- O painel possui título acessível e região identificável.
- A folha móvel mantém contenção de foco e fechamento por `Escape` fornecidos pelo componente `Sheet`.
- A lateral estrutural não bloqueia a interação com a tabela.
- O estado de atualização continua anunciado por `aria-live`.
- Animações respeitam `prefers-reduced-motion`.

## Falhas e preservação de estado

Uma navegação causada pela aplicação de filtros não fecha o painel no desktop enquanto o componente permanecer montado. Se a página for recarregada, o painel inicia fechado e os filtros são restaurados pela URL, como ocorre hoje.

Falhas na consulta não alteram a estrutura do painel; as mensagens e estados vazios existentes continuam aparecendo na região principal.

## Verificação

Serão validados:

- abertura e fechamento pelo mesmo botão;
- fechamento pelo `X` e por `Escape` na folha sobreposta;
- troca entre Filtros e Colunas em Processos;
- foco inicial e retorno de foco;
- layout em larguras acima e abaixo de 1100 px;
- funcionamento nas páginas de Processos e Prazos;
- aplicação automática e atualização da URL;
- remoção de critérios pelos chips;
- scroll da tabela, do painel e das visualizações de prazos;
- ausência do antigo painel horizontal acima do conteúdo;
- typecheck, lint dos arquivos alterados e build de produção.

## Critérios de aceite

- Filtros de Processos e Prazos aparecem lateralmente, nunca como uma faixa expansível acima do conteúdo.
- Em telas largas, o painel e o conteúdo permanecem lado a lado somente enquanto o painel está aberto.
- Em telas menores, o painel é uma folha lateral sobreposta.
- O painel de Colunas de Processos compartilha a mesma lateral.
- Nenhuma capacidade atual de filtro, ordenação, visualização salva ou configuração de tabela é perdida.
- O comportamento é utilizável por mouse, toque e teclado.
