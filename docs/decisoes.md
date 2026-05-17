# Decisoes do Projeto

Registro das decisoes arquiteturais, de interface e de dados.

## Decisoes tecnicas
- Data: `2026-05-17`
- Decisao: criar rota dedicada `/mobile` com renderizacao server-side para experiencia de celular.
- Motivo: separar experiencia mobile da desktop sem quebrar o dashboard atual.
- Impacto: fluxo mobile ganhou pagina propria com componentes e metricas especificas.

- Data: `2026-05-17`
- Decisao: usar deteccao de user-agent no login e no middleware para rotear usuarios autenticados.
- Motivo: garantir entrada consistente no fluxo correto por dispositivo.
- Impacto: celular autenticado segue para `/mobile`; desktop segue para `/dashboard`.

- Data: `2026-05-17`
- Decisao: manter calculos da visao mobile alinhados ao dashboard (saldo acumulado pre-mes + consolidado no periodo).
- Motivo: evitar divergencia de indicadores entre telas diferentes.
- Impacto: maior confianca do usuario ao alternar entre mobile e desktop.

- Data: `2026-05-17`
- Decisao: usar componente client `mobile-month-picker` para navegacao mensal com setas e `input month`.
- Motivo: agilizar troca de referencia temporal no celular sem navegao pesada.
- Impacto: melhor usabilidade mobile na exploracao por mes.

## Decisoes de interface
- Data: `2026-05-17`
- Tela: `mobile`
- Decisao: adotar estrutura em cards verticais com cabecalho verde e blocos de KPI inspirados na referencia enviada.
- Motivo: priorizar leitura rapida e uso com uma mao no celular.
- Impacto: experiencia mobile distinta da interface desktop, sem reduzir informacao essencial.

- Data: `2026-05-17`
- Tela: `mobile`
- Decisao: incluir atalhos `Ultimas alteracoes` e `Nao consolidadas` no topo da pagina.
- Motivo: facilitar acesso imediato a movimentos recentes e pendencias.
- Impacto: diminuicao de toques para tarefas frequentes.

## Decisoes de processo
- Data: `2026-05-17`
- Decisao: tornar obrigatoria a atualizacao da pasta `/docs` a cada mudanca no sistema.
- Motivo: preservar contexto e continuidade entre sessoes.
- Impacto: rastreabilidade maior de estado, pendencias e decisoes.

- Data: `2026-05-17`
- Decisao: tornar obrigatorio commit + push apos alteracoes para acionar deploy automatico no Vercel.
- Motivo: manter ambiente publicado sempre sincronizado com o codigo validado localmente.
- Impacto: reducao de divergencia entre local, GitHub e Vercel.

- Data: `2026-05-17`
- Decisao: usar certificados do sistema no Node/npm via `NODE_OPTIONS=--use-system-ca` no ambiente Windows local.
- Motivo: corrigir falha TLS com npm (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`) sem desabilitar validacao SSL.
- Impacto: `npm install` e `npm run build` funcionando com seguranca.

## Decisoes futuras
- [ ] Definir cobertura de testes automatizados para fluxo mobile completo (login + redirect + metricas).
- [ ] Definir regra final para tablets (tratar como mobile ou desktop).
- [ ] Definir padrao unico de mensagens de erro e sucesso no frontend.
