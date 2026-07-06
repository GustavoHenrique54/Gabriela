# Guia de Configuração: Criando o Token do GitHub (PAT)

Para que o editor visual possa salvar as alterações diretamente no seu repositório do GitHub (e atualizar seu site na Vercel), você precisa gerar um **Token de Acesso Pessoal (PAT)**. Siga o passo a passo abaixo:

---

### Passo 1: Acessar as Configurações de Desenvolvedor no GitHub
1. Faça login na sua conta do [GitHub](https://github.com).
2. No canto superior direito, clique na sua **foto de perfil** e selecione **Settings** (Configurações).
3. Na barra lateral esquerda, role até o final e clique em **<> Developer settings** (Configurações de desenvolvedor).

---

### Passo 2: Gerar o Token (Classic)
1. Na barra lateral esquerda, clique em **Personal access tokens** e selecione **Tokens (classic)**.
2. Clique no botão azul **Generate new token** no canto direito e selecione **Generate new token (classic)**.
3. Se solicitado, confirme a senha da sua conta do GitHub.

---

### Passo 3: Configurar as Permissões
1. **Note** (Nota): Digite um nome para lembrar para que serve o token (ex: `editor-site-gabriela`).
2. **Expiration** (Expiração): Escolha o prazo de validade do token (recomendado: `90 days` ou `No expiration` para não expirar).
3. **Select scopes** (Selecionar escopos): Marque apenas a caixinha **[x] repo** (isto dá permissão para o editor ler e escrever arquivos no seu repositório).
4. Role até o final da página e clique no botão verde **Generate token** (Gerar token).

---

### Passo 4: Salvar e Configurar no Site
1. **IMPORTANTE**: O GitHub exibirá o token gerado (uma sequência de letras e números começando com `ghp_`). 
2. **Copie o token imediatamente** e salve em um local seguro (ele não será exibido novamente se você recarregar a página!).
3. No painel do seu editor visual (no site local), abra a aba de personalização e insira:
   - Seu **Usuário do GitHub**
   - O **Nome do Repositório** (que você criará para o site)
   - O **Token (PAT)** que acabou de copiar.

---

*Nota: Esse token fica gravado localmente apenas no seu próprio navegador e nunca é enviado para servidores de terceiros. É totalmente seguro.*
