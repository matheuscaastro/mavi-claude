# Colocando o sistema no ar (Railway + domínio)

Resumo: o **Railway** roda o sistema e o banco; o **domínio** (HostGator ou outro) só aponta para o Railway.
Custos (Railway cobra por uso, confira o preço atual) e o domínio (anual) são cobrados à parte.

## 1. Domínio
Compre o domínio onde preferir. Para este sistema, use um **subdomínio** como `agenda.seudominio.com.br`
(é o caminho mais simples no painel do HostGator, que não aceita apontar o domínio "puro" para o Railway).

## 2. Railway
1. Crie a conta em railway.com (pode entrar com o GitHub).
2. **New Project → Deploy from GitHub repo** → escolha `mavi-claude` (autorize o acesso ao repositório).
3. No mesmo projeto: **+ New → Database → Add PostgreSQL**.
4. Abra o serviço do sistema → **Variables** e crie:

   | Variável | Valor |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referência ao banco; ajuste o nome se o serviço do banco tiver outro) |
   | `SESSION_SECRET` | texto aleatório com 48+ caracteres (gere com `openssl rand -base64 48` ou um gerador de senhas) |
   | `ADMIN_NAME` | nome da administradora |
   | `ADMIN_EMAIL` | e-mail de login dela |
   | `ADMIN_PASSWORD` | senha com 10+ caracteres (não use a de exemplo) |

5. O Railway lê o `railway.json` do repositório: instala, compila, cria as tabelas, cria a primeira administradora
   (só se ainda não existir nenhuma) e sobe o sistema. Acompanhe em **Deployments**.
6. Quando o deploy ficar verde, **apague a variável `ADMIN_PASSWORD`** (a conta já foi criada).
7. Em **Settings → Networking → Generate Domain** o Railway dá um endereço provisório (`algo.up.railway.app`).
   Entre nele para conferir: `/login` e `/agendar`.

## 3. Ligar o domínio
1. Railway: **Settings → Networking → Custom Domain** → digite `agenda.seudominio.com.br`. Ele mostra um valor de **CNAME**.
2. HostGator (painel → Domínios → Gerenciar → Zona DNS): adicione um registro **CNAME**, nome `agenda`, destino = o valor do Railway.
3. Aguarde a propagação (minutos a algumas horas). O Railway emite o HTTPS sozinho.

## 4. Primeiros passos no sistema
1. Entre com a conta da administradora.
2. **Configurações**: confira horário de funcionamento e regras.
3. **Serviços** e **Funcionários**: cadastre de verdade (cada funcionária com e-mail e senha próprios; marque os serviços que realiza).
4. Teste a página pública `https://agenda.seudominio.com.br/agendar` com um agendamento seu e cancele em seguida.
5. **Não rode `db:seed` em produção** (ele cria usuárias e clientes de exemplo).

## 5. Cuidados
- **Backup**: no Railway, ative backups do banco (aba do serviço Postgres) ou agende um `pg_dump`. Os dados do salão ficam só lá.
- Para redefinir a senha da administradora: rode `ADMIN_NAME=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:create-admin` com `DATABASE_URL` apontando para o banco de produção (por exemplo com `railway run`).
- Atualizações: cada `git push` na `main` faz um novo deploy; as migrações rodam sozinhas.
- Saúde do sistema: `/api/health` responde `{"ok":true}` quando o sistema e o banco estão no ar.
