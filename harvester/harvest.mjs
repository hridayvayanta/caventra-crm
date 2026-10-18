import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CAVENTRA_API_URL = process.env.CAVENTRA_API_URL;
const CAVENTRA_INGEST_SECRET = process.env.CAVENTRA_INGEST_SECRET;

if (!GEMINI_API_KEY) {
  console.error("❌ Error: GEMINI_API_KEY environment variable is missing.");
  process.exit(1);
}

async function runHarvest() {
  console.log("🚀 [CAVENTRA AUTONOMOUS BOT] Initializing daily web services lead search...");

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  const prompt = `
    You are an automated technical lead research bot for CAVENTRA, an agency offering web development, website maintenance, hosting migration, and cybersecurity audits.
    
    Search for and identify 10 distinct, real businesses (such as medical clinics, legal offices, accounting firms, industrial contractors, architectural studios) located in the United States, United Kingdom, or India that currently have websites with clear technical deficiencies (such as outdated design, lack of responsive mobile optimization, slow loading performance, missing or expired SSL certificates, or outdated CMS vulnerabilities).

    Format your output strictly as a JSON array of objects conforming to this schema:
    [
      {
        "business_name": "string",
        "website": "string (valid URL)",
        "contact_name": "string or null",
        "business_email": "string or null",
        "business_phone": "string or null",
        "city": "string",
        "country": "string",
        "industry": "string",
        "service_opportunity": "Redesign" | "Maintenance" | "Hosting" | "Security Audit" | "Speed Optimization",
        "website_condition": "string (explicit technical problem observed)",
        "estimated_value": number (reasonable budget in INR, e.g. between 30000 and 90000)
      }
    ]
  `;

  try {
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const leads = JSON.parse(rawText);

    console.log(`✓ Received ${leads.length} structured prospects from Gemini Flash.`);

    if (CAVENTRA_API_URL && CAVENTRA_INGEST_SECRET) {
      console.log(`📡 Sending to Cloudflare Ingestion Worker at ${CAVENTRA_API_URL}...`);
      const response = await fetch(`${CAVENTRA_API_URL}/api/leads/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CAVENTRA-SECRET": CAVENTRA_INGEST_SECRET,
        },
        body: JSON.stringify({
          source: "GitHub Actions Autonomous Gemini Bot",
          leads,
        }),
      });

      const data = await response.json();
      console.log("✓ Ingestion Response:", data);
    } else {
      console.log("ℹ️ Dry-run mode: CAVENTRA_API_URL not configured yet. Leads extracted successfully.");
      console.log(JSON.stringify(leads.slice(0, 2), null, 2));
    }
  } catch (error) {
    console.error("❌ Harvest execution failed:", error);
    process.exit(1);
  }
}

runHarvest();
