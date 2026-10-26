import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken, verifyCredentials } from "@/lib/auth";
import { kvDelete, kvGet, kvIncr, kvTtl } from "@/lib/kv";

// Límite de intentos fallidos, guardado en Upstash: por IP, y uno general
// por si alguien prueba desde muchas IPs a la vez.
const LOCK_SECONDS = 15 * 60;
const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_TOTAL = 30;

function clientIp(request) {
  return (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

async function lockedFor(keys, limits) {
  for (let i = 0; i < keys.length; i++) {
    const count = Number((await kvGet(keys[i])) || 0);
    if (count >= limits[i]) return Math.max(await kvTtl(keys[i]), 60);
  }
  return 0;
}

export async function POST(request) {
  const { username, password } = await request.json().catch(() => ({}));
  const ipKey = `login:fail:${clientIp(request)}`;
  const totalKey = "login:fail:all";

  try {
    const wait = await lockedFor([ipKey, totalKey], [MAX_FAILS_PER_IP, MAX_FAILS_TOTAL]);
    if (wait > 0) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} minutes.` },
        { status: 429 }
      );
    }

    if (!verifyCredentials(username, password)) {
      await Promise.all([kvIncr(ipKey, LOCK_SECONDS), kvIncr(totalKey, LOCK_SECONDS)]);
      return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
    }

    await kvDelete(ipKey);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, createSessionToken(process.env.AUTH_USERNAME), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("Error en el login:", error);
    return NextResponse.json({ error: "Couldn't sign in. Check the server configuration." }, { status: 500 });
  }
}
