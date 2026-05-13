import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase";

export async function getServerUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  if (!accessToken) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    }
  );

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) return null;

  await ensureProfile(data.user.id, data.user.email || null);
  return data.user;
}

export async function requireServerUser() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireServerSession() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;
  const user = await requireServerUser();
  if (!accessToken) redirect("/login");
  return { user, accessToken };
}

export async function getApiUserFromRequest(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    }
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  await ensureProfile(data.user.id, data.user.email || null);
  return data.user;
}

export async function ensureProfile(userId: string, email: string | null) {
  await supabaseAdmin.from("profiles").upsert({ id: userId, email });
}

export function unauthorized(message = "Não autorizado") {
  return Response.json({ error: message }, { status: 401 });
}

export async function getApiUserFromCookiesOrRequest(req: Request) {
  const fromHeader = await getApiUserFromRequest(req);
  if (fromHeader) return fromHeader;
  return getServerUser();
}
