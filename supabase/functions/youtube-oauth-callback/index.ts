import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(() => {
  return new Response(
    JSON.stringify({
      ok: true,
      note: "Primary YouTube OAuth callback lives in Next.js route handler.",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
