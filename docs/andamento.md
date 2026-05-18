# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
- Data: `2026-05-17`
- Entrega principal: ajustes de login + logout rapido no topo da tela mobile.
- Resultado entregue:
  - Pagina `login`:
    - Removido o feedback de `Carregando...` exibido abaixo do botao.
    - Botao principal em modo login alterado de `Entrar no Finance GO` para `Acessar`.
    - Mensagem de status agora aparece apenas quando existe texto real (ex.: erro).
  - Tela mobile do FinanceGO:
    - Adicionado icone de logout no topo direito da tela.
    - Incluida acao `Sair` tambem no rodape do menu lateral.
    - Logout limpa cookie de sessao no backend e encerra sessao local do Supabase no cliente.
  - Build web:
    - `npm run build` executado com sucesso apos os ajustes.

## Etapa atual
- Objetivo: validar UX final de acesso/saida no fluxo mobile e login.
- Em andamento:
  - [ ] Validar logout pelo icone superior em diferentes navegadores mobile.
  - [ ] Validar texto/estado do botao `Acessar` em condicao de erro de login.
  - [ ] Confirmar retorno consistente para `/login` apos deslogar.

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
