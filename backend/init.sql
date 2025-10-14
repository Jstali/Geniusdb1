-- Initialize GeniusDB PostgreSQL Database
-- This script runs automatically when the PostgreSQL container starts for the first time

-- Create user_views table for storing user-specific view configurations
CREATE TABLE IF NOT EXISTS user_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    slot INTEGER NOT NULL CHECK (slot >= 1 AND slot <= 5),
    name VARCHAR(255) NOT NULL,
    selected_columns TEXT NOT NULL,
    chart_config TEXT DEFAULT '',
    filters TEXT DEFAULT '',
    map_config TEXT DEFAULT '',
    sort_config TEXT DEFAULT '',
    pagination_config TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, slot)
);

-- Create saved_views table for named view storage
CREATE TABLE IF NOT EXISTS saved_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    view_name VARCHAR(255) NOT NULL,
    selected_columns TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, view_name)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_views_user_id ON user_views(user_id);
CREATE INDEX IF NOT EXISTS idx_user_views_slot ON user_views(user_id, slot);
CREATE INDEX IF NOT EXISTS idx_saved_views_user_id ON saved_views(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_name ON saved_views(user_id, view_name);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_views table
DROP TRIGGER IF EXISTS update_user_views_updated_at ON user_views;
CREATE TRIGGER update_user_views_updated_at
    BEFORE UPDATE ON user_views
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data (optional - remove in production)
-- INSERT INTO user_views (user_id, slot, name, selected_columns) 
-- VALUES (1, 1, 'Default View', 'Site Name,Site Type,Site Voltage,County,Generation Headroom Mw')
-- ON CONFLICT (user_id, slot) DO NOTHING;

-- Grant permissions (if needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO geniususer;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO geniususer;

COMMIT;

