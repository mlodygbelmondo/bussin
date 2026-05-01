import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

serve(async (request) => {
  const payload = await request.json();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (payload.taskId) {
    await supabase
      .from("jobs")
      .update({
        status: payload.status === "complete" ? "done" : "waiting",
        metadata: payload,
      })
      .eq("external_id", payload.taskId);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
