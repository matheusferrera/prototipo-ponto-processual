# Exportação dos prazos em PDF

## Objetivo

Adicionar à página `/prazos` uma ação para baixar em PDF os prazos atualmente carregados após a aplicação da busca, dos filtros e da ordenação da página.

## Experiência

- Exibir o botão `Exportar PDF` em uma barra de ações própria do conteúdo, disponível nas visualizações Lista, Kanban e Calendário.
- Desabilitar a ação quando não houver prazos.
- Durante a geração, trocar o rótulo para `Gerando PDF…` e impedir cliques repetidos.
- Em caso de falha, manter a página utilizável e exibir uma mensagem curta junto à ação.
- Gerar o arquivo `prazos-AAAA-MM-DD.pdf` e iniciar o download diretamente, sem abrir a janela de impressão.

## Conteúdo do documento

O PDF terá orientação paisagem e incluirá:

- título `Relatório de prazos`;
- data e hora da geração;
- quantidade de prazos exportados;
- tabela com vencimento, dias restantes, tribunal, tipo, assunto, parte, número CNJ e órgão julgador;
- cabeçalho repetido e numeração em documentos com várias páginas.

Os dados exportados serão exatamente o array já entregue à `PrazosView`, portanto respeitarão os filtros e a ordenação processados no servidor. A visualização selecionada não altera o conteúdo tabular do relatório.

## Arquitetura

A geração ocorrerá no navegador por meio de `jsPDF` e `jspdf-autotable`, carregados apenas após o clique para não aumentar o JavaScript inicial da página. A montagem do relatório ficará isolada em um módulo utilitário, enquanto um componente cliente será responsável pelo botão, pelos estados de carregamento e pela mensagem de erro.

A `PrazosView` apenas posicionará o componente e fornecerá os prazos. Nenhuma rota de API ou alteração no backend será necessária.

## Tratamento dos dados

- Reutilizar `tituloPrazo` e `parteSecundaria` para manter assunto e parte consistentes com a tela.
- Representar campos ausentes com `—`.
- Manter datas e números CNJ como texto, sem conversões que possam remover zeros.
- Permitir quebra de linha em campos longos para evitar conteúdo cortado.

## Verificação

- Executar TypeScript, lint e build de produção.
- Confirmar que o PDF pode ser gerado com lista preenchida.
- Confirmar que o botão fica desabilitado com lista vazia.
- Verificar responsividade da barra de ação.
- Preservar todas as alterações locais preexistentes nos arquivos da página de prazos.
