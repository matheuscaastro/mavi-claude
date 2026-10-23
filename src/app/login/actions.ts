"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { login, logout } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

export type LoginState = { error?: string; email?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", email };

  const result = await login(parsed.data.email, parsed.data.password, formData.get("remember") === "on");
  if (!result.ok) return { error: result.error, email };
  redirect("/agenda");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
