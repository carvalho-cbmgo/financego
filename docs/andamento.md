# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
- Data: `2026-05-17`
- Entrega principal: interface mobile dedicada com redirecionamento automatico apos login.
- Resultado entregue:
  - Fluxo mobile:
    - `middleware.ts` passou a proteger e rotear `/mobile`.
    - Usuario autenticado em celular e redirecionado automaticamente para `/mobile`.
    - Usuario autenticado em desktop continua no fluxo `/dashboard`.
  - Login:
    - `src/app/login/page.tsx` identifica dispositivo no client e direciona para `/mobile` (celular) ou `/dashboard` (desktop).
  - Nova tela mobile:
    - Nova rota `src/app/mobile/page.tsx` com visao geral otimizada para celular.
    - Blocos implementados: saldo das contas, resultado do periodo, comparativo de saidas, fluxo de caixa e despesas por categoria.
    - Atalhos visuais: `Ultimas alteracoes` e `Nao consolidadas`.
  - Navegacao de mes no mobile:
    - Novo componente `src/components/mobile-month-picker.tsx` com setas anterior/proximo e seletor de mes.
  - Estilizacao:
    - Novas classes `fg-mobile-*` no `src/app/globals.css` para layout e identidade visual mobile.
  - Validacao:
    - `npm run build` executado com sucesso apos as alteracoes.

## Etapa atual
- Objetivo: validar experiencia mobile em dispositivo real e garantir paridade de dados com o dashboard desktop.
- Em andamento:
  - [ ] Validar navegacao de mes em Android e iOS.
  - [ ] Validar desempenho e leitura dos cards em telas pequenas.
  - [ ] Confirmar consistencia dos numeros mobile x dashboard para o mesmo `month_ref`.

## Proximas etapas
- Curto prazo:
  - [ ] Ajustar refinamentos visuais da tela mobile apos feedback de uso real.
  - [ ] Revisar eventuais diferencas de user-agent (tablet vs celular) na regra de redirecionamento.
- Medio prazo:
  - [ ] Evoluir a tela mobile para incluir filtros rapidos por conta e categoria.
  - [ ] Definir testes automatizados para fluxo de login + redirect mobile.
- Longo prazo:
  - [ ] Evoluir PWA mobile com experiencia offline para consulta de historico.

## Observacoes importantes
- Regra obrigatoria: **sempre atualizar os arquivos da pasta `/docs` apos qualquer mudanca no sistema**.
- Regra obrigatoria: **sempre realizar commit + push apos alteracoes no sistema para acionar deploy automatico no Vercel**.
- Registrar novas regras em `docs/decisoes.md`.
- Registrar novas pendencias em `docs/pendencias.md`.
- Antes de publicar, validar `npm run build`.
