import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Weekly Cash" };

// Solo se aceptan rutas internas para volver después del login
function safeNext(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  return <LoginForm next={safeNext(params?.next)} />;
}
