import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  customType,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Perfis de acesso (seção 3 do PRD). */
export const accessRole = pgEnum("access_role", ["admin", "reception", "professional"]);

/** Ciclo de vida do card da agenda (seção 5 do PRD). */
export const appointmentStatus = pgEnum("appointment_status", [
  "scheduled", // Agendado
  "confirmed", // Confirmado
  "in_progress", // Em atendimento
  "completed", // Concluído
  "cancelled", // Cancelado
  "no_show", // Faltou
]);

export const paymentMethod = pgEnum("payment_method", ["cash", "pix", "debit", "credit", "barter", "other"]);
export const cashKind = pgEnum("cash_kind", ["income", "expense"]);

export const appointmentOrigin = pgEnum("appointment_origin", ["counter", "online"]);

/** Funcionários. Também são as contas de acesso ao sistema (e-mail + senha). */
export const employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    jobTitle: text("job_title").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    accessRole: accessRole("access_role").notNull().default("professional"),
    /** Aparece na agenda e pode ser escolhida pelas clientes. */
    performsServices: boolean("performs_services").notNull().default(true),
    color: text("color").notNull().default("#3D6B62"),
    /** Comissão sobre os atendimentos concluídos, em % (0 = sem comissão). */
    commissionPercent: integer("commission_percent").notNull().default(0),
    active: boolean("active").notNull().default(true),
    /** Quando a foto foi trocada pela última vez; vazio = sem foto (a agenda mostra as iniciais). Serve também para renovar o cache. */
    photoUpdatedAt: timestamp("photo_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("employees_email_key").on(t.email), check("employees_commission_range", sql`${t.commissionPercent} between 0 and 100`)],
);

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/** Foto da funcionária. Fica no banco (o disco do Render é descartado a cada deploy), já reduzida e em WebP, numa tabela própria para as consultas comuns não carregarem os bytes. */
export const employeePhotos = pgTable("employee_photos", {
  employeeId: integer("employee_id")
    .primaryKey()
    .references(() => employees.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  contentType: text("content_type").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Jornada própria de uma funcionária. Sem linhas, vale o horário do salão. */
export const employeeHours = pgTable(
  "employee_hours",
  {
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(), // 0 = domingo ... 6 = sábado
    startTime: text("start_time").notNull(), // HH:MM
    endTime: text("end_time").notNull(),
  },
  (t) => [primaryKey({ columns: [t.employeeId, t.weekday] })],
);

/** Categorias dos serviços. Todo serviço pertence a uma categoria existente. */
export const serviceCategories = pgTable(
  "service_categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("service_categories_name_key").on(sql`lower(${t.name})`)],
);

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  categoryId: integer("category_id")
    .notNull()
    .references(() => serviceCategories.id),
  durationMin: integer("duration_min").notNull(),
  priceCents: integer("price_cents").notNull(),
  /** Intervalo de preparo depois do serviço (não aparece para a cliente). */
  bufferMin: integer("buffer_min").notNull().default(0),
  publicVisible: boolean("public_visible").notNull().default(true),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employeeServices = pgTable(
  "employee_services",
  {
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.employeeId, t.serviceId] })],
);

export const clients = pgTable(
  "clients",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    /** Só dígitos, com DDD. Único: é como reconhecemos a cliente na página pública. */
    phone: text("phone").notNull(),
    email: text("email").notNull().default(""),
    birthDate: date("birth_date"),
    cpf: text("cpf").notNull().default(""),
    notes: text("notes").notNull().default(""),
    origin: appointmentOrigin("origin").notNull().default("counter"),
    /** Consentimento para mensagens de WhatsApp (fase 2). */
    whatsappOptIn: boolean("whatsapp_opt_in").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("clients_phone_key").on(t.phone)],
);

export const appointments = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: appointmentStatus("status").notNull().default("scheduled"),
    origin: appointmentOrigin("origin").notNull().default("counter"),
    totalCents: integer("total_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    notes: text("notes").notNull().default(""),
    createdBy: integer("created_by").references(() => employees.id),
    /** Código secreto do link "meu agendamento" enviado à cliente (agendamentos online). */
    publicToken: text("public_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("appointments_public_token_key").on(t.publicToken),
    index("appointments_start_idx").on(t.startsAt),
    index("appointments_employee_idx").on(t.employeeId, t.startsAt),
    index("appointments_client_idx").on(t.clientId),
  ],
);

/** Nome, duração e preço ficam gravados aqui: mudar o serviço não muda o histórico. */
export const appointmentItems = pgTable("appointment_items", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id")
    .notNull()
    .references(() => appointments.id, { onDelete: "cascade" }),
  serviceId: integer("service_id")
    .notNull()
    .references(() => services.id),
  serviceName: text("service_name").notNull(),
  durationMin: integer("duration_min").notNull(),
  priceCents: integer("price_cents").notNull(),
});

/** Almoço, folga, férias etc. de uma funcionária. */
export const scheduleBlocks = pgTable(
  "schedule_blocks",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason").notNull().default(""),
  },
  (t) => [index("schedule_blocks_employee_idx").on(t.employeeId, t.startsAt)],
);

/** Horário de funcionamento do salão, por dia da semana (editável pela Administradora). */
export const salonHours = pgTable("salon_hours", {
  weekday: integer("weekday").primaryKey(), // 0 = domingo ... 6 = sábado
  isOpen: boolean("is_open").notNull().default(true),
  openTime: text("open_time").notNull().default("08:00"),
  closeTime: text("close_time").notNull().default("18:00"),
});

/** Feriados e exceções: fechado o dia todo ou com horário especial. */
export const salonExceptions = pgTable("salon_exceptions", {
  date: date("date").primaryKey(),
  label: text("label").notNull().default(""),
  closed: boolean("closed").notNull().default(true),
  openTime: text("open_time"),
  closeTime: text("close_time"),
});

/** Linha única (id = 1) com as regras gerais. */
export const salonSettings = pgTable("salon_settings", {
  id: integer("id").primaryKey().default(1),
  minNoticeHours: integer("min_notice_hours").notNull().default(2),
  maxDaysAhead: integer("max_days_ahead").notNull().default(60),
  cancelDeadlineHours: integer("cancel_deadline_hours").notNull().default(24),
  slotStepMin: integer("slot_step_min").notNull().default(15),
  allowAnyProfessional: boolean("allow_any_professional").notNull().default(true),
  /** WhatsApp (fase 2). Desligado por padrão: só envia depois que a administradora liga. */
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
  salonName: text("salon_name").notNull().default("MAVI"),
  confirmationEnabled: boolean("confirmation_enabled").notNull().default(true),
  reminderEnabled: boolean("reminder_enabled").notNull().default(true),
  reminderHoursBefore: integer("reminder_hours_before").notNull().default(24),
  birthdayEnabled: boolean("birthday_enabled").notNull().default(true),
  /** Hora do dia (0-23, horário do salão) em que a mensagem de aniversário pode sair. */
  birthdayHour: integer("birthday_hour").notNull().default(9),
  confirmationText: text("confirmation_text").notNull().default(""),
  reminderText: text("reminder_text").notNull().default(""),
  birthdayText: text("birthday_text").notNull().default(""),
});

/** Histórico de alterações dos cards (quem criou, moveu ou cancelou, e quando). */
export const appointmentEvents = pgTable(
  "appointment_events",
  {
    id: serial("id").primaryKey(),
    appointmentId: integer("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    employeeId: integer("employee_id").references(() => employees.id),
    action: text("action").notNull(),
    details: jsonb("details").notNull().default({}),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("appointment_events_appt_idx").on(t.appointmentId)],
);

/** Avisos para a equipe (novo agendamento online, cancelamento e remarcação feitos pela cliente). */
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    /** Para onde o aviso leva (ex.: /agenda/12). */
    href: text("href").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("notifications_created_idx").on(t.createdAt)],
);

/** Pessoas esperando uma vaga (balcão ou página pública). Quando um horário cancela e encaixa, a equipe é avisada. */
export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    /** Só dígitos, com DDD. */
    phone: text("phone").notNull(),
    serviceIds: integer("service_ids").array().notNull().default(sql`'{}'::integer[]`),
    /** Nomes dos serviços e duração total no momento do pedido (o histórico não muda se o catálogo mudar). */
    serviceNames: text("service_names").notNull().default(""),
    durationMin: integer("duration_min").notNull().default(30),
    /** Profissional preferida; vazio = qualquer uma. */
    employeeId: integer("employee_id").references(() => employees.id, { onDelete: "set null" }),
    wantedFrom: date("wanted_from").notNull(),
    wantedTo: date("wanted_to").notNull(),
    /** any = o dia todo, morning = antes das 12h, afternoon = a partir das 12h. */
    period: text("period").notNull().default("any"),
    note: text("note").notNull().default(""),
    /** waiting = esperando, contacted = já avisada, booked = agendou, removed = saiu da lista. */
    status: text("status").notNull().default("waiting"),
    origin: appointmentOrigin("origin").notNull().default("counter"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    contactedAt: timestamp("contacted_at", { withTimezone: true }),
  },
  (t) => [
    check("waitlist_period_valid", sql`${t.period} in ('any', 'morning', 'afternoon')`),
    check("waitlist_status_valid", sql`${t.status} in ('waiting', 'contacted', 'booked', 'removed')`),
    check("waitlist_range_valid", sql`${t.wantedFrom} <= ${t.wantedTo}`),
    index("waitlist_status_idx").on(t.status, t.wantedFrom),
  ],
);

/** Abertura e fechamento do caixa: troco inicial, dinheiro contado no fim e a diferença. Só uma sessão pode ficar aberta. */
export const cashSessions = pgTable(
  "cash_sessions",
  {
    id: serial("id").primaryKey(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    openedBy: integer("opened_by").references(() => employees.id),
    openingCents: integer("opening_cents").notNull().default(0),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: integer("closed_by").references(() => employees.id),
    /** Dinheiro que deveria estar na gaveta ao fechar (troco + entradas em dinheiro − saídas em dinheiro). */
    expectedCents: integer("expected_cents"),
    /** Dinheiro contado na gaveta ao fechar. */
    countedCents: integer("counted_cents"),
    note: text("note").notNull().default(""),
  },
  (t) => [
    check("cash_sessions_opening_nonneg", sql`${t.openingCents} >= 0`),
    uniqueIndex("cash_sessions_one_open").on(sql`(true)`).where(sql`${t.closedAt} is null`),
  ],
);

/** Categorias dos lançamentos avulsos do caixa, separadas por tipo. O lançamento guarda o nome (texto), então excluir uma categoria não mexe no histórico. */
export const cashCategories = pgTable(
  "cash_categories",
  {
    id: serial("id").primaryKey(),
    kind: cashKind("kind").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("cash_categories_kind_name_key").on(t.kind, sql`lower(${t.name})`)],
);

/** Lançamentos do caixa. Pagamento de atendimento tem appointmentId; o resto é receita/despesa avulsa. */
export const cashEntries = pgTable(
  "cash_entries",
  {
    id: serial("id").primaryKey(),
    kind: cashKind("kind").notNull(),
    method: paymentMethod("method").notNull(),
    amountCents: integer("amount_cents").notNull(),
    category: text("category").notNull().default(""),
    description: text("description").notNull().default(""),
    /** Dia do lançamento no fuso do salão (YYYY-MM-DD). */
    occurredOn: date("occurred_on").notNull(),
    appointmentId: integer("appointment_id").references(() => appointments.id),
    createdBy: integer("created_by").references(() => employees.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** Em vez de apagar, o lançamento é estornado e some dos totais. */
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: integer("voided_by").references(() => employees.id),
  },
  (t) => [
    check("cash_entries_amount_positive", sql`${t.amountCents} > 0`),
    index("cash_entries_day_idx").on(t.occurredOn),
    index("cash_entries_appt_idx").on(t.appointmentId),
  ],
);

export const messageKind = pgEnum("message_kind", ["confirmation", "reminder", "birthday"]);
export const messageStatus = pgEnum("message_status", ["pending", "sent", "failed", "skipped"]);

/** Fila e histórico de mensagens de WhatsApp. `dedupeKey` impede enviar a mesma mensagem duas vezes. */
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    kind: messageKind("kind").notNull(),
    status: messageStatus("status").notNull().default("pending"),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    appointmentId: integer("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    /** Número completo com o 55 do país, só dígitos. */
    toPhone: text("to_phone").notNull(),
    body: text("body").notNull(),
    /** Variáveis na ordem usada pelos modelos aprovados no provedor. */
    vars: jsonb("vars").notNull().default([]),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    provider: text("provider").notNull().default(""),
    providerMessageId: text("provider_message_id").notNull().default(""),
    error: text("error").notNull().default(""),
    attempts: integer("attempts").notNull().default(0),
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("messages_dedupe_key").on(t.dedupeKey),
    index("messages_queue_idx").on(t.status, t.scheduledFor),
    index("messages_appt_idx").on(t.appointmentId),
  ],
);

export type Message = typeof messages.$inferSelect;
export const photoKind = pgEnum("client_photo_kind", ["before", "after"]);

/**
 * Fotos de antes e depois da cliente. Ficam no banco (o disco do Render é descartado a cada deploy), já reduzidas
 * (até 1280 px, WebP), numa tabela própria para as consultas comuns da ficha não carregarem os bytes.
 */
export const clientPhotos = pgTable(
  "client_photos",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    kind: photoKind("kind").notNull(),
    /** Dia em que a foto foi tirada (AAAA-MM-DD). */
    takenOn: date("taken_on").notNull(),
    /** Área ou tratamento (ex.: "axilas, sessão 3"). */
    note: text("note").notNull().default(""),
    data: bytea("data").notNull(),
    contentType: text("content_type").notNull(),
    createdBy: integer("created_by").references(() => employees.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("client_photos_client_idx").on(t.clientId, t.takenOn)],
);


export type CashEntry = typeof cashEntries.$inferSelect;
export type CashSession = typeof cashSessions.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type AppointmentStatus = (typeof appointmentStatus.enumValues)[number];
export type AccessRole = (typeof accessRole.enumValues)[number];
