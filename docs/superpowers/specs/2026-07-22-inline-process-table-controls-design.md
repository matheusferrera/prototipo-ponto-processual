# Controles integrados da tabela de processos

## Objetivo

Mover filtros e configuração de colunas dos painéis laterais para a própria página de processos, imediatamente acima da tabela. A pessoa deve conseguir alterar a consulta e a apresentação enquanto acompanha o resultado sem perder o contexto.

## Layout aprovado

- Uma barra de trabalho ocupa toda a largura acima da tabela.
- A barra mantém busca, ordenação, visões salvas e os acionadores `Filtros` e `Colunas`.
- `Filtros` e `Colunas` abrem, de forma mutuamente exclusiva, um painel expansível no fluxo da página.
- O painel aberto empurra a tabela para baixo e nunca cobre suas células.
- Os filtros ativos permanecem visíveis em chips entre o painel e a tabela.
- O estilo segue os tokens existentes, a grade editorial e a regra de cantos retos do projeto.

## Interações

### Filtros

- Checkbox, select e ações de remoção atualizam a URL e consultam a API imediatamente.
- Campos de texto, data e valor usam atraso curto de 400 ms para agrupar digitação antes da consulta.
- Durante a navegação, o painel continua aberto e exibe um estado discreto `Atualizando tabela`.
- `Limpar filtros` restaura os filtros padrão, preservando apenas a ordenação atual.
- A URL continua sendo a fonte compartilhável dos filtros e da paginação.

### Colunas

- Exibir/ocultar, reordenar, fixar, ajustar densidade e alterar tamanho da fonte atualizam a tabela instantaneamente.
- As preferências continuam persistidas no `localStorage` pelo provider existente.
- O redimensionamento direto nos cabeçalhos continua disponível.
- A opção de restaurar o padrão permanece no fim do painel.

## Componentes e fluxo de dados

- `ProcessFilterControls` passa a renderizar a barra e o painel integrado, controlando qual aba está aberta.
- O formulário de filtros usa um rascunho sincronizado com os filtros recebidos da URL. Alterações são serializadas pelo utilitário existente e enviadas com navegação client-side.
- `TableSettingsPanel` passa a ser reutilizável fora do `Sheet` e consome o mesmo contexto de preferências.
- A página posiciona os controles dentro da área de conteúdo, antes da tabela, e deixa o `PageHeader` apenas com identidade e navegação.
- `ActiveProcessFilters` permanece imediatamente antes dos dados para remoções rápidas.

## Responsividade e acessibilidade

- Em telas estreitas, a barra quebra em linhas e o painel usa uma coluna, sem gerar rolagem horizontal na página.
- A tabela mantém o comportamento móvel já existente.
- Acionadores expõem `aria-expanded`, `aria-controls` e estado selecionado.
- O aviso de atualização usa `aria-live="polite"` e não rouba foco.
- Controles móveis mantêm área mínima de toque de 44 px e foco visível.

## Falhas e recuperação

- Uma falha da API segue o tratamento já existente da página; as preferências de coluna não são perdidas.
- Valores ainda em digitação permanecem no painel até a navegação concluir.
- A ausência de resultados continua exibindo o estado vazio com ação para limpar filtros.

## Validação

- TypeScript e ESLint nos componentes alterados.
- Testes manuais de abertura/troca/fechamento das abas.
- Testes de aplicação imediata e com debounce, preservação do painel durante a navegação e limpeza de filtros.
- Testes das preferências de coluna e persistência após recarregar.
- Verificação em larguras de 375, 768, 1024 e 1440 px, incluindo navegação por teclado.
