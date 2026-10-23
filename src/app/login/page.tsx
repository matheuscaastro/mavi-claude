import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/agenda");

  return (
    <div className="login">
      <section className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="MAVI Podologia" />
        <p>Cuidado com cada passo, organização em cada horário.</p>
      </section>
      <section className="panel">
        <LoginForm />
      </section>
    </div>
  );
}
