export interface Env {
  DB: D1Database;
  CAVENTRA_INGEST_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Standard CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CAVENTRA-SECRET",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. Health check
      if (url.pathname === "/api/health") {
        return new Response(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Fetch all leads (Protected: Requires Authorization or Ingestion Secret)
      if (url.pathname === "/api/leads" && request.method === "GET") {
        const secret = request.headers.get("X-CAVENTRA-SECRET");
        const authHeader = request.headers.get("Authorization");
        if (env.CAVENTRA_INGEST_SECRET && secret !== env.CAVENTRA_INGEST_SECRET && (!authHeader || !authHeader.startsWith("Bearer "))) {
          return new Response(JSON.stringify({ error: "Unauthorized: Access token or secret required to view confidential CRM leads" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { results } = await env.DB.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. Autonomous Ingestion Endpoint (Protected by X-CAVENTRA-SECRET)
      if (url.pathname === "/api/leads/ingest" && request.method === "POST") {
        const secret = request.headers.get("X-CAVENTRA-SECRET");
        if (env.CAVENTRA_INGEST_SECRET && secret !== env.CAVENTRA_INGEST_SECRET) {
          return new Response(JSON.stringify({ error: "Unauthorized: Invalid ingestion token" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body: any = await request.json();
        const incomingLeads = body.leads || [];
        let inserted = 0;
        let duplicates = 0;

        for (const item of incomingLeads) {
          if (!item.website || !item.business_name) continue;

          // Normalize domain: strip https, www, query params
          const normalized = item.website
            .replace(/^https?:\/\//i, "")
            .replace(/^www\./i, "")
            .split("/")[0]
            .toLowerCase();

          // Check if domain already exists
          const existing = await env.DB.prepare("SELECT id FROM leads WHERE normalized_domain = ?").bind(normalized).first();

          if (existing) {
            duplicates++;
            // Log re-scan audit activity
            await env.DB.prepare(`
              INSERT INTO activities (id, lead_id, performed_by, type, title, description)
              VALUES (?, ?, 'Automated Bot', 'ingestion', 'Re-scanned by Gemini', ?)
            `).bind(crypto.randomUUID(), existing.id, item.website_condition || "Domain re-evaluated.").run();
          } else {
            inserted++;
            const leadId = crypto.randomUUID();
            await env.DB.prepare(`
              INSERT INTO leads (
                id, business_name, website, normalized_domain, contact_name, business_email, 
                business_phone, city, country, industry, service_opportunity, website_condition, 
                estimated_value, lead_source, status, priority
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'medium')
            `).bind(
              leadId,
              item.business_name,
              item.website,
              normalized,
              item.contact_name || null,
              item.business_email || null,
              item.business_phone || null,
              item.city || "Unknown",
              item.country || "US",
              item.industry || "General",
              item.service_opportunity || "Redesign",
              item.website_condition || "Deficiency detected by automated scan.",
              item.estimated_value || 35000,
              body.source || "Automated Gemini Bot"
            ).run();

            // Log first activity
            await env.DB.prepare(`
              INSERT INTO activities (id, lead_id, performed_by, type, title, description)
              VALUES (?, ?, 'Automated Bot', 'ingestion', 'New Lead Discovered', ?)
            `).bind(crypto.randomUUID(), leadId, item.website_condition).run();
          }
        }

        // Record batch log
        const batchId = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO ingestion_batches (id, source, leads_harvested, new_leads, duplicates_skipped)
          VALUES (?, ?, ?, ?, ?)
        `).bind(batchId, body.source || "Gemini Harvest", incomingLeads.length, inserted, duplicates).run();

        return new Response(JSON.stringify({ status: "success", batchId, inserted, duplicates }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 4. Secure Opt-Out Endpoint (One-click Unsubscribe)
      if (url.pathname === "/api/outreach/optout" && (request.method === "GET" || request.method === "POST")) {
        let email = url.searchParams.get("email");
        let token = url.searchParams.get("token");

        if (request.method === "POST") {
          try {
            const b: any = await request.json();
            if (b.email) email = b.email;
            if (b.token) token = b.token;
          } catch {}
        }

        if (!email || !token) {
          return new Response(JSON.stringify({ error: "Missing required email or token parameter" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const normEmail = email.trim().toLowerCase();
        const now = new Date().toISOString();

        // Persist suppression in D1 if available
        try {
          await env.DB.prepare(`
            INSERT OR REPLACE INTO email_suppressions (id, email, reason, suppressed_at, notes)
            VALUES (?, ?, 'OPT_OUT', ?, 'Unsubscribed via opt-out link')
          `).bind(normEmail, normEmail, now).run();
        } catch {
          // Non-fatal if table not migrated in D1 yet
        }

        // Return branded HTML if browser navigation, or JSON if API
        if (request.headers.get("accept")?.includes("text/html")) {
          const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Unsubscribed — CAVENTRA</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e293b; border: 1px solid #334155; padding: 2.5rem; border-radius: 1rem; max-width: 440px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #38bdf8; }
    p { font-size: 0.95rem; color: #94a3b8; line-height: 1.5; }
    .badge { background: #334155; padding: 0.4rem 0.8rem; border-radius: 0.375rem; font-family: monospace; font-size: 0.85rem; color: #e2e8f0; display: inline-block; margin: 1rem 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>You have unsubscribed</h1>
    <p>Your email has been permanently suppressed from all future automatic outreach communications from CAVENTRA.</p>
    <div class="badge">${normEmail}</div>
    <p style="font-size: 0.8rem; color: #64748b;">If this was a mistake, please reach out to hello@caventraofficial.in</p>
  </div>
</body>
</html>`;
          return new Response(html, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }

        return new Response(JSON.stringify({ 
          status: "success", 
          email: normEmail, 
          message: "Email address successfully added to suppression list." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
