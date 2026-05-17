# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
- Data: `2026-05-17`
- Entrega principal: melhoria do fluxo de configuracao no APK + nova rodada de APK de compatibilidade.
- Resultado entregue:
  - UX de configuracao no APK:
    - Botao `Salvar configuracao` agora valida campos obrigatorios.
    - Exibe mensagens claras (toast + status na tela).
    - Executa teste de conectividade automaticamente apos salvar.
    - Informa erro de URL/token/rede sem ficar "silencioso".
  - Home mobile (`/mobile`):
    - Removido o componente/banner com o texto `Nova experiencia`.
    - Mantida a estrutura principal da tela com menu lateral, saldo, resultado, grafico e extrato.
  - Build web:
    - `npm run build` executado com sucesso apos a remocao do componente.
  - APK Android companion:
    - Build Android realizado localmente com sucesso.
    - APK debug gerado: `build-artifacts/financego-companion-debug.apk` (instalavel para teste).
    - APK release assinado gerado: `build-artifacts/financego-companion-release-signed.apk` (instalavel).
    - APK release nao assinado tambem gerado: `build-artifacts/financego-companion-release-unsigned.apk`.
    - APK compat atualizado para instalacao/teste em aparelhos mais restritivos: `build-artifacts/financego-companion-compat-v2-signed.apk`.

## Etapa atual
- Objetivo: validar fluxo fim a fim no celular com APK pronto.
- Em andamento:
  - [ ] Instalar APK no Android e conceder permissao de notificacoes.
  - [ ] Gerar token em `/mobile/pair` e configurar no companion.
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
