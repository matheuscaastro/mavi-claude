import "dotenv/config";
import bcrypt from "bcryptjs";
import { count } from "drizzle-orm";
import { db, pool, schema } from "./index";
import { localDateTime, todayLocal } from "../src/lib/time";

/**
 * Dados de partida. Tudo aqui é exemplo e pode ser editado pelo próprio sistema:
 * horário de funcionamento, serviços, preços e equipe.
 * Roda só se o banco ainda estiver vazio.
 */
async function main() {
  const [{ value: existing }] = await db.select({ value: count() }).from(schema.employees);
  if (existing > 0) {
    console.log("O banco já tem dados; nada foi alterado.");
    await pool.end();
    return;
  }

  const password = process.env.SEED_PASSWORD ?? "mavi1234";
  const passwordHash = await bcrypt.hash(password, 10);

  // Horário de funcionamento (exemplo): seg-sex 08-18, sáb 08-14, domingo fechado.
  await db.insert(schema.salonHours).values([
    { weekday: 0, isOpen: false, openTime: "08:00", closeTime: "14:00" },
    ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, isOpen: true, openTime: "08:00", closeTime: "18:00" })),
    { weekday: 6, isOpen: true, openTime: "08:00", closeTime: "14:00" },
  ]);
  await db.insert(schema.salonSettings).values({ id: 1 });

  const staff = await db
    .insert(schema.employees)
    .values([
      { name: "Administradora", jobTitle: "Proprietária", email: "admin@mavi.local", phone: "", passwordHash, accessRole: "admin", performsServices: false, color: "#5F6F6B" },
      { name: "Daniela", jobTitle: "Recepção", email: "recepcao@mavi.local", phone: "", passwordHash, accessRole: "reception", performsServices: false, color: "#8A5A83" },
      { name: "Ana", jobTitle: "Podóloga", email: "ana@mavi.local", phone: "", passwordHash, accessRole: "professional", performsServices: true, color: "#3D6B62" },
      { name: "Beatriz", jobTitle: "Podóloga", email: "beatriz@mavi.local", phone: "", passwordHash, accessRole: "professional", performsServices: true, color: "#B07A4B" },
      { name: "Carla", jobTitle: "Podóloga", email: "carla@mavi.local", phone: "", passwordHash, accessRole: "professional", performsServices: true, color: "#5B6FA6" },
    ])
    .returning();
  const byName = Object.fromEntries(staff.map((e) => [e.name, e]));

  const svcRows = await db
    .insert(schema.services)
    .values([
      { name: "Podologia clínica", description: "Avaliação e cuidado completo dos pés.", category: "Podologia", durationMin: 60, priceCents: 12000, bufferMin: 10 },
      { name: "Pedicure terapêutica", description: "Unhas, cutículas e pele com técnica terapêutica.", category: "Podologia", durationMin: 45, priceCents: 9000, bufferMin: 10 },
      { name: "Unha encravada", description: "Tratamento da unha encravada.", category: "Podologia", durationMin: 45, priceCents: 15000, bufferMin: 10 },
      { name: "Tratamento fúngico", description: "Cuidado das unhas com micose.", category: "Podologia", durationMin: 45, priceCents: 14000, bufferMin: 10 },
      { name: "Remoção de verruga plantar", description: "Remoção de verruga na sola do pé.", category: "Podologia", durationMin: 40, priceCents: 13000, bufferMin: 10 },
      { name: "Hidratação profunda", description: "Hidratação intensiva para pele ressecada.", category: "Estética dos pés", durationMin: 30, priceCents: 6000, bufferMin: 5 },
      { name: "Reflexologia podal", description: "Massagem relaxante nos pés.", category: "Bem-estar", durationMin: 60, priceCents: 11000, bufferMin: 5 },
    ])
    .returning();
  const svc = Object.fromEntries(svcRows.map((s) => [s.name, s]));

  const can: Record<string, string[]> = {
    Ana: ["Podologia clínica", "Pedicure terapêutica", "Unha encravada", "Tratamento fúngico", "Hidratação profunda", "Reflexologia podal"],
    Beatriz: ["Podologia clínica", "Pedicure terapêutica", "Remoção de verruga plantar", "Hidratação profunda"],
    Carla: ["Podologia clínica", "Pedicure terapêutica", "Unha encravada", "Tratamento fúngico", "Hidratação profunda"],
  };
  await db.insert(schema.employeeServices).values(
    Object.entries(can).flatMap(([who, names]) => names.map((n) => ({ employeeId: byName[who].id, serviceId: svc[n].id }))),
  );

  const clientRows = await db
    .insert(schema.clients)
    .values([
      { name: "Maria Souza", phone: "61900000001", birthDate: "1971-03-14" },
      { name: "Joana Lima", phone: "61900000002", birthDate: "1980-11-02", origin: "online" },
      { name: "Patrícia Alves", phone: "61900000003", birthDate: "1988-06-28", origin: "online" },
      { name: "Lúcia Ferraz", phone: "61900000004", birthDate: "1965-01-19" },
      { name: "Rosa Menezes", phone: "61900000005", birthDate: "1958-12-07" },
      { name: "Sandra Pires", phone: "61900000006", birthDate: "1975-08-30", origin: "online" },
      { name: "Helena Costa", phone: "61900000007" },
      { name: "Marta Dias", phone: "61900000008" },
    ])
    .returning();
  const client = Object.fromEntries(clientRows.map((c) => [c.name, c]));

  // Agenda de exemplo para hoje, só se hoje for um dia de funcionamento.
  const today = todayLocal();
  const demo: [string, string, string, string, string[], (typeof schema.appointmentStatus.enumValues)[number], "counter" | "online"][] = [
    ["Ana", "08:30", "09:30", "Maria Souza", ["Podologia clínica"], "completed", "counter"],
    ["Ana", "10:00", "11:15", "Joana Lima", ["Unha encravada", "Hidratação profunda"], "in_progress", "online"],
    ["Ana", "11:30", "12:15", "Patrícia Alves", ["Pedicure terapêutica"], "scheduled", "online"],
    ["Ana", "14:30", "15:30", "Lúcia Ferraz", ["Podologia clínica"], "scheduled", "counter"],
    ["Beatriz", "08:00", "08:45", "Helena Costa", ["Pedicure terapêutica"], "completed", "counter"],
    ["Beatriz", "09:00", "10:30", "Sandra Pires", ["Remoção de verruga plantar", "Podologia clínica"], "confirmed", "online"],
    ["Carla", "09:00", "10:00", "Marta Dias", ["Podologia clínica"], "completed", "counter"],
    ["Carla", "14:00", "15:30", "Rosa Menezes", ["Tratamento fúngico", "Pedicure terapêutica"], "confirmed", "counter"],
  ];
  const { weekdayOf } = await import("../src/lib/time");
  if (weekdayOf(today) !== 0) {
    for (const [who, from, to, who2, names, status, origin] of demo) {
      const items = names.map((n) => svc[n]);
      const total = items.reduce((a, s) => a + s.priceCents, 0);
      const [appt] = await db
        .insert(schema.appointments)
        .values({
          clientId: client[who2].id,
          employeeId: byName[who].id,
          startsAt: localDateTime(today, from),
          endsAt: localDateTime(today, to),
          status,
          origin,
          totalCents: total,
          createdBy: byName["Daniela"].id,
        })
        .returning();
      await db.insert(schema.appointmentItems).values(
        items.map((s) => ({ appointmentId: appt.id, serviceId: s.id, serviceName: s.name, durationMin: s.durationMin, priceCents: s.priceCents })),
      );
    }
    for (const who of ["Ana", "Beatriz", "Carla"]) {
      await db.insert(schema.scheduleBlocks).values({
        employeeId: byName[who].id,
        startsAt: localDateTime(today, "13:00"),
        endsAt: localDateTime(today, "14:00"),
        reason: "Almoço",
      });
    }
  }

  console.log("Dados de exemplo criados.");
  console.log(`Entre com admin@mavi.local, recepcao@mavi.local ou ana@mavi.local (senha: ${password}).`);
  console.log("Troque as senhas e os e-mails antes de usar de verdade.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
