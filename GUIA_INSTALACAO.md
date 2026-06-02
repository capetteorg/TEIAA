# 🚀 Guia de instalação — FinOSC Capette
## Passo a passo para subir o sistema no Windows

---

## PARTE 1 — Criar as contas gratuitas

### 1.1 GitHub
1. Acesse https://github.com e clique em **Sign up**
2. Use o e-mail do Google Workspace da Capette
3. Confirme o e-mail e faça login

### 1.2 Supabase (banco de dados)
1. Acesse https://supabase.com e clique em **Start your project**
2. Faça login com o GitHub (botão "Continue with GitHub")
3. Clique em **New project**
4. Preencha:
   - **Name:** capette-financeiro
   - **Database Password:** crie uma senha forte e anote
   - **Region:** South America (São Paulo)
5. Clique em **Create new project** e aguarde ~2 minutos

### 1.3 Configurar o banco de dados
1. No painel do Supabase, clique em **SQL Editor** (menu lateral)
2. Clique em **New query**
3. Abra o arquivo `supabase_schema.sql` deste pacote (use o Bloco de Notas)
4. Copie todo o conteúdo e cole no editor do Supabase
5. Clique em **Run** (botão verde)
6. Deve aparecer "Success" — o banco está pronto!

### 1.4 Pegar as chaves do Supabase
1. No menu lateral, clique em **Settings** → **API**
2. Copie o **Project URL** (ex: https://abcxyz.supabase.co)
3. Copie o **anon public** key (chave longa)
4. Guarde esses dois valores — vai precisar logo

---

## PARTE 2 — Instalar ferramentas no Windows

### 2.1 Instalar Node.js
1. Acesse https://nodejs.org
2. Baixe a versão **LTS** (botão verde)
3. Execute o instalador e clique em Next até finalizar
4. Abra o **Prompt de Comando** (Win+R → cmd → Enter)
5. Digite: `node --version` — deve aparecer algo como `v20.x.x`

### 2.2 Instalar Git
1. Acesse https://git-scm.com/download/win
2. Baixe e instale (pode deixar todas as opções padrão)

---

## PARTE 3 — Configurar e rodar o projeto

### 3.1 Criar o arquivo .env
1. Dentro da pasta `capette-financeiro`, copie o arquivo `.env.example`
2. Renomeie a cópia para `.env`
3. Abra com o Bloco de Notas e preencha:
```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_AQUI
```
4. Salve o arquivo

### 3.2 Instalar dependências
1. Abra o **Prompt de Comando**
2. Navegue até a pasta do projeto:
```
cd C:\caminho\para\capette-financeiro
```
3. Digite:
```
npm install
```
4. Aguarde baixar tudo (pode demorar alguns minutos)

### 3.3 Testar localmente
```
npm run dev
```
Abra http://localhost:5173 no navegador — o sistema deve aparecer!

---

## PARTE 4 — Criar o primeiro usuário admin

1. No Supabase, vá em **Authentication** → **Users**
2. Clique em **Add user** → **Create new user**
3. Preencha o e-mail e senha do administrador
4. Copie o **UUID** do usuário criado
5. Vá em **SQL Editor** e execute:
```sql
INSERT INTO usuarios (id, nome, email, perfil)
VALUES ('COLE_O_UUID_AQUI', 'Seu Nome', 'seu@capette.org', 'admin');
```

---

## PARTE 5 — Publicar na internet (Vercel)

### 5.1 Subir o código no GitHub
1. Acesse https://github.com/new
2. Crie um repositório chamado `capette-financeiro` (privado)
3. No Prompt de Comando, dentro da pasta do projeto:
```
git init
git add .
git commit -m "Sistema financeiro Capette"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/capette-financeiro.git
git push -u origin main
```

### 5.2 Publicar na Vercel
1. Acesse https://vercel.com e clique em **Sign Up with GitHub**
2. Clique em **Add New Project**
3. Selecione o repositório `capette-financeiro`
4. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua chave anon
5. Clique em **Deploy**
6. Aguarde ~1 minuto — o sistema estará online!

### 5.3 Configurar o domínio capette.org
1. Na Vercel, vá em **Settings** → **Domains**
2. Adicione `financeiro.capette.org`
3. No painel onde você gerencia o domínio capette.org, adicione um registro DNS:
   - **Tipo:** CNAME
   - **Nome:** financeiro
   - **Valor:** cname.vercel-dns.com
4. Aguarde até 24h para propagar

---

## PARTE 6 — Página pública de transparência

A página pública fica em:
`https://financeiro.capette.org/transparencia`

Você pode linkar esta URL no site da Capette.

---

## Resumo dos URLs

| O que | URL |
|-------|-----|
| Sistema interno | https://financeiro.capette.org |
| Login | https://financeiro.capette.org/login |
| Transparência (público) | https://financeiro.capette.org/transparencia |

---

## Precisa de ajuda?

Se travar em algum passo, entre em contato ou abra uma conversa com o Claude
descrevendo exatamente em qual passo parou e qual mensagem de erro apareceu.
