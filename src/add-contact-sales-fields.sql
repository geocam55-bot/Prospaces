-- Add sales and gross profit fields to contacts table
-- PTD = Period To Date, YTD = Year To Date, LYR = Last Year, GP% = Gross Profit Percentage

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS legacy_number TEXT,
ADD COLUMN IF NOT EXISTS account_owner_number TEXT,
ADD COLUMN IF NOT EXISTS ptd_sales NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ptd_gp_percent NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ytd_sales NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ytd_gp_percent NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lyr_sales NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lyr_gp_percent NUMERIC(5, 2) DEFAULT 0;

-- Add comments to document the fields
COMMENT ON COLUMN contacts.legacy_number IS 'Legacy system customer number';
COMMENT ON COLUMN contacts.account_owner_number IS 'Account owner identifier number';
COMMENT ON COLUMN contacts.ptd_sales IS 'Period To Date Sales';
COMMENT ON COLUMN contacts.ptd_gp_percent IS 'Period To Date Gross Profit Percentage';
COMMENT ON COLUMN contacts.ytd_sales IS 'Year To Date Sales';
COMMENT ON COLUMN contacts.ytd_gp_percent IS 'Year To Date Gross Profit Percentage';
COMMENT ON COLUMN contacts.lyr_sales IS 'Last Year Sales';
COMMENT ON COLUMN contacts.lyr_gp_percent IS 'Last Year Gross Profit Percentage';