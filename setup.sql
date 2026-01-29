-- Create the synthetic_data table
CREATE TABLE IF NOT EXISTS synthetic_data (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    question TEXT NOT NULL,
    reasons JSONB NOT NULL,
    selected_reason TEXT NOT NULL,
    why_selected TEXT NOT NULL,
    answer TEXT NOT NULL,
    model TEXT
);

-- Enable RLS
ALTER TABLE synthetic_data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read
CREATE POLICY "Allow public read" ON synthetic_data FOR SELECT USING (true);

-- Create policy to allow service role to insert/update
CREATE POLICY "Allow service_role insert" ON synthetic_data FOR INSERT WITH CHECK (auth.role() = 'service_role');
