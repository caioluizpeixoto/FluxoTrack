import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  try {
    const admin = getSupabaseAdmin();

    // 1. Buscar todos os usuários em auth.users
    const { data: authUsersData, error: authError } = await admin.auth.admin.listUsers();
    if (authError) {
      console.error("[API Admin Users] Erro ao listar auth.users:", authError);
    }

    const authUsers = authUsersData?.users || [];

    // 2. Buscar usuários em public.authorized_users
    const { data: existingAuthorized, error: selectError } = await admin
      .from("authorized_users")
      .select("*");

    if (selectError) {
      console.error("[API Admin Users] Erro ao buscar authorized_users:", selectError);
    }

    const authorizedMap = new Map<string, any>();
    (existingAuthorized || []).forEach((u: any) => {
      if (u.email) {
        authorizedMap.set(u.email.toLowerCase().trim(), u);
      }
    });

    // 3. Sincronizar usuários de auth.users que ainda não estão na tabela public.authorized_users
    const toInsert: any[] = [];
    for (const au of authUsers) {
      if (!au.email) continue;
      const cleanEmail = au.email.toLowerCase().trim();

      if (!authorizedMap.has(cleanEmail)) {
        const isMainAdmin = cleanEmail === "caioluispeixotos@gmail.com";
        toInsert.push({
          email: cleanEmail,
          role: isMainAdmin ? "Admin" : "Viewer",
          status: isMainAdmin ? "approved" : "pending",
          created_at: au.created_at || new Date().toISOString(),
        });
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await admin
        .from("authorized_users")
        .insert(toInsert);

      if (insertError) {
        console.error("[API Admin Users] Erro ao sincronizar usuários:", insertError);
      }
    }

    // 4. Buscar a lista final atualizada
    const { data: finalUsers, error: finalError } = await admin
      .from("authorized_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (finalError) throw finalError;

    return NextResponse.json({ users: finalUsers || [] });
  } catch (err: any) {
    console.error("[API Admin Users GET] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = getSupabaseAdmin();
    const body = await request.json();
    const { action, id, email, role } = body;

    if (!action) {
      return NextResponse.json({ error: "Ação não especificada" }, { status: 400 });
    }

    if (action === "approve") {
      if (!id && !email) {
        return NextResponse.json({ error: "ID ou E-mail obrigatório" }, { status: 400 });
      }

      let query = admin.from("authorized_users").update({ status: "approved" });
      if (id) query = query.eq("id", id);
      else if (email) query = query.ilike("email", email.toLowerCase().trim());

      const { error } = await query;
      if (error) throw error;

      return NextResponse.json({ success: true, message: "Usuário aprovado com sucesso." });
    }

    if (action === "reject") {
      if (!id && !email) {
        return NextResponse.json({ error: "ID ou E-mail obrigatório" }, { status: 400 });
      }

      const cleanEmail = email?.toLowerCase().trim();
      if (cleanEmail === "caioluispeixotos@gmail.com") {
        return NextResponse.json({ error: "Não é possível rejeitar o Administrador principal." }, { status: 400 });
      }

      let query = admin.from("authorized_users").delete();
      if (id) query = query.eq("id", id);
      else if (email) query = query.ilike("email", cleanEmail);

      const { error } = await query;
      if (error) throw error;

      return NextResponse.json({ success: true, message: "Solicitação removida." });
    }

    if (action === "change_role") {
      if (!id || !role) {
        return NextResponse.json({ error: "ID e Role são obrigatórios" }, { status: 400 });
      }

      const { error } = await admin
        .from("authorized_users")
        .update({ role })
        .eq("id", id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: "Permissão atualizada." });
    }

    if (action === "invite") {
      if (!email) {
        return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400 });
      }

      const cleanEmail = email.toLowerCase().trim();
      const userRole = role || "Viewer";

      const { error } = await admin
        .from("authorized_users")
        .upsert([{
          email: cleanEmail,
          role: userRole,
          status: "approved",
        }], { onConflict: "email" });

      if (error) throw error;

      return NextResponse.json({ success: true, message: "E-mail pré-aprovado com sucesso." });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err: any) {
    console.error("[API Admin Users POST] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
