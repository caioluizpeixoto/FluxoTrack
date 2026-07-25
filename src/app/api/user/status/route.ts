import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (cleanEmail === "caioluispeixotos@gmail.com") {
      return NextResponse.json({ role: "Admin", status: "approved" });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("authorized_users")
      .select("role, status")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (error) {
      console.error("[API User Status] Error:", error);
      return NextResponse.json({ role: "Viewer", status: "pending" });
    }

    return NextResponse.json({
      role: data?.role || "Viewer",
      status: data?.status || "pending",
    });
  } catch (err: any) {
    console.error("[API User Status GET] Exception:", err);
    return NextResponse.json({ role: "Viewer", status: "pending" }, { status: 500 });
  }
}
