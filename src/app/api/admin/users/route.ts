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
      if (selectError.message?.includes("status")) {
        return NextResponse.json({
          users: [],
          needsMigration: true,
          error: "A coluna 'status' não foi encontrada na tabela 'authorized_users'. Execute o SQL de migração no Supabase.",
        });
      }
      console.error("[API Admin Users] Erro ao buscar authorized_users:", selectError);
    }

    const authorizedMap = new Map<string, any>();
    (existingAuthorized || []).forEach((u: any) => {
      if (u.email) {
        authorizedMap.set(u.email.toLowerCase().trim(), {
          ...u,
          status: u.status || "approved", // fallback se status for nulo
        });
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
      try {
        const { error: insertError } = await admin
          .from("authorized_users")
          .insert(toInsert);

        if (insertError) {
          // Se falhar por falta da coluna status, tenta sem a coluna status
          if (insertError.message?.includes("status")) {
            const fallbackToInsert = toInsert.map(({ status, ...rest }) => rest);
            await admin.from("authorized_users").insert(fallbackToInsert);
          } else {
            console.error("[API Admin Users] Erro ao sincronizar usuários:", insertError);
          }
        }
      } catch (e) {
        console.error("[API Admin Users] Exceção na sincronização:", e);
      }
    }

    // 4. Buscar a lista final atualizada
    const { data: finalUsers, error: finalError } = await admin
      .from("authorized_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (finalError) {
      if (finalError.message?.includes("status")) {
        return NextResponse.json({
          users: [],
          needsMigration: true,
          error: "A coluna 'status' precisa ser criada no Supabase. Execute o comando ALTER TABLE no SQL Editor.",
        });
      }
      throw finalError;
    }

    const formattedUsers = (finalUsers || []).map((u: any) => ({
      ...u,
      status: u.status || (u.email?.toLowerCase().trim() === "caioluispeixotos@gmail.com" ? "approved" : "pending"),
    }));

    return NextResponse.json({ users: formattedUsers });
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

      try {
        let query = admin.from("authorized_users").update({ status: "approved" });
        if (id) query = query.eq("id", id);
        else if (email) query = query.ilike("email", email.toLowerCase().trim());

        const { error } = await query;
        if (error) {
          if (error.message?.includes("status")) {
            return NextResponse.json({
              error: "A coluna 'status' não existe no banco. Execute o SQL de migração no Supabase para ativar essa função.",
            }, { status: 400 });
          }
          throw error;
        }
      } catch (err: any) {
        if (err.message?.includes("status")) {
          return NextResponse.json({
            error: "A coluna 'status' não foi encontrada na tabela 'authorized_users'. Execute o SQL de migração no Supabase SQL Editor.",
          }, { status: 400 });
        }
        throw err;
      }

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

    if (action === "invite") {
      if (!email) {
        return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400 });
      }

      const cleanEmail = email.toLowerCase().trim();
      const userRole = role || "Viewer";

      try {
        const { error } = await admin
          .from("authorized_users")
          .upsert([{
            email: cleanEmail,
            role: userRole,
            status: "approved",
          }], { onConflict: "email" });

        if (error) {
          if (error.message?.includes("status")) {
            // Fallback sem a coluna status
            const { error: fallbackErr } = await admin
              .from("authorized_users")
              .upsert([{
                email: cleanEmail,
                role: userRole,
              }], { onConflict: "email" });

            if (fallbackErr) throw fallbackErr;
          } else {
            throw error;
          }
        }
      } catch (err: any) {
        if (err.message?.includes("status")) {
          return NextResponse.json({
            error: "A coluna 'status' não existe no banco de dados. Por favor, adicione a coluna 'status' no Supabase SQL Editor.",
          }, { status: 400 });
        }
        throw err;
      }

      return NextResponse.json({ success: true, message: "E-mail pré-aprovado com sucesso." });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err: any) {
    console.error("[API Admin Users POST] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
