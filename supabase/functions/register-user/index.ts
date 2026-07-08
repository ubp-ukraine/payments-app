import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_ROLES = new Set(["zamovnyk", "buhgalter", "admin", "fin_director"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      full_name?: string;
      role?: string;
      access_token?: string;
    };

    const rawAuthHeader = req.headers.get("Authorization");
    const tokenFromHeader = rawAuthHeader?.startsWith("Bearer ")
      ? rawAuthHeader.slice("Bearer ".length).trim()
      : rawAuthHeader?.trim();
    const accessToken = tokenFromHeader || body.access_token?.trim();
    if (!accessToken) {
      return json({ error: "Unauthorized: missing access token" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return json({ error: "Unauthorized: invalid or expired session" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile } = await adminClient
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== "admin") {
      return json({ error: "Forbidden: тільки адмін може створювати користувачів" }, 403);
    }

    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const role = body.role?.trim();
    const fullName = body.full_name?.trim() || null;

    if (!email || !password || !role) {
      return json({ error: "email, password та роль обовʼязкові" }, 400);
    }
    if (!ALLOWED_ROLES.has(role)) {
      return json({ error: "Недопустима роль" }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Пароль має містити щонайменше 6 символів" }, 400);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? undefined },
    });
    if (createError || !created.user) {
      return json({ error: createError?.message || "Не вдалося створити користувача" }, 400);
    }

    const { error: upsertError } = await adminClient
      .from("users")
      .upsert({ id: created.user.id, email, full_name: fullName, role });
    if (upsertError) {
      return json({ error: upsertError.message }, 500);
    }

    return json({ success: true, id: created.user.id, email, role });
  } catch (err) {
    return json({ error: (err as Error).message ?? "Internal error" }, 500);
  }
});
