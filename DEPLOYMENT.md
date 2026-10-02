# Guia de Deploy e Arquitetura — PAVE Webapp

Este documento descreve como funciona a arquitetura de ambientes (Desenvolvimento vs. Produção) e o passo a passo para publicar novas versões do painel no ar.

---

## 1. Visão Geral da Arquitetura

O sistema está dividido em dois ambientes isolados no cluster:

```
┌──────────────────────────────────────────────────────────────────┐
│                   SEU AMBIENTE DE TRABALHO                       │
│              Caminho: /home/labpi/pave-webapp                     │
│                                                                  │
│  • Aqui você edita o código, troca de branch e testa.             │
│  • Testes locais: ./dev.sh (Front na 5173, API na 8000).          │
│  • Alterações AQUI NÃO afetam o site público no ar.              │
└──────────────────────────────────────────────────────────────────┘
                                │
                                │ Executa: ./deploy.sh
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                   AMBIENTE DE PRODUÇÃO (ISOLADO)                  │
│              Caminho: /home/labpi/pave-producao                   │
│                                                                  │
│  • Hospeda o build compilado (front/dist) e a API de produção.   │
│  • Gerenciado pelo PM2 (serviços 'pave-front' e 'pave-api').       │
│  • Portas internas do Cluster:                                   │
│      - Front: 19030                                              │
│      - API:   19031                                              │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                   SITE PÚBLICO NO AR                             │
│             URL: https://labpi.ufsj.edu.br/pave/                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Passo a Passo: Como Subir uma Versão Nova

Quando você finalizar uma nova funcionalidade, corrigir um bug ou aprovar um **Pull Request (PR)** na branch `main`, siga estes 2 passos simples:

### Passo 1: Atualize o repositório local
Abra o terminal no diretório do projeto (`/home/labpi/pave-webapp`) e garanta que você está na `main` atualizada:

```bash
git checkout main
git pull origin main
```

### Passo 2: Execute o script de deploy
Rode o script de deploy automatizado:

```bash
./deploy.sh
```

---

## 3. O que o `./deploy.sh` faz automaticamente?

Ao rodar `./deploy.sh`, o script executa todas as etapas necessárias sem exigir nenhuma intervenção manual:

1. **Compilação do Frontend:** Executa `npm run build` para gerar a versão estática otimizada na pasta `dist/`.
2. **Sincronização do Frontend:** Limpa e copia a nova pasta `dist/` para o diretório de produção (`/home/labpi/pave-producao/front/`).
3. **Atualização da API:** Instala novas dependências Python (caso existam) e sincroniza o código da API para `/home/labpi/pave-producao/api/src/`.
4. **Recarregamento do PM2:** Recarrega os processos no PM2 de forma transparente (sem *downtime* perceptível para os usuários).

---

## 4. Comandos Úteis do PM2 (Monitoramento)

O **PM2** garante que os serviços continuem rodando 24/7 e os reinicia automaticamente caso o servidor da universidade seja reiniciado.

- **Ver status dos serviços:**
  ```bash
  pm2 list
  ```
- **Ver logs da API em tempo real:**
  ```bash
  pm2 logs pave-api
  ```
- **Ver logs do Frontend em tempo real:**
  ```bash
  pm2 logs pave-front
  ```
- **Reiniciar manualmente um serviço:**
  ```bash
  pm2 restart pave-api
  pm2 restart pave-front
  ```

---

## 5. Como Desenvolver no Dia a Dia

Para trabalhar em novas tarefas sem mexer no site no ar:

1. Trabalhe normalmente na pasta `/home/labpi/pave-webapp`.
2. Para testar localmente em modo desenvolvimento com hot-reload, rode:
   ```bash
   ./dev.sh
   ```
   *(Ele abrirá o painel em `http://localhost:5173` e a API em `http://localhost:8000`).*
3. Faça seus commits e abra PRs. 
4. Quando o PR for aceito na `main`, rode `./deploy.sh` conforme a Seção 2!
