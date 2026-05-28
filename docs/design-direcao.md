# Direcao de Design e Jornada do Usuario

Documento vivo para orientar evolucoes visuais do Finance GO no site e no APK.

## Direcao visual atual
- Data: `2026-05-28`
- Norte visual: produto financeiro premium, claro, modular e confiavel.
- Linguagem aplicada:
  - Cards com estrutura tipo bento para organizar informacoes densas sem parecer planilha.
  - Superficies translúcidas usadas com controle em navegacao, paineis e modais.
  - Fundo com gradientes suaves para dar profundidade sem prejudicar leitura.
  - Cores de acao com significado: verde para progresso/confirmacao, azul para analise e recorrencias, vermelho para risco/despesa/exclusao.
  - Cantos mais amplos e espacamento mais generoso para melhorar toque no APK e leitura no site.

## Hierarquia visual recomendada
- A primeira leitura deve responder: `quanto tenho`, `quanto entrou`, `quanto saiu` e `o que exige acao`.
- O painel de contas deve funcionar como filtro e tambem como mapa financeiro.
- A lista de transacoes deve priorizar data, descricao, conta, categoria, valor e consolidacao.
- Acoes destrutivas devem ficar visualmente separadas e sempre com confirmacao.
- Recorrencias e parcelamentos devem manter destaque azul consistente em web e APK.
- O botao de adicionar transacao deve ser sempre visivel nas telas principais, inclusive quando a lista esta vazia.

## Jornada web sugerida
- Entrada do usuario:
  - Login direto e limpo.
  - Apos login, abrir `Início` com resumo mensal.
- Rotina diaria:
  - Conferir saldo e pendencias.
  - Abrir `Transacoes`.
  - Filtrar por conta, categoria, tipo ou mes.
  - Consolidar/desconsolidar direto na lista.
- Rotina semanal:
  - Revisar nao consolidadas.
  - Reclassificar transacoes em lote.
  - Conferir graficos e maiores categorias.
- Rotina mensal:
  - Validar saldo anterior.
  - Fechar mes consolidado.
  - Ajustar orcamentos e recorrencias futuras.

## Jornada APK sugerida
- A tela principal deve ser operacional e rapida: saldo, contas, transacoes e botao flutuante de nova transacao.
- O menu de tres pontos deve concentrar acoes secundarias: categorias, bancos, adicionar conta, atualizar e perfil.
- O seletor de periodo deve ficar sempre antes dos saldos para indicar claramente a base do calculo.
- A tela de conta especifica deve manter o mesmo padrao da tela principal, mas contextualizada na conta aberta.
- A captura de notificacoes deve ter uma tela simples de diagnostico no futuro: permissao ativa, ultimo evento capturado, ultimo envio e ultimo erro.

## Melhorias futuras de UX
- Criar uma `Central de Fechamento do Mes` com checklist: revisar pendentes, consolidar, validar saldo e arquivar mes.
- Adicionar busca global no site para localizar transacoes, contas e categorias rapidamente.
- Criar filtros salvos por usuario: `Cartoes`, `Contas correntes`, `Pendentes`, `Recorrentes`.
- Permitir atalhos de teclado no site para nova transacao, busca e navegacao entre meses.
- Criar onboarding guiado para novos usuarios: banco, conta, primeira transacao, notificacoes e categorias.
- Criar indicadores de confianca: ultima sincronizacao, transacoes capturadas por notificacao e transacoes importadas.
- Evoluir graficos para responder perguntas praticas: `onde gasto mais`, `o que aumentou`, `o que vence em breve`.
