# Catálogo de tribunais no filtro de processos

## Objetivo

Exibir no filtro da carteira de processos todos os tribunais suportados pelo sistema, usando o backend como fonte única. O filtro deve incluir o TJAM e continuar funcionando quando novos tribunais forem adicionados ao catálogo.

## Escopo

- Criar um endpoint autenticado e leve no backend para listar tribunais suportados.
- Consumir o catálogo ao renderizar a página de processos.
- Remover do fluxo principal as listas fixas e duplicadas de tribunais no front.
- Manter a seleção múltipla de tribunais, o filtro separado de grau e a aplicação automática dos filtros.
- Manter um catálogo de fallback no front para indisponibilidade temporária do endpoint.

Não fazem parte deste trabalho alterações no cadastro de tribunais, nos scrapers, no filtro de status dos processos ou na aparência geral do painel de filtros.

## Catálogo e contrato

O backend exporá `GET /tribunals`, protegido pela autenticação já usada pelas demais rotas. A resposta será um objeto com a propriedade `tribunals`, contendo os códigos-base suportados:

```json
{
  "tribunals": ["STJ", "TJAM", "TJBA", "TJDFT", "TJPI", "TJRN", "TRF1", "TRF2", "TRF3"]
}
```

O catálogo será derivado do enum `Tribunal` do Prisma. Os sufixos `G1` e `G2` serão removidos e os valores repetidos serão consolidados. A resposta não dependerá de processos, credenciais ou jobs existentes para o usuário.

O endpoint retornará os tribunais em uma ordem estável e adequada à exibição: tribunais superiores primeiro, depois tribunais estaduais e federais em ordem alfabética dentro de cada grupo. O front preservará a ordem recebida.

## Comportamento do filtro

A página de processos buscará o catálogo no servidor e passará as opções para `ProcessFilterControls`, tanto na variante desktop quanto na mobile. Cada opção continuará sendo um checkbox e a seleção continuará sendo aplicada automaticamente.

O filtro utilizará códigos-base. Por exemplo, selecionar `TJAM` sem grau incluirá `TJAMG1` e `TJAMG2`; selecionar `TJAM` com grau `2` restringirá o resultado a `TJAMG2`. Essa expansão e interseção continuarão sob responsabilidade da rota de processos do backend.

Os parâmetros de URL continuarão no formato atual, como `tribunal=TJAM,TJBA&grau=2`. Valores de tribunal que não pertençam ao catálogo serão descartados durante a leitura dos parâmetros.

## Fonte de dados no front

Uma função server-side buscará `GET /tribunals` com o token da sessão. A página de processos usará o resultado para:

1. renderizar as opções do painel de filtros;
2. validar o parâmetro `tribunal` recebido pela URL;
3. preservar seleções válidas em visualizações salvas e na navegação.

A lista fixa existente em `ProcessFilterControls` será removida. A validação em `process-filters` deixará de depender de uma constante privada diferente da lista exibida.

## Falhas e fallback

Se o catálogo não puder ser carregado por falha de rede ou resposta inválida, a carteira continuará acessível. O front usará como fallback os nove tribunais-base suportados no momento da implementação:

`STJ`, `TJAM`, `TJBA`, `TJDFT`, `TJPI`, `TJRN`, `TRF1`, `TRF2` e `TRF3`.

Falhas de autenticação continuarão seguindo o comportamento global de redirecionamento para o login. O fallback será aplicado apenas a falhas de disponibilidade ou de contrato do catálogo.

## Limites entre componentes

- O backend determina quais tribunais são suportados e transforma o enum em códigos-base.
- A camada de API server-side do front busca e valida o formato da resposta.
- A página de processos coordena catálogo, parâmetros e dados da carteira.
- `process-filters` faz parsing e serialização, recebendo os tribunais permitidos para o parsing.
- `ProcessFilterControls` apenas renderiza e altera a seleção usando as opções recebidas.

Esses limites evitam acoplar o filtro à rota de status, que executa agregações de saúde e credenciais desnecessárias para esta tela.

## Verificação

Serão cobertos os seguintes cenários:

- o catálogo transforma pares `G1`/`G2` em um único tribunal-base;
- o catálogo contém TJAM e não contém códigos com sufixo de grau;
- a página exibe todos os tribunais retornados no desktop e no mobile;
- a seleção de um ou vários tribunais é preservada na URL;
- a combinação de tribunal e grau gera os parâmetros esperados;
- códigos desconhecidos na URL são descartados;
- uma falha do catálogo ativa o fallback sem impedir a listagem de processos;
- lint, checagem de tipos e testes relevantes dos dois projetos permanecem aprovados.

## Critérios de aceite

- O filtro de processos mostra os nove tribunais-base atualmente suportados, incluindo TJAM.
- A lista exibida e a validação da URL usam o mesmo catálogo.
- A adição futura de um tribunal ao enum do backend o disponibiliza no endpoint sem duplicar manualmente os graus.
- A carteira de processos continua utilizável se o endpoint do catálogo estiver temporariamente indisponível.
- Nenhuma consulta de status, credenciais ou jobs é necessária para montar as opções do filtro.
