import { NextResponse } from "next/server";
import JobberClient from "@/lib/jobber";

export async function GET() {
  try {
    const client = new JobberClient();
    const clients = await client.getClients();

    const formatted = clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.emails?.[0]?.address ?? null,
      phone: c.phones?.[0]?.number ?? null,
    }));

    return NextResponse.json({ clients: formatted });
  } catch (error) {
    console.error("Error trayendo clientes de Jobber:", error);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}