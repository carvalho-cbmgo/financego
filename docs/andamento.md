# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
- Data: `2026-05-17`
- Entrega principal: estabilizacao funcional e visual da aba `transactions`.
- Resultado entregue:
  - Formulario de criacao:
    - Ordem da acao ajustada para `Despesa`, `Receita`, `Transferencia`.
    - Botoes `Salvar` e `Cancelar` alinhados a esquerda.
    - Area de `Observacao` adicionada na criacao e mantida na edicao.
  - Recorrencia:
    - Correcao da geracao de parcelas para nao perder a ultima parcela em cenarios mensais.
    - Ajuste de data mensal para meses curtos (28/29/30/31) sem pular parcela.
    - `R$ Total` do `Parcelamento (mensal)` passou a ser calculado dinamicamente no frontend.
    - Removido sufixo automatico de parcela/recorrencia da descricao (`1 de 10`, etc), mantendo apenas indicador visual.
  - Tabela de transacoes:
    - Transacoes nao consolidadas agora ficam em negrito; consolidadas em fonte normal.
    - Alinhamento das colunas `Descricao`, `Categoria`, `Conta`, `Valor (R$)` e `C` ajustado para bater com os valores por linha.
    - Checkbox `Incluir saldo anterior` incluido acima de `Saldo sem as transacoes exibidas`, alinhado a direita.
  - Saldos da aba `transactions`:
    - `Saldo sem as transacoes exibidas` agora usa saldo acumulado antes do mes de referencia (quando o checkbox esta marcado).
    - Quando desmarcado, `Saldo sem as transacoes exibidas` passa a `0`.
    - `Saldo com as transacoes exibidas` passou a considerar `saldo base + transacoes exibidas`.
  - Navegacao de mes:
    - Setas adicionadas no seletor de mes para navegar para mes anterior/posterior com clique.
  - Ambiente local:
    - Corrigido bloqueio de `npm install`/`npm run build` por erro de certificado TLS (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`).
    - `next` reinstalado com sucesso via `npm ci`.
    - Build local validado com sucesso no PowerShell apos ajuste de ambiente (`NODE_OPTIONS=--use-system-ca`).

## Etapa atual
- Objetivo: validacao final ponta a ponta da aba `transactions` apos os ajustes de recorrencia e saldo.
- Em andamento:
  - [ ] Validar saldo anterior em diferentes filtros (conta unica, multiplas contas, banco).
  - [ ] Validar criacao de parcelamento com datas no fim do mes (29, 30 e 31).
  - [ ] Validar experiencia em mobile da tabela e do bloco de criacao.

## Proximas etapas
- Curto prazo:
  - [ ] Criar checklist de regressao especifico para `transactions` (saldo, recorrencia, consolidacao).
  - [ ] Padronizar textos/acentuacao da interface para consistencia.
- Medio prazo:
  - [ ] Expandir testes automatizados para fluxos de recorrencia e saldos.
  - [ ] Melhorar feedbacks de erro/sucesso no frontend.
- Longo prazo:
  - [ ] Evoluir analises e graficos por conta, banco e periodo.

## Observacoes importantes
- Regra obrigatoria: **sempre atualizar os arquivos da pasta `/docs` apos qualquer mudanca no sistema**.
- Registrar novas regras em `docs/decisoes.md`.
- Registrar novas pendencias em `docs/pendencias.md`.
- Antes de publicar, validar `npm run build` e fluxo de deploy.
