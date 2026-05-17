# Decisoes do Projeto

Registro das decisoes arquiteturais, de interface e de dados.

## Decisoes tecnicas
- Data: `2026-05-17`
- Decisao: implementar pareamento automatico via deep link (`financego-companion://pair`) entre `/mobile/pair` e APK.
- Motivo: eliminar digitacao manual de URL/ID/token no app companion.
- Impacto: onboarding em 1 toque no celular quando app estiver instalado.

- Data: `2026-05-17`
- Decisao: reforcar feedback no APK apos `Salvar configuracao` com validacao de campos e teste automatico de conectividade.
- Motivo: evitar percepcao de "nada aconteceu" ao salvar e reduzir erro de configuracao silencioso.
- Impacto: onboarding no app ficou mais claro e autoexplicativo.

- Data: `2026-05-17`
- Decisao: manter companion Android como caminho principal para captura automatica no celular.
- Motivo: entrega registro quase imediato de transacoes por notificacao sem depender de Android Studio para uso final.
- Impacto: usuario final instala APK pronto e configura token de pareamento.

- Data: `2026-05-17`
- Decisao: gerar e disponibilizar APK de teste (debug e release assinado) como artefato local.
- Motivo: acelerar testes em dispositivo real sem necessidade de abrir Android Studio no uso diario.
- Impacto: validação em campo ficou direta e imediata.

## Decisoes de interface
- Data: `2026-05-17`
- Tela: `mobile`
- Decisao: remover o componente/banner com texto `Nova experiencia` da tela principal mobile.
- Motivo: alinhamento com solicitacao do produto para simplificar a home no celular.
- Impacto: interface mais limpa e foco direto nos indicadores e no extrato.

- Data: `2026-05-17`
- Tela: `mobile`
- Decisao: manter painel lateral com `Visao geral`, `Saldo das contas`, `Extrato mensal` e `Grafico mensal`, sem `Metas`/`Sonhos`.
- Motivo: seguir escopo funcional definido para navegacao mobile.
- Impacto: menu objetivo e orientado ao uso financeiro diario.

## Decisoes de processo
- Data: `2026-05-17`
- Decisao: tornar obrigatoria a atualizacao da pasta `/docs` a cada mudanca no sistema.
- Motivo: preservar contexto e continuidade entre sessoes.
- Impacto: rastreabilidade maior de estado, pendencias e decisoes.

- Data: `2026-05-17`
- Decisao: tornar obrigatorio commit + push apos alteracoes para acionar deploy automatico no Vercel.
- Motivo: manter ambiente publicado sempre sincronizado com o codigo validado localmente.
- Impacto: reducao de divergencia entre local, GitHub e Vercel.

## Decisoes futuras
- [ ] Definir processo oficial de distribuicao de APK para usuarios (canal interno ou store privada).
- [ ] Definir politica de assinatura de release final (keystore de producao).
- [ ] Definir estrategia de atualizacao automatica do companion no dispositivo.
