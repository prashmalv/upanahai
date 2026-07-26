import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const COOKIE = "upanah_session";
const VISITOR_COOKIE = "upanah_vid";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-insecure-secret-change-me"
);

export type Role = "user" | "brand" | "admin";

export type Session = {
  userId: string;
  email: string;
  name?: string;
  role: Role;
  brandName?: string;
};

export async function createSession(payload: Session) {
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string | undefined,
      // Sessions minted before roles existed have no role claim — treat as user.
      role: ((payload.role as Role) || "user") as Role,
      brandName: (payload.brandName as string) || undefined
    };
  } catch {
    return null;
  }
}

export function clearSession() {
  cookies().delete(COOKIE);
}

/** True only for admin sessions. Use this to guard every admin surface. */
export async function requireAdmin(): Promise<Session | null> {
  const s = await getSession();
  return s?.role === "admin" ? s : null;
}

/**
 * Stable-per-browser anonymous id, so analytics can count people rather than
 * requests without touching personal data. Created lazily; callers that only
 * read (server components) get whatever already exists.
 */
export function readVisitorId(): string {
  return cookies().get(VISITOR_COOKIE)?.value || "";
}

export function ensureVisitorId(): string {
  const existing = cookies().get(VISITOR_COOKIE)?.value;
  if (existing) return existing;
  const id = randomUUID();
  cookies().set(VISITOR_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
  return id;
}
