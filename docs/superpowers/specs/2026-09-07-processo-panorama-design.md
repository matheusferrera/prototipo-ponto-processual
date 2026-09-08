# Panorama do processo

Direção aprovada no companion: opção A, resumo acima das movimentações e ficha expansível. Sem seleção gravada no companion, adota-se a opção inicialmente exibida, conforme comunicado ao usuário.

## Comportamento

- Cabeçalho compacto com nome legível das partes, CNJ copiável, tribunal, classe e grau quando conhecido.
- Panorama independente dos filtros e da aba: último acontecimento e prazo pendente; sugestão de IA com indicação de revisão, destinatário, fundamento e link para o ato.
- Prazo encerrado não aparece como pendência. Datas estimadas e destinatários não confirmados mantêm rótulos explícitos. Prazos sem data continuam visíveis.
- Mock autorizado para representação, responsável e exemplo de providência quando não existir ação de IA; cada exemplo é identificado como demonstração. Revisão é uma interação local à página, explicitamente indicada.
- Detalhes completos recolhíveis após o cabeçalho/panorama, acessíveis antes de percorrer todo o histórico, com partes, representantes, classificação e acompanhamento.
- Manter timeline, filtros e calendário atuais. Aba de prazos reutiliza PrazoRow para manter a apresentação do sistema. Documentos preservam fontes e links existentes.

## Execução e validação

1. Extrair seleção do panorama e componente de resumo, com controles pequenos no cliente.
2. Reorganizar a página e CSS usando os tokens atuais, sem alterações globais.
3. Testar seleção de prazos/ações, verificar TypeScript e lint dos arquivos alterados, conferir renderização responsiva quando o ambiente permitir.
