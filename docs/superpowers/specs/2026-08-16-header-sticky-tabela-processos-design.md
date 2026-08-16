# Cabeçalho sticky da tabela de processos

## Objetivo

Manter visível a linha com os nomes das colunas da tabela desktop de `/processos` enquanto o usuário percorre verticalmente suas linhas.

## Escopo

- Aplicar o comportamento sticky somente ao cabeçalho de colunas da tabela.
- Permitir que a faixa de metadados, incluindo “X colunas visíveis”, role normalmente.
- Preservar a rolagem horizontal, o arraste para rolar, a ordenação, o redimensionamento e as colunas fixadas.
- Manter o comportamento mobile atual, no qual a tabela desktop é substituída por cartões.

## Design

A área de conteúdo existente será o contêiner responsável pela rolagem vertical e horizontal da tabela. O ancestral interno que hoje limita a rolagem ao eixo horizontal deixará de criar um contêiner de rolagem concorrente. Assim, as células do `<thead>` poderão usar `position: sticky` com `top: 0` em relação à área de conteúdo.

Cada célula do cabeçalho terá fundo opaco e camada acima das células do corpo. As células de cabeçalho pertencentes a colunas fixadas combinarão a fixação vertical com a horizontal, usando uma camada superior às demais. A borda inferior continuará separando visualmente o cabeçalho das linhas durante a rolagem.

O mecanismo de arraste será ajustado para movimentar o mesmo contêiner nos dois eixos. Links de ordenação e divisores de redimensionamento continuarão interrompendo ou distinguindo seus gestos conforme o comportamento atual.

## Fluxo e estados

Não haverá mudança de dados, propriedades ou estado persistido. O comportamento depende somente da posição de rolagem do contêiner existente. Ao alcançar o topo da área rolável, o cabeçalho permanece visível; ao retornar ao início da tabela, volta à posição normal no fluxo.

## Tratamento de limites

- O cabeçalho não deve cobrir o header global da aplicação, pois ficará limitado à área de conteúdo abaixo dele.
- A faixa de metadados não fará parte da região sticky.
- Colunas fixadas à esquerda ou à direita devem permanecer acima das células comuns nos dois eixos.
- O layout de cartões em telas de até 768 px não será alterado.

## Verificação

- Percorrer verticalmente uma lista longa e confirmar que apenas os nomes das colunas permanecem no topo.
- Rolar horizontalmente e arrastar a tabela, verificando o alinhamento entre cabeçalho e corpo.
- Testar ordenação, redimensionamento e fixação de colunas com o cabeçalho preso.
- Confirmar que a faixa de metadados rola para fora da tela.
- Executar lint, typecheck e build do frontend.
