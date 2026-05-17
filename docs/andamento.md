# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
- Data: `2026-05-17`
- Entrega principal: exclusao de conta em `accounts` + correcao de saldo exibido em `transactions`.
- Resultado entregue:
  - Pagina `accounts`:
    - Inclusao da acao `Excluir` por conta na tabela de `Visao por conta`.
    - Fluxo de confirmacao de exclusao criado na propria pagina.
    - Nova rota `POST /api/accounts/delete` implementada com validacao de usuario e ownership.
    - Exclusao remove a conta e transacoes vinculadas (cascade no banco).
  - Pagina `transactions`:
    - Correcao do saldo exibido no painel lateral de contas.
    - Removida a soma historica de transacoes para compor saldo do card de conta.
    - O valor agora usa o saldo persistido da conta (`accounts.balance`), eliminando distorcoes como o negativo incorreto do `NUBANK Cartao`.
  - Build web:
    - `npm run build` executado com sucesso apos os ajustes.

## Etapa atual
- Objetivo: validacao funcional em dados reais apos ajustes de conta/saldo e continuidade do fluxo mobile.
- Em andamento:
  - [ ] Validar exclusao de conta em ambiente real com conta que possui historico.
  - [ ] Confirmar saldo correto do `NUBANK Cartao` na tela de transacoes apos deploy.
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
