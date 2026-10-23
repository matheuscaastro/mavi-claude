# MAVI Podologia — sistema de gestão

Agenda com cards dinâmicos, cadastros (clientes, funcionários, serviços) e configurações do salão.
Próximas fases: página pública de agendamento, fluxo de caixa e WhatsApp (API oficial).

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

## Comandos

- `npm test` — testes das regras de horário livre
- `npm run typecheck` · `npm run build`
- `npm run db:generate` — gera migração a partir de `db/schema.ts`

## Perfis de acesso

| | Administradora | Recepção | Profissional |
| --- | :-: | :-: | :-: |
| Agenda de todas | ✔ | ✔ | só a própria |
| Agendar / remarcar / cancelar | ✔ | ✔ | — |
| Iniciar / concluir o próprio atendimento | ✔ | ✔ | ✔ |
| Clientes | editar | editar | ver |
| Serviços | editar | ver | ver |
| Funcionários e configurações | ✔ | — | — |

## Regras importantes

- Fuso fixo America/Sao_Paulo; valores em centavos.
- Serviço do atendimento é gravado com nome, duração e preço no momento do agendamento.
- Telefone da cliente é único (só dígitos) — é como ela será reconhecida na página pública.
- Horário do salão é editável em Configurações; a jornada da profissional segue o salão por padrão.
