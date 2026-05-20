# Finance GO Android

Nova versão nativa do aplicativo Android do Finance GO.

## Objetivo
- Login nativo do usuário.
- Sincronização com o Finance GO via APIs `/api/android/*`.
- Visualização de resumo, contas e transações.
- Criação/edição simples de transações.
- Listener de notificações bancárias em segundo plano para registro automático.

## Build
Use o script da raiz do repositório:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-financego.ps1 -Mode validate
```

## Observações
- A URL padrão de produção é `https://financego-eight.vercel.app`.
- URLs antigas salvas no celular, como `https://app-financego.vercel.app`, são migradas automaticamente na abertura do app.
- A tela de configuração orienta o usuário a habilitar o acesso às notificações quando necessário.
- A classificação de PIX/transferências usa o nome completo salvo no perfil do usuário no Finance GO.
