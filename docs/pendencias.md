# Pendencias do Projeto

Backlog operacional para manter visibilidade do que ainda precisa ser entregue.

## Pendencias criticas
- [ ] Reinstalar o APK Android nativo versao `1.0.8` e confirmar login usando `https://financego-eight.vercel.app`.
- [ ] Instalar o novo APK `android-financego/app/build/outputs/apk/debug/app-debug.apk` em aparelho Android real.
- [ ] Validar login nativo no APK com usuário real.
- [ ] Validar no APK os filtros de periodo `ate hoje`, `amanha ate o final do mes` e `mes completo`.
- [ ] Validar no APK a criacao de parcelamento mensal com selo azul e legenda de parcela.
- [ ] Validar no APK a edicao de recorrencia nao consolidada usando os escopos `Alterar apenas esta`, `Alterar a partir desta` e `Alterar a partir da primeira`.
- [ ] Validar no APK a edicao de conta pelo icone de lapis na tela de detalhe da conta.
- [ ] Validar no APK a exclusao de conta pela janela `Edicao de Conta`.
- [ ] Validar no APK o menu de 3 pontos da tela principal e da tela de conta.
- [ ] Validar no APK que nova transacao criada pela tela de conta ja seleciona a conta origem correta.
- [ ] Habilitar acesso às notificações para o app Finance GO Android e testar captura em segundo plano.
- [ ] Validar classificação real de notificações: PIX recebido, PIX realizado e transferência entre contas próprias.
- [x] Compilar novo APK apos inclusao de `MobileWebActivity` e `BootReceiver`.
- [ ] Configurar keystore de produção para gerar APK/AAB release assinado.
- [ ] Instalar o APK `debug` gerado em aparelho Android real.
- [ ] Validar login e navegacao do FinanceGO dentro do APK sem navegador externo.
- [ ] Testar instalacao e execucao do APK release assinado em pelo menos 2 aparelhos Android.
- [ ] Validar fluxo real: notificacao bancaria recebida -> transacao criada automaticamente no FinanceGO.
- [ ] Confirmar estabilidade do listener com aparelho bloqueado e apos reinicio.

## Pendencias importantes
- [ ] Melhorar a tela nativa Android com componentes visuais mais ricos após validação funcional em aparelho real.
- [ ] Exibir no app Android diagnóstico do último evento capturado, último envio e último erro HTTP.
- [ ] Criar fila offline para notificações quando o celular estiver sem internet.
- [ ] Criar testes unitários para a classificação de notificações baseada no nome completo do usuário.
- [ ] Criar testes unitários Android para parser/configuração do companion; `testDebugUnitTest` passa hoje como `NO-SOURCE`.
- [ ] Adicionar validação automatizada de instalação via ADB quando houver aparelho/emulador conectado.
- [ ] Avaliar geração de APK assinado interno com keystore segura fora do repositório.
- [ ] Adicionar tela de status dentro do APK informando URL ativa, ultimo envio, ultimo erro e tamanho da fila offline.
- [ ] Avaliar botao no WebView para voltar rapidamente a tela de configuracao do companion.
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
- ID: `AND-012`
- Descricao: APK Android usava como URL padrao `https://app-financego.vercel.app`, mas o dominio real do FinanceGO no Vercel e `https://financego-eight.vercel.app/`.
- Severidade: alta
- Como reproduzir: instalar APK anterior, abrir tela de login e clicar em `Entrar` usando a URL antiga.
- Status: corrigido em `2026-05-20` na versao `1.0.2`; endpoint e login real em producao foram validados.
- Responsavel: time de desenvolvimento

- ID: `AND-011`
- Descricao: APK Android nativo `1.0.0` fechava imediatamente ao abrir em aparelho real.
- Severidade: alta
- Como reproduzir: instalar `app-debug.apk` da versao `1.0.0` e abrir o app Finance GO.
- Status: corrigido em `2026-05-20` na versao `1.0.1` ao trocar `MainActivity` para `android.app.Activity` e remover AppCompat; pendente reteste fisico em celular.
- Responsavel: time de desenvolvimento

- ID: `AND-010`
- Descricao: a nova versão Android nativa ainda não foi instalada em aparelho real nesta etapa porque não havia dispositivo conectado via ADB.
- Severidade: alta
- Como reproduzir: conectar aparelho Android, executar `adb devices -l` e instalar `android-financego/app/build/outputs/apk/debug/app-debug.apk`.
- Status: pendente de teste físico
- Responsavel: time de desenvolvimento

- ID: `AND-008`
- Descricao: ambiente local não possuía Gradle disponível para compilar o companion Android.
- Severidade: alta
- Como reproduzir: executar build Android sem `gradle`/`gradlew.bat` disponível.
- Status: resolvido em `2026-05-19` com Gradle local `.tools/gradle-8.7` e script `scripts/build-android-financego.ps1`.
- Responsavel: time de desenvolvimento

- ID: `AND-009`
- Descricao: resolução de dependências Gradle falhava por inspeção HTTPS do AVG (`AVG Web/Mail Shield Root`).
- Severidade: alta
- Como reproduzir: executar Gradle sem truststore local contendo o certificado raiz do AVG.
- Status: resolvido em `2026-05-19` com truststore `.tools/financego-android-cacerts`.
- Responsavel: time de desenvolvimento

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

- ID: `AND-012`
- Descricao: validar em aparelho real o APK nativo `1.0.8` apos remodelagem de login, dashboard mensal, detalhe de conta, filtro de periodo, perfil e transacoes recorrentes.
- Severidade: alta
- Como reproduzir: instalar `android-financego/app/build/outputs/apk/debug/app-debug.apk`, entrar com usuario de teste, trocar meses, abrir uma conta, criar transacao e testar recorrencias.
- Status: pendente de teste fisico
- Responsavel: time de desenvolvimento

- ID: `AND-013`
- Descricao: validar no celular se o overlay `Carregando...` aparece de forma consistente em login, atualizacao, salvamento e abertura de telas.
- Severidade: media
- Como reproduzir: executar acoes com rede movel lenta ou Wi-Fi instavel e observar feedback visual.
- Status: pendente de teste fisico
- Responsavel: time de desenvolvimento

- ID: `AND-014`
- Descricao: validar transferencia nativa entre contas do usuario no APK, incluindo saldo da conta origem e da conta destino.
- Severidade: alta
- Como reproduzir: criar transferencia no APK selecionando conta origem/destino diferentes e conferir lancamentos no app e no web.
- Status: pendente de teste funcional
- Responsavel: time de desenvolvimento

- ID: `WEB-015`
- Descricao: revisar demais paginas antigas da web que nao foram alteradas nesta etapa para garantir acentuacao e padrao visual uniformes.
- Severidade: baixa
- Como reproduzir: navegar por todas as abas web e procurar textos sem acento ou com caracteres quebrados.
- Status: em monitoramento
- Responsavel: time de desenvolvimento

- ID: `AND-016`
- Descricao: validar no celular se os icones de atualizar, perfil, sair e nova transacao estao intuitivos e nao cortam em telas menores.
- Severidade: media
- Como reproduzir: instalar APK `1.0.8`, abrir a tela de transacoes e testar em diferentes escalas/fontes do Android.
- Status: pendente de teste fisico
- Responsavel: time de desenvolvimento

- ID: `AND-017`
- Descricao: validar no celular se o seletor de categorias do APK exibe corretamente categorias pai e subcategorias com recuo.
- Severidade: media
- Como reproduzir: criar categorias/subcategorias na web, abrir o formulario de transacao no APK e conferir a hierarquia.
- Status: pendente de teste fisico
- Responsavel: time de desenvolvimento

- ID: `NTF-018`
- Descricao: validar com notificacoes reais se `Compra no credito aprovada` vira despesa e `estorno` vira receita.
- Severidade: alta
- Como reproduzir: receber notificacoes reais do banco/cartao ou simular payloads equivalentes e conferir o tipo/valor gerado.
- Status: pendente de teste funcional em campo
- Responsavel: time de desenvolvimento

- ID: `AND-019`
- Descricao: validar no celular se o seletor de periodo do APK recalcula corretamente resumo e saldos de contas.
- Severidade: alta
- Como reproduzir: instalar APK `1.0.8`, alternar entre `Inicio do mes ate hoje`, `Amanha ate o final do mes` e `Mes completo`, e conferir `Entradas`, `Saidas`, `Saldo atual` e saldos de contas.
- Status: pendente de teste fisico
- Responsavel: time de desenvolvimento

- ID: `AND-020`
- Descricao: validar no celular se parcelamentos/recorrencias criados no APK ficam vinculados, destacados com selo azul e editaveis por escopo.
- Severidade: alta
- Como reproduzir: criar uma transacao em `Parcelamento (mensal)`, conferir parcelas mes a mes e editar uma parcela nao consolidada usando cada opcao de escopo.
- Status: pendente de teste fisico
- Responsavel: time de desenvolvimento

- ID: `AND-021`
- Descricao: validar no celular se os cards de transacao do APK exibem as tres linhas solicitadas e se o botao `Excluir` funciona no modal de edicao.
- Severidade: alta
- Como reproduzir: instalar APK `1.0.8`, abrir transacoes, conferir data/descricao, selos, conta/tipo, valor a direita e excluir uma transacao de teste.
- Status: pendente de teste fisico
- Responsavel: time de desenvolvimento

- ID: `AND-022`
- Descricao: validar no celular se a edicao/exclusao de contas no APK funciona e atualiza o painel principal apos salvar.
- Severidade: alta
- Como reproduzir: instalar APK `1.0.8`, abrir uma conta, usar menu de 3 pontos, editar banco/nome/tipo/saldo, salvar e testar exclusao com uma conta de teste.
- Status: pendente de teste fisico
- Responsavel: time de desenvolvimento

- ID: `AND-023`
- Descricao: validar no celular se o FAB de nova transacao na tela de conta preseleciona corretamente a conta origem.
- Severidade: alta
- Como reproduzir: instalar APK `1.0.8`, abrir uma conta, tocar no `+`, conferir `Conta Origem`, salvar uma transacao de teste e verificar se aparece na conta correta.
- Status: pendente de teste fisico
- Responsavel: time de desenvolvimento
