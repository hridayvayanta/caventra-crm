-- CAVENTRA CRM Cloudflare D1 Database Schema (₹0 SQLite Serverless)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK(role IN ('admin', 'employee')) DEFAULT 'employee',
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  website TEXT NOT NULL,
  normalized_domain TEXT UNIQUE NOT NULL,
  contact_name TEXT,
  business_email TEXT,
  business_phone TEXT,
  city TEXT,
  country TEXT DEFAULT 'US',
  industry TEXT NOT NULL,
  lead_source TEXT DEFAULT 'Automated Gemini Bot',
  source_url TEXT,
  website_condition TEXT NOT NULL,
  service_opportunity TEXT CHECK(service_opportunity IN ('Redesign', 'Maintenance', 'Hosting', 'Security Audit', 'Speed Optimization')) DEFAULT 'Redesign',
  verified_status TEXT CHECK(verified_status IN ('unverified', 'ai_inferred', 'verified')) DEFAULT 'ai_inferred',
  status TEXT CHECK(status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')) DEFAULT 'new',
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  estimated_value INTEGER DEFAULT 35000,
  last_contact_date DATETIME,
  next_follow_up_date TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_domain ON leads(normalized_domain);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  performed_by TEXT NOT NULL,
  type TEXT CHECK(type IN ('call', 'email', 'note', 'status_change', 'ingestion')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingestion_batches (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  leads_harvested INTEGER NOT NULL,
  new_leads INTEGER NOT NULL,
  duplicates_skipped INTEGER NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
