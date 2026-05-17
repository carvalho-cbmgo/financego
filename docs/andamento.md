# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
- Data: `2026-05-17`
- Entrega principal: recalculo de saldo por conta com base em transacoes consolidadas (sem inflar com previstas).
- Resultado entregue:
  - Pagina `dashboard` e aba `transactions`:
    - Reintroduzido calculo dinamico de saldo por conta, sem depender apenas de `accounts.balance`.
    - Regra aplicada:
      - Se `last_balance_at` existir: usa `accounts.balance` como snapshot.
      - Caso contrario: usa `accounts.balance` (quando nao-zero) + soma de transacoes consolidadas.
      - Se saldo base estiver zerado/nulo: usa somente soma de transacoes consolidadas.
    - Resultado: saldos deixaram de aparecer nulos e passaram a refletir o historico consolidado real.
  - Pagina `accounts`:
    - Mesmo criterio de saldo aplicado em `Saldo total`, `Visao por banco` e `Visao por conta`.
    - `Despesa prevista` continua separada, baseada em transacoes nao consolidadas.
  - Build web:
    - `npm run build` executado com sucesso apos os ajustes.

## Etapa atual
- Objetivo: validacao funcional dos novos calculos de saldo e reconciliacao do `NUBANK Cartao`.
- Em andamento:
  - [ ] Confirmar saldo do `NUBANK Cartao` em `accounts` e `transactions` apos deploy.
  - [ ] Validar exclusao de conta em ambiente real com conta que possui historico.
  - [ ] Validar ingestao real de notificacao bancaria (`/api/notifications/ingest`).

## Proximas etapas
- Curto prazo:
  - [ ] Adicionar acao de desparear dispositivo na tela `/mobile/pair`.
  - [ ] Refinar visual do menu lateral mobile conforme feedback de uso.
- Medio prazo:
  - [ ] Publicar rotina simplificada de distribuicao de APK (release interna).
  - [ ] Criar monitor de saude do companion (fila offline, ultimo envio, erros).
- Longo prazo:
  - [ ] Evoluir estrategia de distribuicao (assinatura definitiva e canal de release).

## Observacoes importantes
- Regra obrigatoria: **sempre atualizar os arquivos da pasta `/docs` apos qualquer mudanca no sistema**.
- Regra obrigatoria: **sempre realizar commit + push apos alteracoes no sistema para acionar deploy automatico no Vercel**.
- Antes de publicar, validar `npm run build`.
