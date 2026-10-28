# MAVI Podologia — sistema de gestão

Agenda com cards dinâmicos, cadastros (clientes, funcionários, serviços), configurações do salão, **fluxo de caixa** e **página pública de agendamento** (`/agendar`).
Próxima fase: WhatsApp (API oficial) e ficha clínica.

## Stack

Next.js 15 (App Router, server actions) · TypeScript · PostgreSQL 16 · Drizzle ORM · autenticação própria (JWT em cookie httpOnly + bcrypt).

> O PRD citava Prisma; a implementação usa **Drizzle** (mesmo papel, migrações em SQL versionadas).
> A trava contra dois atendimentos no mesmo horário é feita **no banco** (constraint `EXCLUDE` com `btree_gist`), então vale mesmo com agendamentos simultâneos.

## Rodando localmente

```bash
cp .env.example .env        # ajuste DATABASE_URL e SESSION_SECRET
npm install
npm run db:migrate          # cria tabelas e constraints
npm run db:seed             # dados de exemplo (opcional, só desenvolvimento)
npm run dev                 # http://localhost:3000
```

`SESSION_SECRET`: gere com `openssl rand -base64 48`.

### Usuários de exemplo (seed)

| E-mail | Perfil |
| --- | --- |
| admin@mavi.local | Administradora |
| recepcao@mavi.local | Recepção |
| ana@mavi.local, beatriz@mavi.local, carla@mavi.local | Profissionais |

Senha de todos: valor de `SEED_PASSWORD` (padrão `mavi1234`). **Troque as senhas antes de colocar em produção** e não rode o seed em produção.

## Página pública (`/agendar`)

Aberta, sem login. A cliente escolhe um ou mais serviços, profissional (ou "qualquer disponível"), dia e horário, e informa nome e WhatsApp.
Ela recebe um link secreto (`/agendar/meu/<código>`) para cancelar ou remarcar até o prazo configurado (padrão 24 h antes).
Proteções: limite de tentativas por IP, campo-isca contra robôs, no máximo 3 agendamentos online em aberto por cliente, horário conferido de novo no servidor e travado no banco.
Só aparecem serviços marcados como "disponível para agendamento online" e feitos por alguma profissional ativa.

## Caixa

- Recepção e Administradora registram o pagamento dentro do atendimento (total ou parcial; Dinheiro, Pix, Débito, Crédito).
- A Administradora vê a tela **Caixa**: entradas, saídas e saldo por dia/semana/mês ou período livre, lança despesas e receitas avulsas e estorna lançamentos (nada é apagado).

## Colocar no ar

Veja [DEPLOY.md](DEPLOY.md) (Railway + domínio).

## Comandos

- `npm test` — testes das regras de horário livre
- `npm run typecheck` · `npm run build`
- `npm run db:create-admin` — cria/redefine a administradora (uso em produção; veja DEPLOY.md)
- `npm run db:generate` — gera migração a partir de `db/schema.ts`

## Perfis de acesso

| | Administradora | Recepção | Profissional |
| --- | :-: | :-: | :-: |
| Agenda de todas | ✔ | ✔ | só a própria |
| Agendar / remarcar / cancelar | ✔ | ✔ | — |
| Iniciar / concluir o próprio atendimento | ✔ | ✔ | ✔ |
| Registrar pagamento do atendimento | ✔ | ✔ | — |
| Tela Caixa (totais, despesas, estorno) | ✔ | — | — |
| Clientes | editar | editar | ver |
| Serviços | editar | ver | ver |
| Funcionários e configurações | ✔ | — | — |

## Regras importantes

- Fuso fixo America/Sao_Paulo; valores em centavos.
- Serviço do atendimento é gravado com nome, duração e preço no momento do agendamento.
- Telefone da cliente é único (só dígitos) — é como ela será reconhecida na página pública.
- Horário do salão é editável em Configurações; a jornada da profissional segue o salão por padrão.

## WhatsApp (fase 2)

Confirmação ao agendar/remarcar, lembrete antes do atendimento e mensagem de aniversário.

- **Liga/desliga e textos**: Configurações → Mensagens de WhatsApp. Vem desligado.
- **Quem recebe**: só clientes com a autorização marcada (cadastro ou página pública).
- **Histórico e fila**: menu Mensagens (botão “Processar fila agora”).
- **Provedor** (`WHATSAPP_PROVIDER`): `log` (padrão, só registra) ou `twilio`
  (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`).
  Para falar fora da janela de 24h o WhatsApp exige modelos aprovados: informe
  `TWILIO_CONTENT_SID_CONFIRMATION/_REMINDER/_BIRTHDAY`. Variáveis dos modelos, em ordem:
  confirmação e lembrete → `{{1}}` nome, `{{2}}` serviços, `{{3}}` data, `{{4}}` hora, `{{5}}` profissional, `{{6}}` link;
  aniversário → `{{1}}` nome.
- **Agendador**: a confirmação sai na hora; lembretes e aniversários dependem de alguém chamar
  `GET /api/cron/messages` com `Authorization: Bearer $CRON_SECRET` a cada 5–15 min
  (um Cron Job do Render, cron-job.org etc.). `CRON_SECRET` precisa de 16+ caracteres.
- Lembretes e aniversários só saem entre 8h e 20h (horário do salão). Remarcar ou cancelar descarta o lembrete antigo.
- `APP_URL` define o endereço usado no link de remarcar/cancelar (no Render, `RENDER_EXTERNAL_URL` é usado se faltar).

## Categorias de serviço

Todo serviço pertence a uma categoria cadastrada. Administradora e recepção cadastram, renomeiam e excluem
categorias (só as sem serviços) pelo botão **Categorias** da tela de serviços. Serviços novos escolhem a categoria em uma lista.
A migração 0005/0006 transformou as categorias em texto dos serviços existentes em categorias cadastradas.
