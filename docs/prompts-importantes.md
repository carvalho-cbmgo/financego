# Prompts Importantes

Registro de prompts que direcionaram implementacoes e ajustes relevantes.

## Prompts usados para implementacao
- Objetivo: incluir modos de recorrencia na criacao/edicao de transacoes.
- Prompt base: "Na pagina transactions, ajustar para criar transacoes em 3 modalidades: Sem repeticao, Parcelamento (mensal) e Avancado..."
- Resultado: suporte completo de recorrencia com vinculo e controle por escopo.
- Referencia: `b0a7711`, `310b3c4`.

- Objetivo: reorganizar toolbar da aba transactions.
- Prompt base: "Criar botao para adicionar transacoes... substituir icone de excluir por DEL..."
- Resultado: barra com melhor hierarquia, DEL padronizado e fluxo de adicao mais claro.
- Referencia: `516ccbd`, `d32cb40`, `c8a502b`.

## Prompts usados para correcao de bugs
- Bug: variaveis de ambiente ausentes do Supabase em runtime.
- Prompt base: "Ao tentar criar conta pelo site apareceu erro de NEXT_PUBLIC_SUPABASE_URL..."
- Correcao aplicada: revisao de variaveis no ambiente local/Vercel.
- Validacao: criacao de conta/login funcionando.

- Bug: exclusao de categoria reaparecendo no painel.
- Prompt base: "Na pagina transactions, nao estou conseguindo excluir categorias..."
- Correcao aplicada: ajuste de sincronizacao/atualizacao da arvore.
- Validacao: exclusao com refresh consistente.

## Prompts usados para revisao de codigo
- Escopo revisado: regras de transacao, recorrencia e filtros.
- Prompt base: "Revise riscos de regressao na pagina transactions..."
- Pontos principais: consistencia de sinais de valores, filtros combinados, exclusao por escopo.
- Acoes tomadas: ajustes em APIs e no frontend com build de validacao.

## Prompts usados para documentacao
- Artefato documentado: pasta `/docs` e `README`.
- Prompt base: "Crie no meu projeto uma pasta chamada /docs..."
- Resultado: estrutura persistente de contexto no repositorio.

- Artefato documentado: atualizacao de estado apos iteracoes de `transactions`.
- Prompt base: "atualizar arquivos do projeto da pasta docs".
- Resultado: alinhamento de andamento, decisoes, pendencias e comandos com estado atual.
