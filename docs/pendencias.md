# Pendencias do Projeto

Backlog operacional para manter visibilidade do que ainda precisa ser entregue.

## Pendencias criticas
- [ ] Testar instalacao e execucao do APK release assinado em pelo menos 2 aparelhos Android.
- [ ] Validar fluxo real: notificacao bancaria recebida -> transacao criada automaticamente no FinanceGO.
- [ ] Confirmar estabilidade do listener com aparelho bloqueado e apos reinicio.

## Pendencias importantes
- [ ] Avaliar opcao de confirmar logout no mobile (on/off) para evitar saídas acidentais por toque no icone.
- [ ] Avaliar opcao de "desativar" (sem excluir) dispositivo pareado para troubleshooting.
- [ ] Criar tela de diagnostico no companion com "ultimo evento capturado", "ultimo envio", "ultimo erro HTTP".
- [ ] Avaliar parametro opcional para desativar replicacao automatica ao salvar o mes atual (modo avancado).
- [ ] Adicionar opcao de destacar apenas categorias com maior consumo no grafico pizza (top N).
- [ ] Avaliar tooltip no grafico pizza para detalhar categoria ao passar o mouse.
- [ ] Ajustar ordenacao opcional no monitoramento de `budgets` (maior consumo, maior excesso, alfabetica).
- [ ] Avaliar inclusao de modo "copiar orcamento do mes anterior" na tela de `budgets`.
- [ ] Definir se categorias com orcamento zero devem permanecer visiveis ou serem ocultadas automaticamente.
- [ ] Validar UX da exclusao de conta com mensagem de impacto (conta + transacoes vinculadas).
- [ ] Definir se no futuro o saldo de contas na lateral de `transactions` deve ser dinamico por mes de referencia ou sempre saldo persistido.
- [ ] Implementar acao de desparear/desativar dispositivo direto em `/mobile/pair`.
- [ ] Adicionar feedback no web quando deep link de auto-pareamento for bloqueado pelo navegador.
- [ ] Expandir feedback da tela de pareamento (mostrar status de token ativo e ultimo envio em tempo real).
- [ ] Refinar visual do menu lateral mobile para aproximacao final da referencia.
- [ ] Definir rotina de publicacao recorrente de APK para teste interno.

## Melhorias futuras
- [ ] Incluir verificacao de conectividade e fila offline no UI do companion.
- [ ] Adicionar endpoint de healthcheck para cada dispositivo pareado.
- [ ] Criar pipeline de build Android automatizado (CI) para gerar APK por commit/tag.

## Bugs conhecidos
- ID: `TRX-001`
- Descricao: ambiente local com problema de `npm` (`Exit handler never called`) bloqueando install/build nesta sessao.
- Severidade: media
- Como reproduzir: executar `npm install` ou `npm ci` no ambiente atual.
- Status: resolvido em `2026-05-17`
- Responsavel: time de desenvolvimento

- ID: `TRX-002`
- Descricao: validacao automatica de build indisponivel nesta sessao por dependencia ausente/ambiente (`next` nao reconhecido apos falha de install).
- Severidade: baixa
- Como reproduzir: executar `npm run build` sem dependencias instaladas corretamente.
- Status: resolvido em `2026-05-17`
- Responsavel: time de desenvolvimento

- ID: `ACC-003`
- Descricao: saldo da conta `NUBANK Cartao` exibido incorretamente (negativo distorcido) na pagina `transactions`.
- Severidade: alta
- Como reproduzir: abrir painel lateral de contas na aba de transacoes com historico de parcelas/planejadas.
- Status: resolvido em `2026-05-17` (via saldo dinamico com base em transacoes consolidadas).
- Responsavel: time de desenvolvimento

- ID: `ACC-004`
- Descricao: apos ajuste anterior, painel de contas no `dashboard`/`transactions` passou a mostrar saldos nulos por depender apenas de `accounts.balance`.
- Severidade: alta
- Como reproduzir: abrir painel de contas com contas manuais sem snapshot atualizado.
- Status: resolvido em `2026-05-17`
- Responsavel: time de desenvolvimento

- ID: `BUD-005`
- Descricao: pagina `budgets` antiga com categorias fixas nao permitia selecao flexivel por mes nem monitoramento completo por percentual e R$ no mesmo fluxo.
- Severidade: media
- Como reproduzir: abrir `budgets` antes da remodelagem e tentar montar orcamento customizado por mes.
- Status: resolvido em `2026-05-17`
- Responsavel: time de desenvolvimento

- ID: `NTF-006`
- Descricao: notificacao real do Nubank recebida no celular, mas sem criacao imediata de transacao no FinanceGO.
- Severidade: alta
- Como reproduzir: receber push de transacao apos pareamento do companion.
- Status: resolvido em `2026-05-17` (filtro/resiliencia do listener + parser monetario ampliado + rebind automatico).
- Responsavel: time de desenvolvimento

- [ ] Validar em Xiaomi (HyperOS/MIUI) se a simulacao local PIX dispara captura automatica com app em primeiro plano e em segundo plano.
- [ ] Confirmar comportamento quando permissao `POST_NOTIFICATIONS` for negada e depois concedida.

- ID: `NTF-007`
- Descricao: alguns aparelhos exibem mensagem de seguranca/restricao para apps de fontes desconhecidas e podem bloquear fluxo automatico de notificacoes.
- Severidade: media
- Como reproduzir: instalar APK manualmente em dispositivo com politicas de seguranca mais restritivas.
- Status: em monitoramento
- Responsavel: time de desenvolvimento
