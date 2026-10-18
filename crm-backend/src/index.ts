export interface Env {
  DB: D1Database;
  CAVENTRA_INGEST_SECRET: string;
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

      // 2. Fetch all leads
      if (url.pathname === "/api/leads" && request.method === "GET") {
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

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
