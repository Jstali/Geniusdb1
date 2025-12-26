"""
Grid and Primary Sites Calculated - QA Version
This is a clone of grid_and_primary_calculated.py that uses the ukpn_opendata_qa database
instead of the production ukpn_opendata database.
"""

import pandas as pd
import os
from dotenv import load_dotenv
import re
from difflib import SequenceMatcher
import sys
import shutil
import json

# Load .env variables
load_dotenv()

# Configuration
SPARE_MULTIPLIER = 0.96

# ============================================================================
# COLUMN TRACKING SYSTEM
# ============================================================================

# Dictionary to track column sources
column_tracking = {
    'database_columns': {},  # Format: {column_name: {'table': table_name, 'original_column': original_name}}
    'calculated_columns': {},  # Format: {column_name: {'description': description, 'formula': formula}}
    'renamed_columns': {},  # Format: {new_name: original_name}
    'aggregated_columns': {}  # Format: {column_name: {'source_table': table, 'aggregation': method}}
}

def track_database_columns(df, table_name, column_mapping=None):
    """Track columns that come from database tables"""
    for col in df.columns:
        if column_mapping and col in column_mapping:
            # If column was renamed during fetch
            original_name = column_mapping[col]
            column_tracking['database_columns'][col] = {
                'table': table_name, 
                'original_column': original_name
            }
            column_tracking['renamed_columns'][col] = original_name
        else:
            # Column name unchanged
            column_tracking['database_columns'][col] = {
                'table': table_name, 
                'original_column': col
            }

def track_calculated_column(column_name, description, formula=None):
    """Track columns that are calculated/created in the program"""
    column_tracking['calculated_columns'][column_name] = {
        'description': description,
        'formula': formula or 'Complex calculation - see code'
    }

def track_aggregated_column(column_name, source_table, aggregation_method):
    """Track columns that are aggregated from other tables"""
    column_tracking['aggregated_columns'][column_name] = {
        'source_table': source_table,
        'aggregation': aggregation_method
    }

def print_column_tracking_summary():
    """Print comprehensive column tracking summary"""
    print("\n" + "="*80)
    print("COMPREHENSIVE COLUMN TRACKING SUMMARY")
    print("="*80)
    
    print(f"\n1. DATABASE COLUMNS (from tables):")
    print("-" * 50)
    tables_summary = {}
    for col, info in column_tracking['database_columns'].items():
        table = info['table']
        if table not in tables_summary:
            tables_summary[table] = []
        original = info['original_column']
        if col != original:
            tables_summary[table].append(f"{col} (was: {original})")
        else:
            tables_summary[table].append(col)
    
    for table, columns in sorted(tables_summary.items()):
        print(f"\n{table}:")
        for col in sorted(columns):
            print(f"  - {col}")
    
    print(f"\n2. CALCULATED/PROGRAM-GENERATED COLUMNS:")
    print("-" * 50)
    for col, info in sorted(column_tracking['calculated_columns'].items()):
        print(f"\n{col}:")
        print(f"  Description: {info['description']}")
        print(f"  Formula: {info['formula']}")
    
    print(f"\n3. AGGREGATED COLUMNS:")
    print("-" * 50)
    for col, info in sorted(column_tracking['aggregated_columns'].items()):
        print(f"\n{col}:")
        print(f"  Source Table: {info['source_table']}")
        print(f"  Aggregation: {info['aggregation']}")
    
    print(f"\n4. RENAMED COLUMNS:")
    print("-" * 50)
    if column_tracking['renamed_columns']:
        for new_name, original_name in sorted(column_tracking['renamed_columns'].items()):
            print(f"  {new_name} <- {original_name}")
    else:
        print("  No columns were renamed during processing")
    
    print(f"\n5. SUMMARY STATISTICS:")
    print("-" * 50)
    print(f"  Total database columns: {len(column_tracking['database_columns'])}")
    print(f"  Total calculated columns: {len(column_tracking['calculated_columns'])}")
    print(f"  Total aggregated columns: {len(column_tracking['aggregated_columns'])}")
    print(f"  Total renamed columns: {len(column_tracking['renamed_columns'])}")
    total_cols = len(column_tracking['database_columns']) + len(column_tracking['calculated_columns'])
    print(f"  Total columns in final dataset: {total_cols}")
    
    print("\n" + "="*80)

# Fetch data directly from CSV file
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
csv_path = os.path.join(DATA_DIR, "transformed_transformer_data.csv")

if not os.path.exists(csv_path):
    print(f"\nERROR: CSV file not found at {csv_path}")
    print("Cannot proceed without data file.")
    exit(1)

try:
    print(f"Reading data from {csv_path}...")
    df = pd.read_csv(csv_path)
    print(f"Successfully read {len(df)} records from CSV file")
except Exception as e:
    print(f"Error reading data from CSV: {e}")
    print("Cannot proceed without data from CSV file.")
    exit(1)

# Track initial data columns
track_database_columns(df, 'transformed_transformer_data.csv')

def parse_demand_value(demand_str):
    """Parse demand value - handle both single values and comma-separated values"""
    if pd.isna(demand_str) or demand_str == '' or demand_str is None:
        return 0.0
    demand_str = str(demand_str).strip()
    if ',' in demand_str:
        values = [float(x.strip()) for x in demand_str.split(",") if x.strip().replace('.', '', 1).replace('-', '', 1).isdigit()]
        return sum(values) if values else 0.0
    else:
        return float(demand_str) if demand_str.replace('.', '', 1).replace('-', '', 1).isdigit() else 0.0

def calculate_generation_capacity(row, transformer_ratings, season='summer'):
    """
    Calculate generation capacity based on reversepower and transformer ratings
    
    NEW FORMULA:
    - If reversepower = "100%": return 1st transformer rating
    - If reversepower = "<100%": return 1st transformer rating / 2  
    - If reversepower = "X MVA": return X (the MVA value)
    - If reversepower = "X MVA, Y MVA, Z MVA": return MIN(X, Y, Z)
    """
    value = row.get('reversepower')
    if pd.isna(value) or value == '' or value is None:
        return 0.0, False
    
    # Get first transformer rating (index 0)
    first_transformer = transformer_ratings[0] if len(transformer_ratings) > 0 else 0.0
    
    value_str = str(value).strip().lower()
    
    # Case 1: reversepower = "100%" -> return 1st transformer rating
    if value_str == '100%':
        return first_transformer, False
    
    # Case 2: reversepower = "<100%" -> return 1st transformer rating / 2
    if '<' in value_str and '%' in value_str:
        return first_transformer / 2, False
    
    # Case 3: reversepower contains MVA values
    if 'mva' in value_str:
        # Find all MVA values in the string
        mva_matches = re.findall(r'([\d.]+)\s*mva', value_str)
        if mva_matches:
            try:
                mva_values = [float(match) for match in mva_matches]
                # If multiple MVA values, return the minimum
                return min(mva_values), True
            except ValueError:
                return 0.0, False
    
    # Case 4: Other percentage values -> return 1st transformer × (percentage/100)
    if '%' in value_str:
        try:
            percent_match = re.search(r'([\d.]+)\s*%', value_str)
            if percent_match:
                percent_value = float(percent_match.group(1))
                return first_transformer * (percent_value / 100), False
        except ValueError:
            return 0.0, False
    
    return 0.0, False

def process_row(row):
    count = int(row.get("powertransformercount", 0))
    
    # Helper function to safely convert to numeric and handle NULL
    def safe_numeric_convert(value_str):
        """Convert string values to numeric, return None for invalid/empty values"""
        if pd.isna(value_str) or str(value_str).strip() == '' or str(value_str).strip().lower() == 'null':
            return None
        try:
            return float(str(value_str).strip())
        except (ValueError, TypeError):
            return None
    
    # Summer - convert all values to numeric with proper NULL handling
    summer_ratings_raw = str(row.get("transratingsummer", "")).split(",") if not pd.isna(row.get("transratingsummer")) else []
    summer_ratings = [safe_numeric_convert(x.strip()) for x in summer_ratings_raw]
    # Remove None values for calculation but keep track of original positions
    summer_ratings_valid = [x for x in summer_ratings if x is not None]
    limited_summer = summer_ratings_valid[:count]
    
    # Fill individual transformer columns - use NULL for missing ratings
    for i in range(count):
        trans_col = f'Trans{i+1}_Summer'
        if i < len(summer_ratings) and summer_ratings[i] is not None:
            row[trans_col] = summer_ratings[i]
        else:
            row[trans_col] = None  # Use NULL for empty/missing ratings
        # Track individual transformer columns (only track once)
        if trans_col not in column_tracking['calculated_columns']:
            track_calculated_column(trans_col, f'Summer rating for transformer {i+1}', f'Extracted from transratingsummer column, position {i+1}, NULL if missing')
    
    summer_demand = parse_demand_value(row.get('maxdemandsummer', 0))
    
    # Modified spare calculation for single rating scenario
    if len(limited_summer) == 1:
        # Single rating: use (alone rating - max_demand) * SPARE_MULTIPLIER
        row['Spare_Summer'] = round((limited_summer[0] - summer_demand) * SPARE_MULTIPLIER, 2)
    else:
        # Traditional formula for multiple ratings
        row['Spare_Summer'] = round(((sum(limited_summer) - max(limited_summer, default=0)) - summer_demand) * SPARE_MULTIPLIER, 2)
    
    # Calculate summer generation capacity using summer transformer ratings
    gen_capacity_summer, _ = calculate_generation_capacity(row, limited_summer, season='summer')
    
    # Winter - convert all values to numeric with proper NULL handling
    winter_ratings_raw = str(row.get("transratingwinter", "")).split(",") if not pd.isna(row.get("transratingwinter")) else []
    winter_ratings = [safe_numeric_convert(x.strip()) for x in winter_ratings_raw]
    # Remove None values for calculation but keep track of original positions
    winter_ratings_valid = [x for x in winter_ratings if x is not None]
    limited_winter = winter_ratings_valid[:count]
    
    # Fill individual transformer columns - use NULL for missing ratings
    for i in range(count):
        trans_col = f'Trans{i+1}_Winter'
        if i < len(winter_ratings) and winter_ratings[i] is not None:
            row[trans_col] = winter_ratings[i]
        else:
            row[trans_col] = None  # Use NULL for empty/missing ratings
        # Track individual transformer columns (only track once)
        if trans_col not in column_tracking['calculated_columns']:
            track_calculated_column(trans_col, f'Winter rating for transformer {i+1}', f'Extracted from transratingwinter column, position {i+1}, NULL if missing')
    
    winter_demand = parse_demand_value(row.get('maxdemandwinter', 0))
    
    # Modified spare calculation for single rating scenario
    if len(limited_winter) == 1:
        # Single rating: use (alone rating - max_demand) * SPARE_MULTIPLIER
        row['Spare_Winter'] = round((limited_winter[0] - winter_demand) * SPARE_MULTIPLIER, 2)
    else:
        # Traditional formula for multiple ratings
        row['Spare_Winter'] = round(((sum(limited_winter) - max(limited_winter, default=0)) - winter_demand) * SPARE_MULTIPLIER, 2)
    
    # Calculate winter generation capacity using winter transformer ratings
    gen_capacity_winter, _ = calculate_generation_capacity(row, limited_winter, season='winter')
    
    # Generation Capacity - take min of summer and winter (removed DIMINIMUS_ADDITION)
    row['Generation_Capacity'] = min(gen_capacity_summer, gen_capacity_winter)
    
    # ============================================================================
    # FIRM CAPACITY CALCULATION
    # ============================================================================
    
    # Calculate Firm Capacity based on different scenarios
    
    # Scenario 1: Both summer and winter have multiple ratings
    if len(limited_summer) > 1 and len(limited_winter) > 1:
        firm_summer = ((sum(limited_summer) - max(limited_summer, default=0)) * SPARE_MULTIPLIER)
        firm_winter = ((sum(limited_winter) - max(limited_winter, default=0)) * SPARE_MULTIPLIER)
        row['Firm_Capacity'] = round(min(firm_summer, firm_winter), 2)
    
    # Scenario 2: Both summer and winter have single ratings
    elif len(limited_summer) == 1 and len(limited_winter) == 1:
        firm_summer = limited_summer[0] * SPARE_MULTIPLIER
        firm_winter = limited_winter[0] * SPARE_MULTIPLIER
        row['Firm_Capacity'] = round(min(firm_summer, firm_winter), 2)
    
    # Scenario 3a: Summer multiple, Winter single
    elif len(limited_summer) > 1 and len(limited_winter) == 1:
        firm_summer = ((sum(limited_summer) - max(limited_summer, default=0)) * SPARE_MULTIPLIER)
        firm_winter = limited_winter[0] * SPARE_MULTIPLIER
        row['Firm_Capacity'] = round(min(firm_summer, firm_winter), 2)
    
    # Scenario 3b: Summer single, Winter multiple
    elif len(limited_summer) == 1 and len(limited_winter) > 1:
        firm_summer = limited_summer[0] * SPARE_MULTIPLIER
        firm_winter = ((sum(limited_winter) - max(limited_winter, default=0)) * SPARE_MULTIPLIER)
        row['Firm_Capacity'] = round(min(firm_summer, firm_winter), 2)
    
    # Edge case: No valid ratings (shouldn't happen with filtering, but safety check)
    else:
        row['Firm_Capacity'] = 0.0
    
    return row

# Track calculated columns from process_row function
track_calculated_column('Spare_Summer', 'Summer spare capacity', 'Single rating: (rating - demand) * SPARE_MULTIPLIER; Multiple: ((sum(ratings) - max(rating)) - demand) * SPARE_MULTIPLIER')
track_calculated_column('Spare_Winter', 'Winter spare capacity', 'Single rating: (rating - demand) * SPARE_MULTIPLIER; Multiple: ((sum(ratings) - max(rating)) - demand) * SPARE_MULTIPLIER')
track_calculated_column('Generation_Capacity', 'Generation capacity calculation', 'min(gen_capacity_summer, gen_capacity_winter)')
track_calculated_column('Firm_Capacity', 'Firm capacity based on transformer ratings with diversity factor', 'Scenario-based: Multiple ratings: ((sum(ratings) - max(rating)) * 0.96), Single rating: (rating * 0.96), Final: min(summer_result, winter_result)')

# Apply row-wise
df_processed = df.apply(process_row, axis=1)

# Export to CSV
output_file = "transformed_transformer_data.csv"
df_processed.to_csv(output_file, index=False)
print(f"Data saved to {output_file}")

# DEBUG: Print available columns
print("Available columns in df_processed:", df_processed.columns.tolist())

site_id = "SPN-S000000008466"   # replace with your sitefunctionallocation

# Check if sitefunctionallocation column exists (normalized name)
site_col_name = 'Site Functional Location'  # This is the normalized column name
if site_col_name in df_processed.columns:
    if site_id in df_processed[site_col_name].values:
        print("***********************************************************************************************************************")
        print(f"{site_id} is present in df_processed")
        print("***********************************************************************************************************************")
else:
    print(f"{site_col_name} column not found in df_processed")
    # Try to find similar column names
    similar_columns = [col for col in df_processed.columns if 'site' in col.lower() and 'loc' in col.lower()]
    print(f"Similar columns found: {similar_columns}")

# ============================================================================
# FILTERING SECTION
# ============================================================================

print("\n" + "="*50)
print("STARTING FILTERING PROCESS")
print("="*50)

# Make a copy of the processed dataframe for filtering
df_filtered = df_processed.copy()
total_rows = len(df_filtered)
print(f"Original number of records: {total_rows}")

# Convert powertransformercount to numeric for filtering (use normalized column name)
power_transformer_col = 'Power Transformer Count'  # This is the normalized column name
if power_transformer_col in df_filtered.columns:
    df_filtered[power_transformer_col] = pd.to_numeric(df_filtered[power_transformer_col], errors='coerce')
else:
    print(f"Warning: {power_transformer_col} column not found in df_filtered")
    # Try to find similar column names
    similar_columns = [col for col in df_filtered.columns if 'power' in col.lower() and 'trans' in col.lower()]
    print(f"Similar columns found: {similar_columns}")

# Apply filters step by step:

# 1. Skip esqcroverallrisk filter - column not available in grid_and_primary_sites table
print("\n1. Skipping esqcroverallrisk filter (column not available in source data)...")
print(f"   Records remain unchanged: {len(df_filtered)}")

# 2. Filter on powertransformercount - remove blanks or zeros
print("\n2. Filtering powertransformercount (no blanks/zeros)...")
power_transformer_col = 'Power Transformer Count'  # This is the normalized column name
if power_transformer_col in df_filtered.columns:
    transformer_filter = (df_filtered[power_transformer_col].notna()) & (df_filtered[power_transformer_col] > 0)
    df_filtered = df_filtered[transformer_filter]
    print(f"   Records after filter: {len(df_filtered)}")
else:
    print(f"   Warning: {power_transformer_col} column not found, skipping filter")

# 3. Filter on transratingsummer - remove blanks or zeros
print("\n3. Filtering transratingsummer (no blanks/zeros)...")
trans_rating_summer_col = 'Transformer Rating Summer'  # This is the normalized column name
if trans_rating_summer_col in df_filtered.columns:
    df_filtered[trans_rating_summer_col + '_str'] = df_filtered[trans_rating_summer_col].astype(str)
    summer_filter = ((df_filtered[trans_rating_summer_col].notna()) & 
                    (df_filtered[trans_rating_summer_col + '_str'] != '') & 
                    (df_filtered[trans_rating_summer_col + '_str'] != '0') & 
                    (df_filtered[trans_rating_summer_col + '_str'] != 'nan'))
    df_filtered = df_filtered[summer_filter]
    df_filtered = df_filtered.drop(trans_rating_summer_col + '_str', axis=1)
    print(f"   Records after filter: {len(df_filtered)}")
else:
    print(f"   Warning: {trans_rating_summer_col} column not found, skipping filter")

# 4. Filter on transratingwinter - remove blanks or zeros
print("\n4. Filtering transratingwinter (no blanks/zeros)...")
trans_rating_winter_col = 'Transformer Rating Winter'  # This is the normalized column name
if trans_rating_winter_col in df_filtered.columns:
    df_filtered[trans_rating_winter_col + '_str'] = df_filtered[trans_rating_winter_col].astype(str)
    winter_filter = ((df_filtered[trans_rating_winter_col].notna()) & 
                    (df_filtered[trans_rating_winter_col + '_str'] != '') & 
                    (df_filtered[trans_rating_winter_col + '_str'] != '0') & 
                    (df_filtered[trans_rating_winter_col + '_str'] != 'nan'))
    df_filtered = df_filtered[winter_filter]
    df_filtered = df_filtered.drop(trans_rating_winter_col + '_str', axis=1)
    print(f"   Records after filter: {len(df_filtered)}")
else:
    print(f"   Warning: {trans_rating_winter_col} column not found, skipping filter")

# 5. Filter on reversepower - remove blanks and not available/NA
print("\n5. Filtering reversepower (no blanks/NA)...")
reverse_power_col = 'Reverse Power'  # This is the normalized column name
if reverse_power_col in df_filtered.columns:
    df_filtered[reverse_power_col + '_str'] = df_filtered[reverse_power_col].astype(str)
    reverse_filter = ((df_filtered[reverse_power_col].notna()) & 
                     (df_filtered[reverse_power_col + '_str'] != '') & 
                     (df_filtered[reverse_power_col + '_str'] != 'nan') & 
                     (~df_filtered[reverse_power_col + '_str'].str.contains('not available', case=False)) & 
                     (~df_filtered[reverse_power_col + '_str'].str.contains('NA', case=True)))
    df_filtered = df_filtered[reverse_filter]
    df_filtered = df_filtered.drop(reverse_power_col + '_str', axis=1)
    print(f"   Records after filter: {len(df_filtered)}")
else:
    print(f"   Warning: {reverse_power_col} column not found, skipping filter")

# Save filtered data back to the same file
print(f"\nSaving filtered data back to {output_file}...")
df_filtered.to_csv(output_file, index=False)

# Print final statistics
print(f"\n" + "="*50)
print("FILTERING SUMMARY")
print("="*50)
print(f"Original number of records: {total_rows}")
print(f"Final number of records after filtering: {len(df_filtered)}")
print(f"Total records removed: {total_rows - len(df_filtered)} ({(total_rows - len(df_filtered))/total_rows*100:.2f}%)")

# Show sample of remaining data
print("\nSample of filtered data (first 5 rows):")
site_col_name = 'Site Functional Location'  # This is the normalized column name
sample_cols = [power_transformer_col, trans_rating_summer_col, trans_rating_winter_col, reverse_power_col, site_col_name]
# Filter to only include columns that exist
existing_sample_cols = [col for col in sample_cols if col in df_filtered.columns]
print(df_filtered[existing_sample_cols].head(5).to_string())

if site_col_name in df_filtered.columns:
    if site_id in df_filtered[site_col_name].values:
        print("***********************************************************************************************************************")
        print(f"{site_id} is present in df_processed")
        print("***********************************************************************************************************************")
else:
    print(f"Warning: {site_col_name} column not found in df_filtered")

# ============================================================================
# EMBEDDED CAPACITY REGISTER (ECR) DATA INTEGRATION - UPDATED WITH CONNECTION STATUS LOGIC
# ============================================================================

print("\n" + "="*50)
print("STARTING ECR DATA INTEGRATION - WITH CONNECTION STATUS LOGIC")
print("="*50)

# Function to apply connection status logic for aggregation
def aggregate_ecr_with_status_logic(group):
    """
    Aggregate ECR data based on Connection Status logic:
    - Already Connected sum: Include if Status = 'Connected' OR blank/null
    - Accepted to Connect sum: Include if Status = 'Accepted to Connect' OR blank/null
    """
    result = {}
    
    # For Already Connected calculation
    already_connected_mask = (
        (group['connection_status'].str.contains('Connected', case=False, na=False)) |
        (group['connection_status'] == '') |
        (group['connection_status'].isna())
    )
    result['Already connected sum'] = group.loc[already_connected_mask, 'already_connected_registered_capacity_mw'].sum()
    
    # For Accepted to Connect calculation  
    accepted_to_connect_mask = (
        (group['connection_status'].str.contains('Accepted to Connect', case=False, na=False)) |
        (group['connection_status'] == '') |
        (group['connection_status'].isna())
    )
    result['Accepted to Connect sum'] = group.loc[accepted_to_connect_mask, 'accepted_to_connect_registered_capacity_mw'].sum()
    
    # Take first occurrence for GSP and BSP (unchanged logic)
    result['Grid Supply Point'] = group['grid_supply_point'].iloc[0] if len(group) > 0 else ''
    result['Bulk Supply Point'] = group['bulk_supply_point'].iloc[0] if len(group) > 0 else ''
    
    return pd.Series(result)

# Fetch data from ukpn_embedded_capacity_register table WITH Connection Status
print("Fetching data from ukpn_embedded_capacity_register table...")
try:
    ecr_query = """
    SELECT 
        "sitefunctionallocation",
        "already_connected_registered_capacity_mw",
        "accepted_to_connect_registered_capacity_mw",
        "connection_status",
        "grid_supply_point",
        "bulk_supply_point"
    FROM ukpn_embedded_capacity_register
    """
    df_ecr = pd.read_sql_query(ecr_query, engine)
    print(f"Successfully fetched {len(df_ecr)} records from ukpn_embedded_capacity_register")
except Exception as e:
    print(f"Error fetching ECR data: {e}")
    print("Cannot proceed without data from ukpn_embedded_capacity_register table.")
    exit(1)

# Track ECR database columns
track_database_columns(df_ecr, 'ukpn_embedded_capacity_register')

# Clean and convert capacity columns to numeric
df_ecr["already_connected_registered_capacity_mw"] = pd.to_numeric(
    df_ecr["already_connected_registered_capacity_mw"], errors='coerce'
).fillna(0)

df_ecr["accepted_to_connect_registered_capacity_mw"] = pd.to_numeric(
    df_ecr["accepted_to_connect_registered_capacity_mw"], errors='coerce'
).fillna(0)

# Clean Connection Status column - handle nulls and standardize values
df_ecr["connection_status"] = df_ecr["connection_status"].fillna("").str.strip()

print(f"Debug: Connection Status values found: {df_ecr['connection_status'].value_counts()}")

# Group by sitefunctionallocation and apply the new aggregation logic
print("Aggregating ECR > 1MVA data by sitefunctionallocation with Connection Status logic...")
ecr_aggregated = df_ecr.groupby('sitefunctionallocation').apply(aggregate_ecr_with_status_logic).reset_index()

# Rename columns for clarity
ecr_aggregated = ecr_aggregated.rename(columns={
    'Already connected sum': 'ECR > 1MVA Already connected',
    'Accepted to Connect sum': 'ECR > 1MVA Accepted to connect'
})

print(f"Aggregated to {len(ecr_aggregated)} unique sitefunctionallocations")

# Debug: Show some examples of the aggregation
print("\nDebug: Sample aggregated ECR > 1MVA data:")
sample_sites = ecr_aggregated.head(5)
for _, row in sample_sites.iterrows():
    print(f"Site: {row['sitefunctionallocation']}")
    print(f"  Already Connected: {row['ECR > 1MVA Already connected']:.2f} MW")
    print(f"  Accepted to Connect: {row['ECR > 1MVA Accepted to connect']:.2f} MW")

# Track aggregated ECR columns with updated descriptions
track_aggregated_column('ECR > 1MVA Already connected', 'ukpn_embedded_capacity_register', 
                       'SUM of Already connected Registered Capacity (MW) WHERE Connection Status = "Connected" OR blank/null')
track_aggregated_column('ECR > 1MVA Accepted to connect', 'ukpn_embedded_capacity_register', 
                       'SUM of Accepted to Connect Registered Capacity (MW) WHERE Connection Status = "Accepted to Connect" OR blank/null')

# Merge with filtered data
print("Merging ECR > 1MVA data with filtered grid and primary sites data...")
df_final = df_filtered.merge(
    ecr_aggregated, 
    on='sitefunctionallocation', 
    how='left'
)

# Fill missing values for sites not found in ECR
df_final['ECR > 1MVA Already connected'] = df_final['ECR > 1MVA Already connected'].fillna(0).astype(float)
df_final['ECR > 1MVA Accepted to connect'] = df_final['ECR > 1MVA Accepted to connect'].fillna(0).astype(float)
df_final['Grid Supply Point'] = df_final['Grid Supply Point'].fillna('')
df_final['Bulk Supply Point'] = df_final['Bulk Supply Point'].fillna('')

# Check merge results
matched_sites = df_final['ECR > 1MVA Already connected'].gt(0).sum() + df_final['ECR > 1MVA Accepted to connect'].gt(0).sum()
print(f"Sites with ECR > 1MVA data found: {matched_sites}")
print(f"Sites without ECR > 1MVA data: {len(df_final) - matched_sites}")

# ============================================================================
# EMBEDDED CAPACITY REGISTER UNDER 1MW DATA INTEGRATION - UPDATED WITH CONNECTION STATUS LOGIC
# ============================================================================

print("\n" + "="*50)
print("STARTING ECR < 1MVA DATA INTEGRATION - WITH CONNECTION STATUS LOGIC")
print("="*50)

# Fetch data from ukpn_embedded_capacity_register_1_under_1mw table WITH Connection Status
print("Fetching data from ukpn_embedded_capacity_register_1_under_1mw table...")
try:
    ecr_under1mw_query = """
        SELECT 
            "sitefunctionallocation",
            "already_connected_registered_capacity_mw",
            "accepted_to_connect_registered_capacity_mw",
            "connection_status",
            "grid_supply_point",
            "bulk_supply_point"
        FROM ukpn_embedded_capacity_register_1_under_1mw
        """
    df_ecr_under1mw = pd.read_sql_query(ecr_under1mw_query, engine)
    print(f"Successfully fetched {len(df_ecr_under1mw)} records from ukpn_embedded_capacity_register_1_under_1mw")
except Exception as e:
    print(f"Error fetching ECR under 1MW data: {e}")
    print("Cannot proceed without data from ukpn_embedded_capacity_register_1_under_1mw table.")
    exit(1)
print(f"Retrieved {len(df_ecr_under1mw)} records from ukpn_embedded_capacity_register_1_under_1mw")

# Track ECR under 1MW database columns
track_database_columns(df_ecr_under1mw, 'ukpn_embedded_capacity_register_1_under_1mw')

# Clean and convert capacity columns to numeric
df_ecr_under1mw["already_connected_registered_capacity_mw"] = pd.to_numeric(
    df_ecr_under1mw["already_connected_registered_capacity_mw"], errors='coerce'
).fillna(0)

df_ecr_under1mw["accepted_to_connect_registered_capacity_mw"] = pd.to_numeric(
    df_ecr_under1mw["accepted_to_connect_registered_capacity_mw"], errors='coerce'
).fillna(0)

# Clean Connection Status column
df_ecr_under1mw["connection_status"] = df_ecr_under1mw["connection_status"].fillna("").str.strip()

print(f"Debug: ECR < 1MVA Connection Status values found: {df_ecr_under1mw['connection_status'].value_counts()}")

# Group by sitefunctionallocation and apply the same aggregation logic
print("Aggregating ECR < 1MVA data by sitefunctionallocation with Connection Status logic...")
ecr_under1mw_aggregated = df_ecr_under1mw.groupby('sitefunctionallocation').apply(aggregate_ecr_with_status_logic).reset_index()

# Rename columns for clarity
ecr_under1mw_aggregated = ecr_under1mw_aggregated.rename(columns={
    'Already connected sum': 'ECR < 1MVA Already connected',
    'Accepted to Connect sum': 'ECR < 1MVA Accepted to connect',
    'Grid Supply Point': 'Grid Supply Point Under 1MW',
    'Bulk Supply Point': 'Bulk Supply Point Under 1MW'
})

print(f"Aggregated to {len(ecr_under1mw_aggregated)} unique sitefunctionallocations")

# Debug: Show some examples of the aggregation
print("\nDebug: Sample aggregated ECR < 1MVA data:")
sample_sites = ecr_under1mw_aggregated.head(5)
for _, row in sample_sites.iterrows():
    print(f"Site: {row['sitefunctionallocation']}")
    print(f"  Already Connected: {row['ECR < 1MVA Already connected']:.2f} MW")
    print(f"  Accepted to Connect: {row['ECR < 1MVA Accepted to connect']:.2f} MW")

# Track aggregated ECR < 1MVA columns with updated descriptions
track_aggregated_column('ECR < 1MVA Already connected', 'ukpn_embedded_capacity_register_1_under_1mw', 
                       'SUM of Already connected Registered Capacity (MW) WHERE Connection Status = "Connected" OR blank/null')
track_aggregated_column('ECR < 1MVA Accepted to connect', 'ukpn_embedded_capacity_register_1_under_1mw', 
                       'SUM of Accepted to Connect Registered Capacity (MW) WHERE Connection Status = "Accepted to Connect" OR blank/null')

# Merge with current final data
print("Merging ECR < 1MVA data with existing data...")
df_final = df_final.merge(
    ecr_under1mw_aggregated, 
    on='sitefunctionallocation', 
    how='left'
)

# Fill missing values for sites not found in ECR under 1MW
df_final['ECR < 1MVA Already connected'] = df_final['ECR < 1MVA Already connected'].fillna(0).astype(float)
df_final['ECR < 1MVA Accepted to connect'] = df_final['ECR < 1MVA Accepted to connect'].fillna(0).astype(float)
df_final['Grid Supply Point Under 1MW'] = df_final['Grid Supply Point Under 1MW'].fillna('')
df_final['Bulk Supply Point Under 1MW'] = df_final['Bulk Supply Point Under 1MW'].fillna('')

# Check merge results
matched_sites_under1mw = df_final['ECR < 1MVA Already connected'].gt(0).sum() + df_final['ECR < 1MVA Accepted to connect'].gt(0).sum()
print(f"Sites with ECR < 1MVA data found: {matched_sites_under1mw}")
print(f"Sites without ECR < 1MVA data: {len(df_final) - matched_sites_under1mw}")

# Print final statistics with both ECR integrations using Connection Status logic
print(f"\n" + "="*50)
print("ECR INTEGRATION WITH CONNECTION STATUS LOGIC - SUMMARY")
print("="*50)
print(f"Total records in final dataset: {len(df_final)}")
print(f"Records with ECR > 1MVA 'Already connected' data: {df_final['ECR > 1MVA Already connected'].gt(0).sum()}")
print(f"Records with ECR > 1MVA 'Accepted to connect' data: {df_final['ECR > 1MVA Accepted to connect'].gt(0).sum()}")
print(f"Records with ECR < 1MVA 'Already connected' data: {df_final['ECR < 1MVA Already connected'].gt(0).sum()}")
print(f"Records with ECR < 1MVA 'Accepted to connect' data: {df_final['ECR < 1MVA Accepted to connect'].gt(0).sum()}")

# Show some statistics about ECR values with new logic
print(f"\nECR Statistics with Connection Status Logic:")
print(f"Total ECR > 1MVA 'Already connected' capacity: {df_final['ECR > 1MVA Already connected'].sum():.2f} MW")
print(f"Total ECR > 1MVA 'Accepted to connect' capacity: {df_final['ECR > 1MVA Accepted to connect'].sum():.2f} MW")
print(f"Total ECR < 1MVA 'Already connected' capacity: {df_final['ECR < 1MVA Already connected'].sum():.2f} MW")
print(f"Total ECR < 1MVA 'Accepted to connect' capacity: {df_final['ECR < 1MVA Accepted to connect'].sum():.2f} MW")

# Show sample of final data with ECR columns
print("\nSample of final data with ECR columns using Connection Status logic (first 5 rows):")
ecr_sample_cols = [
    'sitefunctionallocation', 
    'ECR > 1MVA Already connected', 
    'ECR > 1MVA Accepted to connect',
    'ECR < 1MVA Already connected', 
    'ECR < 1MVA Accepted to connect'
]
print(df_final[ecr_sample_cols].head(5).to_string())

# Save the data with Connection Status logic applied
df_final.to_csv(output_file, index=False)
print(f"\nData with Connection Status logic applied saved to: {output_file}")

print("ECR data integration with Connection Status logic completed successfully!")

# Show sample of final data with new ECR columns
print("\nSample of final data with ECR columns (first 5 rows):")
ecr_sample_cols = ['sitefunctionallocation', 'ECR > 1MVA Already connected', 'ECR > 1MVA Accepted to connect', 'Grid Supply Point', 'Bulk Supply Point']
print(df_final[ecr_sample_cols].head(5).to_string())

# Show some statistics about ECR values
print(f"\nECR Statistics:")
print(f"Total 'Already connected' capacity: {df_final['ECR > 1MVA Already connected'].sum()} MW")
print(f"Total 'Accepted to connect' capacity: {df_final['ECR > 1MVA Accepted to connect'].sum()} MW")
print(f"Average 'Already connected' per site: {df_final['ECR > 1MVA Already connected'].mean():.2f} MW")
print(f"Average 'Accepted to connect' per site: {df_final['ECR > 1MVA Accepted to connect'].mean():.2f} MW")

# Show sample of final data with new ECR < 1MVA columns
print("\nSample of final data with ECR < 1MVA columns (first 5 rows):")
ecr_under1mw_sample_cols = ['sitefunctionallocation', 'ECR < 1MVA Already connected', 'ECR < 1MVA Accepted to connect', 'Grid Supply Point Under 1MW', 'Bulk Supply Point Under 1MW']
print(df_final[ecr_under1mw_sample_cols].head(5).to_string())

# Show some statistics about ECR < 1MVA values
print(f"\nECR < 1MVA Statistics:")
print(f"Total 'Already connected' capacity: {df_final['ECR < 1MVA Already connected'].sum()} MW")
print(f"Total 'Accepted to connect' capacity: {df_final['ECR < 1MVA Accepted to connect'].sum()} MW")
print(f"Average 'Already connected' per site: {df_final['ECR < 1MVA Already connected'].mean():.2f} MW")
print(f"Average 'Accepted to connect' per site: {df_final['ECR < 1MVA Accepted to connect'].mean():.2f} MW")
# ============================================================================
# CALCULATE TOTAL GENERATION COLUMNS
# ============================================================================

print("\n" + "="*50)
print("CALCULATING TOTAL GENERATION COLUMNS")
print("="*50)

# Calculate Total Gen <1 (MW) = Sum of ECR < 1MVA Already connected + ECR < 1MVA Accepted to connect
df_final['Total Gen <1 (MW)'] = (
    df_final['ECR < 1MVA Already connected'] + 
    df_final['ECR < 1MVA Accepted to connect']
)

# Calculate Total Gen >1 (MW) = Sum of ECR > 1MVA Already connected + ECR > 1MVA Accepted to connect  
df_final['Total Gen >1 (MW)'] = (
    df_final['ECR > 1MVA Already connected'] + 
    df_final['ECR > 1MVA Accepted to connect']
)

# Calculate Total_ECR_Capacity = Sum of Total Gen <1 (MW) + Total Gen >1 (MW)
df_final['Total_ECR_Capacity'] = (
    df_final['Total Gen <1 (MW)'] + 
    df_final['Total Gen >1 (MW)']
)

# Track the new calculated columns
track_calculated_column('Total Gen <1 (MW)', 'Total generation capacity under 1MW', 'ECR < 1MVA Already connected + ECR < 1MVA Accepted to connect')
track_calculated_column('Total Gen >1 (MW)', 'Total generation capacity over 1MW', 'ECR > 1MVA Already connected + ECR > 1MVA Accepted to connect')
track_calculated_column('Total_ECR_Capacity', 'Total ECR capacity', 'Total Gen <1 (MW) + Total Gen >1 (MW)')

print("Total Generation columns calculated successfully!")
print(f"Total Gen <1 (MW) statistics:")
print(f"  Total: {df_final['Total Gen <1 (MW)'].sum():.2f} MW")
print(f"  Mean: {df_final['Total Gen <1 (MW)'].mean():.2f} MW")
print(f"  Min: {df_final['Total Gen <1 (MW)'].min():.2f} MW")
print(f"  Max: {df_final['Total Gen <1 (MW)'].max():.2f} MW")
print(f"  Non-zero values: {df_final['Total Gen <1 (MW)'].gt(0).sum()}")

print(f"Total Gen >1 (MW) statistics:")
print(f"  Total: {df_final['Total Gen >1 (MW)'].sum():.2f} MW")
print(f"  Mean: {df_final['Total Gen >1 (MW)'].mean():.2f} MW")
print(f"  Min: {df_final['Total Gen >1 (MW)'].min():.2f} MW")
print(f"  Max: {df_final['Total Gen >1 (MW)'].max():.2f} MW")
print(f"  Non-zero values: {df_final['Total Gen >1 (MW)'].gt(0).sum()}")

print(f"Total_ECR_Capacity statistics:")
print(f"  Total: {df_final['Total_ECR_Capacity'].sum():.2f} MW")
print(f"  Mean: {df_final['Total_ECR_Capacity'].mean():.2f} MW")
print(f"  Min: {df_final['Total_ECR_Capacity'].min():.2f} MW")
print(f"  Max: {df_final['Total_ECR_Capacity'].max():.2f} MW")
print(f"  Non-zero values: {df_final['Total_ECR_Capacity'].gt(0).sum()}")

# Show sample of Total Generation columns
print("\nSample of Total Generation columns (first 5 rows):")
total_gen_sample_cols = [
    'sitefunctionallocation',
    'ECR < 1MVA Already connected', 
    'ECR < 1MVA Accepted to connect',
    'Total Gen <1 (MW)',
    'ECR > 1MVA Already connected', 
    'ECR > 1MVA Accepted to connect',
    'Total Gen >1 (MW)',
    'Total_ECR_Capacity'
]
print(df_final[total_gen_sample_cols].head(5).to_string())

# ============================================================================
# CONSOLIDATE GRID AND BULK SUPPLY POINT COLUMNS
# ============================================================================

print("\n" + "="*50)
print("CONSOLIDATING SUPPLY POINT COLUMNS")
print("="*50)

# Consolidate Grid Supply Point and Bulk Supply Point columns
# The ECR > 1MVA integration already added 'Grid Supply Point' and 'Bulk Supply Point' columns
# The ECR < 1MVA integration added 'Grid Supply Point Under 1MW' and 'Bulk Supply Point Under 1MW' columns
# We need to consolidate these using OR condition: if data is present in either, use it
# If both have data and they don't match, use > 1MVA value (which is already in the main columns)

# Create consolidated columns by filling empty values from the Under 1MW columns
df_final['Grid Supply Point'] = df_final.apply(
    lambda row: (
        row['Grid Supply Point'] if pd.notna(row['Grid Supply Point']) and row['Grid Supply Point'] != ''
        else row['Grid Supply Point Under 1MW'] if pd.notna(row['Grid Supply Point Under 1MW']) and row['Grid Supply Point Under 1MW'] != ''
        else None
    ), axis=1
)

df_final['Bulk Supply Point'] = df_final.apply(
    lambda row: (
        row['Bulk Supply Point'] if pd.notna(row['Bulk Supply Point']) and row['Bulk Supply Point'] != ''
        else row['Bulk Supply Point Under 1MW'] if pd.notna(row['Bulk Supply Point Under 1MW']) and row['Bulk Supply Point Under 1MW'] != ''
        else None
    ), axis=1
)

# Drop the temporary Under 1MW columns as they're now consolidated
df_final = df_final.drop(columns=[
    'Grid Supply Point Under 1MW',
    'Bulk Supply Point Under 1MW'
])

print("Grid Supply Point and Bulk Supply Point columns consolidated successfully!")
print(f"Grid Supply Point - Non-null values: {df_final['Grid Supply Point'].notna().sum()}")
print(f"Bulk Supply Point - Non-null values: {df_final['Bulk Supply Point'].notna().sum()}")

# ============================================================================
# GENERATION HEADROOM CALCULATION
# ============================================================================

print("\n" + "="*50)
print("CALCULATING GENERATION HEADROOM")
print("="*50)

# Calculate Generation Headroom = Sum of all ECR values - Generation Capacity
df_final['Generation_Headroom_MW'] = df_final['Generation_Capacity'] - (
    df_final['ECR > 1MVA Already connected'] + 
    df_final['ECR > 1MVA Accepted to connect'] + 
    df_final['ECR < 1MVA Already connected'] + 
    df_final['ECR < 1MVA Accepted to connect']
)

# Track Generation Headroom calculation
track_calculated_column('Generation_Headroom_MW', 'Generation headroom calculation', 'Generation_Capacity - (ECR > 1MVA Already connected + ECR > 1MVA Accepted to connect + ECR < 1MVA Already connected + ECR < 1MVA Accepted to connect)')

print("Generation Headroom calculation completed!")
print(f"Generation Headroom statistics:")
print(f"  Mean: {df_final['Generation_Headroom_MW'].mean():.2f} MW")
print(f"  Min: {df_final['Generation_Headroom_MW'].min():.2f} MW")
print(f"  Max: {df_final['Generation_Headroom_MW'].max():.2f} MW")
print(f"  Std: {df_final['Generation_Headroom_MW'].std():.2f} MW")

# Show sample of Generation Headroom calculation
print("\nSample of Generation Headroom calculation (first 5 rows):")
headroom_sample_cols = [
    'sitefunctionallocation', 
    'ECR > 1MVA Already connected', 
    'ECR > 1MVA Accepted to connect', 
    'ECR < 1MVA Already connected', 
    'ECR < 1MVA Accepted to connect',
    'Generation_Capacity',
    'Generation_Headroom_MW'
]
print(df_final[headroom_sample_cols].head(5).to_string())

# ============================================================================
# INSTALLED CAPACITY MVA DATA INTEGRATION
# ============================================================================

print("\n" + "="*50)
print("STARTING INSTALLED CAPACITY MVA DATA INTEGRATION")
print("="*50)

# Fetch data from ltds_table_5_generation table
print("Fetching data from ltds_table_5_generation table...")
try:
    ltds_query = """
        SELECT 
            "sitefunctionallocation",
            "installedcapacity_mva"
        FROM ltds_table_5_generation
        WHERE "installedcapacity_mva" IS NOT NULL
        """
    df_ltds = pd.read_sql_query(ltds_query, engine)
    print(f"Successfully fetched {len(df_ltds)} records from ltds_table_5_generation")
except Exception as e:
    print(f"Error fetching LTDS data: {e}")
    print("Cannot proceed without data from ltds_table_5_generation table.")
    exit(1)
print(f"Retrieved {len(df_ltds)} records from ltds_table_5_generation")

# Track LTDS database columns
track_database_columns(df_ltds, 'ltds_table_5_generation')

# Clean and convert InstalledCapacity_MVA to numeric
df_ltds["installedcapacity_mva"] = pd.to_numeric(
    df_ltds["installedcapacity_mva"], errors='coerce'
).fillna(0)

# Fix spatial coordinates format from JSON to "lat, lon" string
def format_spatial_coordinates(coord_str):
    """Convert spatial coordinates from JSON format to 'lat, lon' string format"""
    if pd.isna(coord_str) or coord_str == '':
        return ''
    
    try:
        import json
        coord_dict = json.loads(coord_str)
        if 'lat' in coord_dict and 'lon' in coord_dict:
            return f"{coord_dict['lat']}, {coord_dict['lon']}"
    except (json.JSONDecodeError, TypeError, KeyError):
        pass
    
    return coord_str

# Apply spatial coordinates formatting to the main dataframe
if 'spatial_coordinates' in df_final.columns:
    print("Formatting spatial coordinates from JSON to 'lat, lon' format...")
    df_final['spatial_coordinates'] = df_final['spatial_coordinates'].apply(format_spatial_coordinates)
    print("Spatial coordinates formatting completed!")

# Remove records where InstalledCapacity_MVA is 0 after conversion
df_ltds = df_ltds[df_ltds["installedcapacity_mva"] > 0]
print(f"Records with valid InstalledCapacity_MVA > 0: {len(df_ltds)}")

# Function to normalize sitefunctionallocation (remove hyphens for matching)
def normalize_site_location(site_loc):
    if pd.isna(site_loc):
        return ""
    return str(site_loc).replace("-", "").strip().upper()

# Enhanced function to find LTDS matches with multiple strategies
def find_ltds_match(site_loc, ltds_df):
    """Find LTDS data for a site using multiple matching strategies"""
    if pd.isna(site_loc) or site_loc == '':
        return None
    
    site_clean = str(site_loc).strip()
    site_normalized = normalize_site_location(site_loc)
    
    # Strategy 1: Exact match
    exact_match = ltds_df[ltds_df['sitefunctionallocation'] == site_clean]
    if len(exact_match) > 0:
        return exact_match.iloc[0]['installedcapacity_mva']
    
    # Strategy 2: Normalized match
    normalized_match = ltds_df[ltds_df['sitefunctionallocation_normalized'] == site_normalized]
    if len(normalized_match) > 0:
        return normalized_match.iloc[0]['installedcapacity_mva']
    
    # Strategy 3: Partial match (contains)
    partial_matches = ltds_df[ltds_df['sitefunctionallocation'].str.contains(site_clean, case=False, na=False)]
    if len(partial_matches) > 0:
        return partial_matches.iloc[0]['installedcapacity_mva']
    
    # Strategy 4: Reverse partial match (site contains LTDS)
    reverse_matches = ltds_df[ltds_df['sitefunctionallocation'].apply(lambda x: site_clean in str(x) if pd.notna(x) else False)]
    if len(reverse_matches) > 0:
        return reverse_matches.iloc[0]['installedcapacity_mva']
    
    return None

# Create normalized columns for matching
df_ltds['sitefunctionallocation_normalized'] = df_ltds['sitefunctionallocation'].apply(normalize_site_location)
df_final['sitefunctionallocation_normalized'] = df_final['sitefunctionallocation'].apply(normalize_site_location)

# Group by normalized sitefunctionallocation and sum InstalledCapacity_MVA
print("Aggregating LTDS data by normalized sitefunctionallocation...")
ltds_aggregated = df_ltds.groupby('sitefunctionallocation_normalized').agg({
    'installedcapacity_mva': 'sum',
    'sitefunctionallocation': 'first'  # Keep original format for reference
}).reset_index()

print(f"Aggregated to {len(ltds_aggregated)} unique normalized sitefunctionallocations")
print(f"Total InstalledCapacity_MVA in LTDS data: {ltds_aggregated['installedcapacity_mva'].sum():.2f} MVA")

# Track aggregated LTDS column
track_aggregated_column('installedcapacity_mva', 'ltds_table_5_generation', 'SUM of installedcapacity_mva')

# Merge with final data using normalized locations
print("Merging LTDS data with existing data...")
df_final = df_final.merge(
    ltds_aggregated[['sitefunctionallocation_normalized', 'installedcapacity_mva']], 
    on='sitefunctionallocation_normalized', 
    how='left'
)

# Fill missing values with 0 for sites not found in LTDS
df_final['installedcapacity_mva'] = df_final['installedcapacity_mva'].fillna(0).astype(float)

# Enhanced matching for sites that didn't match in the regular merge
print("Performing enhanced matching for sites with missing InstalledCapacity_MVA...")
enhanced_matches = 0
for idx, row in df_final.iterrows():
    if row['installedcapacity_mva'] == 0:  # Only check sites with no LTDS data
        enhanced_capacity = find_ltds_match(row['sitefunctionallocation'], df_ltds)
        if enhanced_capacity is not None and enhanced_capacity > 0:
            df_final.at[idx, 'installedcapacity_mva'] = enhanced_capacity
            enhanced_matches += 1
            print(f"Enhanced match found: {row['sitefunctionallocation']} -> {enhanced_capacity} MVA")

print(f"Enhanced matching completed: {enhanced_matches} additional matches found")

# Drop the temporary normalized column
df_final = df_final.drop('sitefunctionallocation_normalized', axis=1)

# Check merge results
sites_with_ltds_data = df_final['installedcapacity_mva'].gt(0).sum()
sites_without_ltds_data = len(df_final) - sites_with_ltds_data

print(f"Sites with LTDS InstalledCapacity_MVA data: {sites_with_ltds_data}")
print(f"Sites without LTDS InstalledCapacity_MVA data: {sites_without_ltds_data}")

# Print statistics about InstalledCapacity_MVA
print(f"\nInstalled Capacity MVA Statistics:")
print(f"  Total: {df_final['installedcapacity_mva'].sum():.2f} MVA")
print(f"  Mean: {df_final['installedcapacity_mva'].mean():.2f} MVA")
print(f"  Min: {df_final['installedcapacity_mva'].min():.2f} MVA")
print(f"  Max: {df_final['installedcapacity_mva'].max():.2f} MVA")
print(f"  Non-zero values: {df_final['installedcapacity_mva'].gt(0).sum()}")

# ============================================================================
# DEVIATION CALCULATION BETWEEN INSTALLED CAPACITY AND TOTAL GENERATION
# ============================================================================

print("\n" + "="*50)
print("CALCULATING DEVIATION BETWEEN INSTALLED CAPACITY AND TOTAL GENERATION")
print("="*50)

# Calculate percentage deviation directly without creating intermediate columns Aryan Changes
# Deviation % = |installedcapacity_mva - Max(Total Gen <1, Total Gen >1)| / installedcapacity_mva * 100
# Handle cases where installedcapacity_mva is 0 to avoid division by zero
# df_final['Deviation_Percentage'] = df_final.apply(
#     lambda row: (
#         abs(row['installedcapacity_mva'] - max(row['Total Gen <1 (MW)'], row['Total Gen >1 (MW)'])) / row['installedcapacity_mva'] * 100
#         if row['installedcapacity_mva'] > 0
#         else 0
#     ), axis=1
# )
df_final['Deviation_Percentage'] = df_final.apply(
    lambda row: round(
        abs(row['installedcapacity_mva'] - max(row['Total Gen <1 (MW)'], row['Total Gen >1 (MW)'])) / row['installedcapacity_mva'] * 100,
        2
    ) if row['installedcapacity_mva'] > 0 else 0,
    axis=1
)



# Create Deviation flag: "Yes" if deviation > 5%, "No" if deviation <= 5%
df_final['Deviation'] = df_final['Deviation_Percentage'].apply(
    lambda x: "Yes" if x > 5.0 else "No"
)

# Track the new calculated columns
track_calculated_column('Deviation_Percentage', 'Percentage deviation between Installed Capacity MVA and Max Total Gen', '|installedcapacity_mva - MAX(Total Gen <1 (MW), Total Gen >1 (MW))| / installedcapacity_mva * 100')
track_calculated_column('Deviation', 'Deviation flag (Yes if >5%, No if <=5%)', 'Yes if Deviation_Percentage > 5%, else No')

print("Deviation calculation completed!")

# Show statistics for deviation analysis
deviation_stats = df_final['Deviation'].value_counts()
print(f"\nDeviation Analysis Results:")
print(f"  Records with deviation >5% (Yes): {deviation_stats.get('Yes', 0)}")
print(f"  Records with deviation <=5% (No): {deviation_stats.get('No', 0)}")
print(f"  Total records analyzed: {len(df_final)}")

# Show statistics for deviation percentage
records_with_installed_capacity = df_final['installedcapacity_mva'].gt(0).sum()
print(f"\nDeviation Percentage Statistics (for records with installedcapacity_mva > 0):")
if records_with_installed_capacity > 0:
    deviation_subset = df_final[df_final['installedcapacity_mva'] > 0]['Deviation_Percentage']
    print(f"  Records with Installed Capacity > 0: {records_with_installed_capacity}")
    print(f"  Mean deviation: {deviation_subset.mean():.2f}%")
    print(f"  Min deviation: {deviation_subset.min():.2f}%")
    print(f"  Max deviation: {deviation_subset.max():.2f}%")
    print(f"  Median deviation: {deviation_subset.median():.2f}%")
else:
    print("  No records with installedcapacity_mva > 0 found")

# Show sample of final data with installedcapacity_mva and deviation analysis
print("\nSample of final data with Deviation analysis (first 5 rows):")
installed_capacity_sample_cols = [
    'sitefunctionallocation', 
    'installedcapacity_mva',
    'Total Gen <1 (MW)',
    'Total Gen >1 (MW)',
    'Deviation_Percentage',
    'Deviation'
]
print(df_final[installed_capacity_sample_cols].head(5).to_string())

# Show examples of high deviation records
high_deviation_records = df_final[df_final['Deviation'] == 'Yes']
if len(high_deviation_records) > 0:
    print(f"\nSample of records with high deviation (>5%) - showing first 3:")
    print(high_deviation_records[installed_capacity_sample_cols].head(3).to_string())
else:
    print(f"\nNo records found with deviation >5%")

# ============================================================================
# DNOA DATA INTEGRATION
# ============================================================================

print("\n" + "="*50)
print("STARTING DNOA DATA INTEGRATION")
print("="*50)
print("REVERSED LOGIC: Adding DNOA columns to all records, filling empty where no match")
print("This will preserve all records and add DNOA data where matches are found")

# Fetch data from ukpn_dnoa table
print("Fetching data from ukpn_dnoa table...")
try:
    dnoa_query = """
        SELECT 
            "functional_location",
            "substation_title",
            "constraint_description",
            "traditional_solution",
            "constraint_season",
            "customers_served",
            "dnoa_result",
            "dnoa_result_description",
            "dnoa_result_history_2023",
            "dnoa_result_history_2024",
            "dnoa_result_history_2025",
            "flexibility_procurement_2024_25",
            "flexibility_procurement_2025_26",
            "flexibility_procurement_2026_27",
            "flexibility_procurement_2027_28",
            "flexibility_procurement_2028_29",
            "constraint_occurrence_year",
            "current_status",
            "type",
            "site"
        FROM ukpn_dnoa
        """
    df_dnoa = pd.read_sql_query(dnoa_query, engine)
    print(f"Successfully fetched {len(df_dnoa)} records from ukpn_dnoa")
except Exception as e:
    print(f"Error fetching DNOA data: {e}")
    print("Cannot proceed without data from ukpn_dnoa table.")
    exit(1)
print(f"Retrieved {len(df_dnoa)} records from ukpn_dnoa")

# Track DNOA database columns
track_database_columns(df_dnoa, 'ukpn_dnoa')

# Rename the column to match the main dataframe
df_dnoa = df_dnoa.rename(columns={'functional_location': 'sitefunctionallocation'})

# Track the renamed column
column_tracking['renamed_columns']['sitefunctionallocation'] = 'Functional Location'

# Check for multiple records per sitefunctionallocation (only for non-empty values)
non_empty_fl = df_dnoa[df_dnoa['sitefunctionallocation'].notna() & (df_dnoa['sitefunctionallocation'] != '')]
if len(non_empty_fl) > 0:
    dnoa_counts = non_empty_fl['sitefunctionallocation'].value_counts()
    multiple_records = dnoa_counts[dnoa_counts > 1]
    if len(multiple_records) > 0:
        print(f"Found {len(multiple_records)} non-empty sitefunctionallocations with multiple DNOA records")
        print("Note: Keeping all records since we need both Functional Location and Substation Title matching")
    else:
        print("All non-empty sitefunctionallocations have unique DNOA records")
else:
    print("No non-empty sitefunctionallocations found")

print(f"Total DNOA records to process: {len(df_dnoa)}")

# REVERSED LOGIC: Two-step matching process
print("Merging DNOA data with existing data...")
print("LOGIC: Step 1 - Match Functional Location, Step 2 - Fuzzy match Substation Title with sitename")

# Check if 'Site' column exists in DNOA (this might be the Substation Title)
print("DEBUG: DNOA columns available:", df_dnoa.columns.tolist())

# Debug: Show sample of DNOA data to understand the structure
print("\nDEBUG: Sample DNOA data:")
sample_columns = ['sitefunctionallocation', 'substation_title', 'constraint_description', 'type']
if all(col in df_dnoa.columns for col in sample_columns):
    print(df_dnoa[sample_columns].head(10).to_string())
else:
    print("Available columns:", df_dnoa.columns.tolist())

# Check if there are null/empty Functional Locations
null_functional_locations = df_dnoa['sitefunctionallocation'].isna().sum()
empty_functional_locations = (df_dnoa['sitefunctionallocation'] == '').sum()
print(f"\nDEBUG: Null Functional Locations: {null_functional_locations}")
print(f"DEBUG: Empty Functional Locations: {empty_functional_locations}")

# Show unique values in Substation Title column
if 'substation_title' in df_dnoa.columns:
    print(f"\nDEBUG: Sample 'substation_title' values:")
    substation_titles = df_dnoa['substation_title'].dropna().value_counts().head(10)
    print(substation_titles)
else:
    print(f"\nDEBUG: 'substation_title' column not found!")

# Initialize DNOA columns in the main dataframe
dnoa_columns = [
    'substation_title', 'constraint_description', 'traditional_solution', 'constraint_season',
    'customers_served', 'dnoa_result', 'dnoa_result_description', 'dnoa_result_history_2023',
    'dnoa_result_history_2024', 'dnoa_result_history_2025', 'flexibility_procurement_2024_25',
    'flexibility_procurement_2025_26', 'flexibility_procurement_2026_27', 'flexibility_procurement_2027_28',
    'flexibility_procurement_2028_29', 'constraint_occurrence_year', 'current_status', 'type', 'site'
]

for col in dnoa_columns:
    if col in df_dnoa.columns:
        df_final[col] = None

print(f"Initialized {len(dnoa_columns)} DNOA columns in main dataframe")

# First-word prioritized matching function
def comprehensive_site_matching(dnoa_site, df_final_sites, min_keyword_length=3):
    """
    Multi-strategy matching prioritizing first word as main location identifier:
    1. Exact match
    2. First word match (highest priority)
    3. Substring matching
    4. Multi-keyword matching (as backup)
    5. Number/code matching
    6. High-threshold fuzzy matching
    """
    if pd.isna(dnoa_site) or dnoa_site == '':
        return None, 0, 'no_input'
    
    dnoa_site_clean = str(dnoa_site).strip().upper()
    print(f"DEBUG: Trying to match DNOA site: '{dnoa_site}'")
    
    # Extract first meaningful word from DNOA site
    dnoa_words = re.findall(r'\b[A-Z]+\b', dnoa_site_clean)
    common_prefixes = {'THE', 'A', 'AN'}  # Very common words to skip
    dnoa_first_word = None
    
    for word in dnoa_words:
        if len(word) >= 3 and word not in common_prefixes:  # First meaningful word
            dnoa_first_word = word
            break
    
    print(f"DEBUG: DNOA first word identified: '{dnoa_first_word}'")
    
    best_match = None
    best_score = 0
    match_method = None
    
    for final_site in df_final_sites:
        if pd.isna(final_site) or final_site == '':
            continue
            
        final_site_clean = str(final_site).strip().upper()
        
        # Strategy 1: Exact match (case insensitive)
        if dnoa_site_clean == final_site_clean:
            return final_site, 1.0, 'exact_match'
        
        # Strategy 2: First word match (HIGHEST PRIORITY)
        if dnoa_first_word:
            final_words = re.findall(r'\b[A-Z]+\b', final_site_clean)
            final_first_word = None
            
            for word in final_words:
                if len(word) >= 3 and word not in common_prefixes:
                    final_first_word = word
                    break
            
            if final_first_word and dnoa_first_word == final_first_word:
                # Perfect first word match - give high score
                first_word_score = 0.9
                
                # Bonus if it appears at the beginning of the string
                if final_site_clean.startswith(final_first_word):
                    first_word_score = 0.95
                
                # Additional small bonus for other word matches
                dnoa_other_words = set(dnoa_words[1:]) if len(dnoa_words) > 1 else set()
                final_other_words = set(final_words[1:]) if len(final_words) > 1 else set()
                
                if dnoa_other_words and final_other_words:
                    common_other_words = dnoa_other_words & final_other_words
                    if common_other_words:
                        first_word_score += 0.05  # Small bonus for additional matches
                
                if first_word_score > best_score:
                    best_match = final_site
                    best_score = first_word_score
                    match_method = f'first_word_match_{dnoa_first_word}'
                    print(f"DEBUG: First word match found - '{dnoa_first_word}' in both '{dnoa_site}' and '{final_site}'")
        
        # Strategy 3: Full substring match (lower priority than first word)
        if dnoa_site_clean in final_site_clean:
            score = len(dnoa_site_clean) / len(final_site_clean) * 0.7  # Reduce weight
            if score > best_score:
                best_match = final_site
                best_score = score
                match_method = 'substring_dnoa_in_final'
        elif final_site_clean in dnoa_site_clean:
            score = len(final_site_clean) / len(dnoa_site_clean) * 0.7  # Reduce weight
            if score > best_score:
                best_match = final_site
                best_score = score
                match_method = 'substring_final_in_dnoa'
        
        # Strategy 4: Multi-keyword matching (backup for complex cases)
        common_words = {'THE', 'AND', 'OR', 'OF', 'IN', 'AT', 'TO', 'FOR', 'WITH', 'BY', 'FROM', 'ON', 
                       'MILL', 'HILL', 'ROAD', 'STREET', 'LANE', 'AVENUE', 'DRIVE', 'CLOSE', 'WAY',
                       'PRIMARY', 'SECONDARY', 'SUBSTATION', 'STATION', 'SUB', 'STN',
                       'KV', 'KILOVOLT', '33', '11', '132', '275', '400', '66', '22'}
        
        dnoa_all_words = set(re.findall(r'\b[A-Z]+\b', dnoa_site_clean))
        final_all_words = set(re.findall(r'\b[A-Z]+\b', final_site_clean))
        
        dnoa_keywords = {word for word in dnoa_all_words if len(word) >= min_keyword_length and word not in common_words}
        final_keywords = {word for word in final_all_words if len(word) >= min_keyword_length and word not in common_words}
        
        if dnoa_keywords and final_keywords:
            matching_keywords = dnoa_keywords & final_keywords
            if len(matching_keywords) >= 2:  # Require at least 2 keyword matches
                keyword_score = len(matching_keywords) / max(len(dnoa_keywords), len(final_keywords))
                keyword_score *= 0.6  # Lower weight than first word match
                
                if keyword_score > best_score:
                    best_match = final_site
                    best_score = keyword_score
                    match_method = f'multi_keyword_match_{list(matching_keywords)}'
        
        # Strategy 5: Number/code matching
        dnoa_numbers = set(re.findall(r'\b\d+\b', dnoa_site_clean))
        final_numbers = set(re.findall(r'\b\d+\b', final_site_clean))
        
        if dnoa_numbers and final_numbers:
            matching_numbers = dnoa_numbers & final_numbers
            if matching_numbers and len(matching_numbers) >= 1:
                text_similarity = SequenceMatcher(None, dnoa_site_clean, final_site_clean).ratio()
                if text_similarity > 0.3:
                    number_score = (len(matching_numbers) / max(len(dnoa_numbers), len(final_numbers))) * 0.4 + text_similarity * 0.2
                    if number_score > best_score:
                        best_match = final_site
                        best_score = number_score
                        match_method = f'number_text_match_{list(matching_numbers)}'
        
        # Strategy 6: High-threshold fuzzy matching (last resort)
        fuzzy_similarity = SequenceMatcher(None, dnoa_site_clean, final_site_clean).ratio()
        if fuzzy_similarity > 0.8 and fuzzy_similarity > best_score:  # Very high threshold
            best_match = final_site
            best_score = fuzzy_similarity * 0.5  # Lower weight
            match_method = 'fuzzy_high_threshold'
    
    if best_match and best_score > 0.1:
        print(f"DEBUG: Match found - '{dnoa_site}' -> '{best_match}' (Method: {match_method}, Score: {best_score:.3f})")
        return best_match, best_score, match_method
    
    print(f"DEBUG: No match found for '{dnoa_site}'")
    return None, 0, 'no_match'

# DNOA columns are already initialized above - no need to duplicate

# Track matching statistics
match_stats = {
    'functional_location_matches': 0,
    'site_name_matches': 0,
    'no_matches': 0,
    'total_dnoa_records': len(df_dnoa),
    'match_methods': {}
}

print(f"Processing {len(df_dnoa)} DNOA records...")

# Get unique site names from df_final for fuzzy matching
df_final_sites = df_final['sitename'].dropna().tolist()

# Process each DNOA record
for idx, dnoa_row in df_dnoa.iterrows():
    functional_location = dnoa_row['sitefunctionallocation']
    substation_title = dnoa_row.get('substation_title', '')  # Use actual substation_title column
    
    matched = False
    match_type = None
    matched_index = None
    
    # Step 1: Try to match by Functional Location (if not empty/null)
    if pd.notna(functional_location) and functional_location != '':
        matching_records = df_final[df_final['sitefunctionallocation'] == functional_location]
        if len(matching_records) > 0:
            matched = True
            match_type = 'functional_location'
            matched_index = matching_records.index
            match_stats['functional_location_matches'] += 1
    
                             # Step 2: If no match found or Functional Location is empty, try comprehensive matching strategies
    if not matched:
        if pd.notna(substation_title) and substation_title != '':
            best_match, score, method = comprehensive_site_matching(substation_title, df_final_sites)
            if best_match and score > 0:
                matching_records = df_final[df_final['sitename'] == best_match]
                if len(matching_records) > 0:
                    matched = True
                    match_type = f'site_name_{method}'
                    matched_index = matching_records.index
                    match_stats['site_name_matches'] += 1
                    
                    # Track which methods are working
                    if method not in match_stats['match_methods']:
                        match_stats['match_methods'][method] = 0
                    match_stats['match_methods'][method] += 1
                    
                    print(f"DEBUG: {method} - DNOA '{substation_title}' -> Final '{best_match}' (score: {score:.3f})")
    
    # Add DNOA data to matched records
    if matched:
        for col in dnoa_columns:
            df_final.loc[matched_index, col] = dnoa_row[col]
    else:
        match_stats['no_matches'] += 1

# Rename DNOA columns to user-friendly names (matching production file)
print("Renaming DNOA columns to match production file format...")
dnoa_column_mapping = {
    'substation_title': 'Substation Title',
    'constraint_description': 'Constraint description',
    'traditional_solution': 'Traditional solution',
    'constraint_season': 'Constraint season',
    'customers_served': 'Customers served',
    'dnoa_result': 'DNOA result',
    'dnoa_result_description': 'DNOA result description',
    'dnoa_result_history_2023': 'DNOA result history 2023',
    'dnoa_result_history_2024': 'DNOA result history 2024',
    'dnoa_result_history_2025': 'DNOA result history 2025',
    'flexibility_procurement_2024_25': 'Flexibility procurement 2024/25',
    'flexibility_procurement_2025_26': 'Flexibility procurement 2025/26',
    'flexibility_procurement_2026_27': 'Flexibility procurement 2026/27',
    'flexibility_procurement_2027_28': 'Flexibility procurement 2027/28',
    'flexibility_procurement_2028_29': 'Flexibility procurement 2028/29',
    'constraint_occurrence_year': 'Constraint occurrence year',
    'current_status': 'Current Status',
    'type': 'Type',
    'site': 'Site'
}

for old_col, new_col in dnoa_column_mapping.items():
    if old_col in df_final.columns:
        df_final = df_final.rename(columns={old_col: new_col})
        print(f"Renamed {old_col} -> {new_col}")

print("DNOA column renaming completed!")

print(f"\nMatching Statistics:")
print(f"  Functional Location matches: {match_stats['functional_location_matches']}")
print(f"  Site Name matches: {match_stats['site_name_matches']}")
print(f"  No matches found: {match_stats['no_matches']}")
print(f"  Total DNOA records processed: {match_stats['total_dnoa_records']}")
print(f"  Total matches: {match_stats['functional_location_matches'] + match_stats['site_name_matches']}")

if match_stats['match_methods']:
    print(f"\nSite Name Matching Methods Used:")
    for method, count in match_stats['match_methods'].items():
        print(f"  {method}: {count} matches")
else:
    print(f"\nNo site name matches found using any method")

# Check final merge results
sites_with_dnoa_data = df_final['Constraint description'].notna().sum()
sites_without_dnoa_data = len(df_final) - sites_with_dnoa_data
total_matches = match_stats['functional_location_matches'] + match_stats['site_name_matches']

print(f"\nFinal DNOA Integration Results:")
print(f"Sites with DNOA data populated: {sites_with_dnoa_data}")
print(f"Sites without DNOA data (empty): {sites_without_dnoa_data}")
print(f"Total records in final dataset (all preserved): {len(df_final)}")
print(f"Matching efficiency: {total_matches}/{match_stats['total_dnoa_records']} DNOA records matched ({total_matches/match_stats['total_dnoa_records']*100:.1f}%)")

# Show statistics for key DNOA columns
print(f"\nDNOA Data Statistics:")
print(f"  Total DNOA records: {len(df_final)}")
print(f"  Records with Constraint description: {df_final['Constraint description'].notna().sum()}")
print(f"  Records with Traditional solution: {df_final['Traditional solution'].notna().sum()}")
print(f"  Records with DNOA result: {df_final['DNOA result'].notna().sum()}")
print(f"  Records with Current Status: {df_final['Current Status'].notna().sum()}")
print(f"  Records with main dataset data: {df_final['powertransformercount'].notna().sum()}")

# Show unique values for some key categorical columns
print(f"\nUnique values in key DNOA columns:")
if df_final['Constraint season'].notna().sum() > 0:
    print(f"  Constraint season: {df_final['Constraint season'].dropna().unique()}")
if df_final['DNOA result'].notna().sum() > 0:
    print(f"  DNOA result: {df_final['DNOA result'].dropna().unique()}")
if df_final['Current Status'].notna().sum() > 0:
    print(f"  Current Status: {df_final['Current Status'].dropna().unique()}")
if df_final['Type'].notna().sum() > 0:
    print(f"  Type: {df_final['Type'].dropna().unique()}")

# Show sample of final data with DNOA columns
print("\nSample of final data with DNOA columns (first 5 rows):")
dnoa_sample_cols = [
    'sitefunctionallocation', 
    'Constraint description',
    'Traditional solution',
    'DNOA result',
    'Current Status',
    'Type'
]
print(df_final[dnoa_sample_cols].head(5).to_string())

# Save the final processed data to CSV
output_file = "transformed_transformer_data.csv"
df_final.to_csv(output_file, index=False)
print(f"\nFinal processed data with DNOA integration saved to: {output_file}")

# Show combined ECR statistics
print(f"\nCOMBINED ECR STATISTICS:")
print(f"Total ECR > 1MVA 'Already connected': {df_final['ECR > 1MVA Already connected'].sum():.2f} MW")
print(f"Total ECR < 1MVA 'Already connected': {df_final['ECR < 1MVA Already connected'].sum():.2f} MW")
print(f"Total ECR > 1MVA 'Accepted to connect': {df_final['ECR > 1MVA Accepted to connect'].sum():.2f} MW")
print(f"Total ECR < 1MVA 'Accepted to connect': {df_final['ECR < 1MVA Accepted to connect'].sum():.2f} MW")

print(f"\nData processing completed. Final data saved to {output_file}")
print("ECR > 1MVA and ECR < 1MVA data integration completed successfully!")
print("Grid Supply Point and Bulk Supply Point columns consolidated successfully!")
print("NOTE: All original records preserved, DNOA columns added where matches found")

# ============================================================================
# LTDS INFRASTRUCTURE PROJECTS DATA INTEGRATION
# ============================================================================
print("\n" + "="*50)
print("STARTING LTDS INFRASTRUCTURE PROJECTS DATA INTEGRATION")
print("="*50)

# Fetch data from ukpn_ltds_infrastructure_projects table
print("Fetching data from ukpn_ltds_infrastructure_projects table...")

# Use SELECT * and rename columns approach since the BOM column name is causing issues
if engine is None:
    print("\nERROR: No database connection available.")
    print("Cannot proceed without database connection.")
    print("Please check your database configuration and try again.")
    exit(1)

try:
    ltds_projects_query = """
    SELECT * FROM ukpn_ltds_infrastructure_projects
    """
    df_ltds_projects = pd.read_sql_query(ltds_projects_query, engine)
    print(f"Successfully fetched {len(df_ltds_projects)} records from ukpn_ltds_infrastructure_projects")
except Exception as e:
    print(f"Error fetching LTDS projects data: {e}")
    print("Cannot proceed without data from ukpn_ltds_infrastructure_projects table.")
    exit(1)

# Debug: Print the actual column names
print("DEBUG: Actual column names in the dataframe:")
print(df_ltds_projects.columns.tolist())

# Rename the columns to clean names based on actual database schema
original_columns = df_ltds_projects.columns.tolist()
df_ltds_projects.columns = [
    'id',  # id
    'AssetType_Quantity',  # asset_type_or_quantity
    'AssociatedGSP',  # associated_gsp
    'Connectivity_Voltage(kV)',  # connectivity_voltage
    'DNO',  # dno
    'ExpectedCompletionYear',  # expected_completion_year
    'ExpectedStartYear',  # expected_start_year
    'Justification',  # justification_for_the_need
    'LTDSName',  # ltds_name
    'SiteFunctionalLocation',  # site_functional_location
    'Source',  # source
    'SpatialCoordinates',  # spatial_coordinates
    'Substation_or_Circuit',  # substation_or_circuit_ple_name
    'what3words',  # what3words
    '__hash',  # __hash
    '__ingested_at'  # __ingested_at
]

# Track LTDS projects database columns with original names
new_columns = df_ltds_projects.columns.tolist()
for i, new_col in enumerate(new_columns):
    if i < len(original_columns):
        column_tracking['database_columns'][new_col] = {
            'table': 'ukpn_ltds_infrastructure_projects',
            'original_column': original_columns[i]
        }
        if new_col != original_columns[i]:
            column_tracking['renamed_columns'][new_col] = original_columns[i]

# Select only the columns we need
df_ltds_projects = df_ltds_projects[[
    'SiteFunctionalLocation',
    'Substation_or_Circuit',
    'LTDSName',
    'AssetType_Quantity',
    'AssociatedGSP',
    'Justification',
    'Connectivity_Voltage(kV)',
    'ExpectedStartYear',
    'ExpectedCompletionYear'
]]
print(f"Retrieved {len(df_ltds_projects)} records from ukpn_ltds_infrastructure_projects")

# DEBUG: Check SiteFunctionalLocation values in both datasets
print(f"\nDEBUG: Sample SiteFunctionalLocation values from LTDS projects table:")
print(df_ltds_projects['SiteFunctionalLocation'].head(10).tolist())
print(f"DEBUG: Unique SiteFunctionalLocation values in LTDS projects table: {df_ltds_projects['SiteFunctionalLocation'].nunique()}")

print(f"\nDEBUG: Sample SiteFunctionalLocation values from main dataset:")
print(f"DEBUG: Available columns in main dataset: {df_final.columns.tolist()}")
# Find the correct column name for SiteFunctionalLocation
site_col = 'sitefunctionallocation'  # Based on the actual column name from the database
if site_col:
    main_sfl_sample = df_final[site_col].head(10).tolist()
    print(main_sfl_sample)
    print(f"DEBUG: Unique {site_col} values in main dataset: {df_final[site_col].nunique()}")
else:
    print("DEBUG: SiteFunctionalLocation column not found in main dataset")

# DEBUG: Check for matches between datasets
ltds_sfl_set = set(df_ltds_projects['SiteFunctionalLocation'].dropna())
if site_col:
    main_sfl_set = set(df_final[site_col].dropna())
    common_sfl = ltds_sfl_set & main_sfl_set
    print(f"DEBUG: Common SiteFunctionalLocation values found: {len(common_sfl)}")
    if len(common_sfl) > 0:
        print(f"DEBUG: Sample common SiteFunctionalLocation values: {list(common_sfl)[:5]}")
else:
    print("DEBUG: Cannot check for matches - SiteFunctionalLocation column not found in main dataset")

# Check for multiple records per SiteFunctionalLocation in LTDS projects table
ltds_projects_counts = df_ltds_projects['SiteFunctionalLocation'].value_counts()
multiple_records = ltds_projects_counts[ltds_projects_counts > 1]
if len(multiple_records) > 0:
    print(f"Found {len(multiple_records)} SiteFunctionalLocations with multiple LTDS projects records")
    print("Taking first occurrence for each SiteFunctionalLocation...")
    # Keep only the first record for each SiteFunctionalLocation
    df_ltds_projects = df_ltds_projects.drop_duplicates(subset=['SiteFunctionalLocation'], keep='first')
    print(f"After deduplication: {len(df_ltds_projects)} records")
else:
    print("All SiteFunctionalLocations have unique LTDS projects records")

# Merge with final data - REVERSED LOGIC: 
# For each SiteFunctionalLocation in LTDS projects table, find matching rows in main dataset
print("Merging LTDS infrastructure projects data with existing data...")
print("LOGIC: Taking SiteFunctionalLocation from LTDS projects and matching with main dataset")

if site_col:
    df_final = df_final.merge(
        df_ltds_projects, 
        left_on=site_col,
        right_on='SiteFunctionalLocation', 
        how='left'
    )
else:
    print("ERROR: Cannot merge - SiteFunctionalLocation column not found in main dataset")
    # Create empty columns for LTDS projects data
    ltds_columns = ['Substation_or_Circuit', 'LTDSName', 'AssetType_Quantity', 'AssociatedGSP', 'Justification', 'Connectivity_Voltage(kV)', 'ExpectedStartYear', 'ExpectedCompletionYear']
    for col in ltds_columns:
        df_final[col] = None

# DEBUG: Check merge results and specific example
print(f"DEBUG: Records with LTDS 'Substation_or_Circuit' data after merge: {df_final['Substation_or_Circuit'].notna().sum()}")

# DEBUG: Check a specific example from the previous output
if len(common_sfl) > 0:
    example_sfl = list(common_sfl)[0]
    print(f"DEBUG: Checking example sitefunctionallocation: {example_sfl}")
    
    # Check in main dataset
    main_example = df_final[df_final['sitefunctionallocation'] == example_sfl]
    print(f"DEBUG: Records in main dataset with {example_sfl}: {len(main_example)}")
    if len(main_example) > 0:
        ltds_cols = ['Substation_or_Circuit', 'LTDSName', 'AssetType_Quantity']
        print(f"DEBUG: LTDS data for {example_sfl}: {main_example[ltds_cols].iloc[0].to_dict()}")
    
    # Check in LTDS dataset
    ltds_example = df_ltds_projects[df_ltds_projects['SiteFunctionalLocation'] == example_sfl]
    print(f"DEBUG: Records in LTDS dataset with {example_sfl}: {len(ltds_example)}")
    if len(ltds_example) > 0:
        print(f"DEBUG: Original LTDS data for {example_sfl}: {ltds_example[ltds_cols].iloc[0].to_dict()}")
else:
    print("DEBUG: No common sitefunctionallocation values found for detailed example")

# Check merge results
sites_with_ltds_projects_data = df_final['Substation_or_Circuit'].notna().sum()
sites_without_ltds_projects_data = len(df_final) - sites_with_ltds_projects_data

print(f"Sites with LTDS infrastructure projects data: {sites_with_ltds_projects_data}")
print(f"Sites without LTDS infrastructure projects data: {sites_without_ltds_projects_data}")

# Show statistics for key LTDS projects columns
print(f"\nLTDS Infrastructure Projects Data Statistics:")
print(f"  Records with Substation_or_Circuit: {df_final['Substation_or_Circuit'].notna().sum()}")
print(f"  Records with LTDSName: {df_final['LTDSName'].notna().sum()}")
print(f"  Records with AssetType_Quantity: {df_final['AssetType_Quantity'].notna().sum()}")
print(f"  Records with AssociatedGSP: {df_final['AssociatedGSP'].notna().sum()}")
print(f"  Records with Justification: {df_final['Justification'].notna().sum()}")
print(f"  Records with Connectivity_Voltage(kV): {df_final['Connectivity_Voltage(kV)'].notna().sum()}")
print(f"  Records with ExpectedStartYear: {df_final['ExpectedStartYear'].notna().sum()}")
print(f"  Records with ExpectedCompletionYear: {df_final['ExpectedCompletionYear'].notna().sum()}")

# Show unique values for some key categorical columns
print(f"\nUnique values in key LTDS projects columns:")
if df_final['AssetType_Quantity'].notna().sum() > 0:
    unique_asset_types = df_final['AssetType_Quantity'].dropna().unique()
    print(f"  AssetType_Quantity (showing first 10): {unique_asset_types[:10]}")
if df_final['AssociatedGSP'].notna().sum() > 0:
    unique_gsp = df_final['AssociatedGSP'].dropna().unique()
    print(f"  AssociatedGSP (showing first 10): {unique_gsp[:10]}")
if df_final['ExpectedStartYear'].notna().sum() > 0:
    unique_start_years = df_final['ExpectedStartYear'].dropna().unique()
    print(f"  ExpectedStartYear: {sorted(unique_start_years)}")
if df_final['ExpectedCompletionYear'].notna().sum() > 0:
    unique_completion_years = df_final['ExpectedCompletionYear'].dropna().unique()
    print(f"  ExpectedCompletionYear: {sorted(unique_completion_years)}")

# Show sample of final data with LTDS projects columns
print("\nSample of final data with LTDS infrastructure projects columns (first 5 rows):")
ltds_projects_sample_cols = [
    'sitefunctionallocation', 
    'Substation_or_Circuit',
    'LTDSName',
    'AssetType_Quantity',
    'AssociatedGSP',
    'Justification',
    'Connectivity_Voltage(kV)',
    'ExpectedStartYear',
    'ExpectedCompletionYear'
]
print(df_final[ltds_projects_sample_cols].head(5).to_string())

# Save the final processed data to CSV
output_file = "transformed_transformer_data.csv"
df_final.to_csv(output_file, index=False)
print(f"\nFinal processed data with LTDS infrastructure projects integration saved to: {output_file}")

print(f"\nData processing completed. Final data saved to {output_file}")
print("LTDS infrastructure projects data integration completed successfully!")

# ============================================================================
# GRID SUPPLY POINTS OVERVIEW DATA INTEGRATION
# ============================================================================

print("\n" + "="*50)
print("STARTING GRID SUPPLY POINTS OVERVIEW DATA INTEGRATION")
print("="*50)

# Fetch data from ukpn_grid_supply_points_overview table
print("Fetching data from ukpn_grid_supply_points_overview table...")
if engine is None:
    print("\nERROR: No database connection available.")
    print("Cannot proceed without database connection.")
    print("Please check your database configuration and try again.")
    exit(1)

try:
    gsp_overview_query = """
    SELECT 
        "gsp" AS "grid_supply_point",
        "minimum_observed_power_flow",
        "maximum_observed_power_flow",
        "asset_import_limit",
        "asset_export_limit",
        "technical_limit_import_summer",
        "technical_limit_import_winter",
        "technical_limit_import_access_period",
        "technical_limit_export"
    FROM ukpn_grid_supply_points_overview
    """
    df_gsp_overview = pd.read_sql_query(gsp_overview_query, engine)
    print(f"Successfully fetched {len(df_gsp_overview)} records from ukpn_grid_supply_points_overview")
except Exception as e:
    print(f"Error fetching GSP overview data: {e}")
    print("Cannot proceed without data from ukpn_grid_supply_points_overview table.")
    exit(1)
print(f"Retrieved {len(df_gsp_overview)} records from ukpn_grid_supply_points_overview")

# Track GSP Overview database columns with renamed column mapping
gsp_column_mapping = {
    'Grid Supply Point': 'Grid Supply Point (GSP)'
}
track_database_columns(df_gsp_overview, 'ukpn_grid_supply_points_overview', gsp_column_mapping)

# Renamed 'Grid Supply Point (GSP)' to 'Grid Supply Point' for matching with main dataset

# DEBUG: Check the Grid Supply Point values in overview data
print(f"\nDEBUG: Sample Grid Supply Point values from overview table:")
print(df_gsp_overview['grid_supply_point'].head(10).tolist())
print(f"DEBUG: Unique Grid Supply Point values in overview table: {df_gsp_overview['grid_supply_point'].nunique()}")

# DEBUG: Check the Grid Supply Point values in main dataset
print(f"\nDEBUG: Sample Grid Supply Point values from main dataset:")
if 'Grid Supply Point' in df_final.columns:
    main_gsp_sample = df_final['Grid Supply Point'].dropna().head(10).tolist()
    print(main_gsp_sample)
    print(f"DEBUG: Non-null Grid Supply Point values in main dataset: {df_final['Grid Supply Point'].notna().sum()}")
    
    # DEBUG: Check for exact matches
    common_values = set(df_gsp_overview['grid_supply_point'].dropna()) & set(df_final['Grid Supply Point'].dropna())
    print(f"DEBUG: Common Grid Supply Point values found: {len(common_values)}")
    if len(common_values) > 0:
        print(f"DEBUG: Sample common values: {list(common_values)[:5]}")
else:
    print("DEBUG: Grid Supply Point column not found in main dataset")
    common_values = set()

# Function for fuzzy matching
def fuzzy_match_gsp(main_gsp, overview_gsp_list, threshold=0.6):
    """
    Find the best fuzzy match for a Grid Supply Point name
    Returns (best_match, similarity_score) or (None, 0) if no good match
    """
    if pd.isna(main_gsp) or main_gsp == '':
        return None, 0
    
    main_gsp_clean = str(main_gsp).strip().upper()
    best_match = None
    best_score = 0
    
    for overview_gsp in overview_gsp_list:
        if pd.isna(overview_gsp) or overview_gsp == '':
            continue
            
        overview_gsp_clean = str(overview_gsp).strip().upper()
        
        # Exact match (case insensitive)
        if main_gsp_clean == overview_gsp_clean:
            return overview_gsp, 1.0
        
        # Partial match - check if overview name is contained in main name or vice versa
        if overview_gsp_clean in main_gsp_clean or main_gsp_clean in overview_gsp_clean:
            score = max(len(overview_gsp_clean) / len(main_gsp_clean), 
                       len(main_gsp_clean) / len(overview_gsp_clean))
            if score > best_score:
                best_match = overview_gsp
                best_score = score
        
        # Similarity-based matching
        similarity = SequenceMatcher(None, main_gsp_clean, overview_gsp_clean).ratio()
        if similarity > best_score and similarity >= threshold:
            best_match = overview_gsp
            best_score = similarity
    
    return best_match, best_score

# Create fuzzy matching mapping (REVERSED LOGIC)
print(f"\nDEBUG: Creating fuzzy matching mapping...")
main_gsp_list = df_final['Grid Supply Point'].dropna().tolist()
fuzzy_matches = {}
match_stats = {'exact': 0, 'fuzzy': 0, 'no_match': 0}

# For each Grid Supply Point in the overview table, find matching Grid Supply Point in main dataset
for overview_gsp in df_gsp_overview['grid_supply_point'].dropna().unique():
    match, score = fuzzy_match_gsp(overview_gsp, main_gsp_list, threshold=0.6)
    if match:
        fuzzy_matches[overview_gsp] = match
        if score == 1.0:
            match_stats['exact'] += 1
        else:
            match_stats['fuzzy'] += 1
        print(f"DEBUG: Overview '{overview_gsp}' -> Main '{match}' (score: {score:.2f})")
    else:
        match_stats['no_match'] += 1

print(f"DEBUG: Match statistics: {match_stats}")
print(f"DEBUG: Total fuzzy matches created: {len(fuzzy_matches)}")

# Clean and convert numeric columns to proper types
numeric_columns = [
    'minimum_observed_power_flow',
    'maximum_observed_power_flow', 
    'asset_import_limit',
    'asset_export_limit',
    'technical_limit_import_summer',
    'technical_limit_import_winter',
    'technical_limit_import_access_period',
    'technical_limit_export'
]

for col in numeric_columns:
    df_gsp_overview[col] = pd.to_numeric(df_gsp_overview[col], errors='coerce').fillna(0)

# Check for multiple records per Grid Supply Point
gsp_overview_counts = df_gsp_overview['grid_supply_point'].value_counts()
multiple_records = gsp_overview_counts[gsp_overview_counts > 1]
if len(multiple_records) > 0:
    print(f"Found {len(multiple_records)} Grid Supply Points with multiple Grid Supply Points Overview records")
    print("Taking first occurrence for each Grid Supply Point...")
    # Keep only the first record for each Grid Supply Point
    df_gsp_overview = df_gsp_overview.drop_duplicates(subset=['grid_supply_point'], keep='first')
    print(f"After deduplication: {len(df_gsp_overview)} records")
else:
    print("All Grid Supply Points have unique Grid Supply Points Overview records")

# Apply fuzzy matching to merge data
print("Merging Grid Supply Points Overview data with existing data using fuzzy matching...")

# Create reverse mapping - for each overview GSP, what main GSP does it match to
reverse_mapping = {main_gsp: overview_gsp for overview_gsp, main_gsp in fuzzy_matches.items()}

# Create a mapping column for fuzzy matching
df_final['Overview GSP Match'] = df_final['Grid Supply Point'].map(reverse_mapping).astype(str)

# Merge using the matched column
df_gsp_overview_temp = df_gsp_overview.copy()
df_gsp_overview_temp['Overview GSP Match'] = df_gsp_overview_temp['grid_supply_point'].astype(str)
df_final = df_final.merge(
    df_gsp_overview_temp.drop(columns=['grid_supply_point']), 
    on='Overview GSP Match', 
    how='left'
)

# Drop the temporary matching column
df_final = df_final.drop('Overview GSP Match', axis=1)

# DEBUG: Check merge results before filling missing values
if 'minimum_observed_power_flow' in df_final.columns:
    print(f"\nDEBUG: After merge - records with non-null 'Minimum Observed Power Flow': {df_final['minimum_observed_power_flow'].notna().sum()}")
    print(f"DEBUG: After merge - records with non-zero 'Minimum Observed Power Flow': {df_final['minimum_observed_power_flow'].gt(0).sum()}")
else:
    print(f"\nDEBUG: Minimum Observed Power Flow column not found after merge")

# Fill missing values for sites not found in Grid Supply Points Overview
# Numeric columns get 0, string columns get empty strings
for col in numeric_columns:
    df_final[col] = df_final[col].fillna(0).astype(float)

# DEBUG: Check a specific example - BURWELL
if 'Grid Supply Point' in df_final.columns:
    burwell_records = df_final[df_final['Grid Supply Point'].str.contains('BURWELL', case=False, na=False)]
    if len(burwell_records) > 0:
        print(f"\nDEBUG: BURWELL records found in main dataset: {len(burwell_records)}")
        if 'minimum_observed_power_flow' in df_final.columns:
            print(f"DEBUG: BURWELL 'Minimum Observed Power Flow' values: {burwell_records['minimum_observed_power_flow'].tolist()}")
    else:
        print(f"\nDEBUG: No BURWELL records found in main dataset")
else:
    print(f"\nDEBUG: Grid Supply Point column not found in main dataset")

# Check if BURWELL exists in overview data
if 'grid_supply_point' in df_gsp_overview.columns:
    burwell_overview = df_gsp_overview[df_gsp_overview['grid_supply_point'].str.contains('BURWELL', case=False, na=False)]
    if len(burwell_overview) > 0:
        print(f"DEBUG: BURWELL records found in overview dataset: {len(burwell_overview)}")
        print(f"DEBUG: BURWELL overview data: {burwell_overview[['grid_supply_point', 'minimum_observed_power_flow']].to_dict('records')}")
    else:
        print(f"DEBUG: No BURWELL records found in overview dataset")
else:
    print(f"DEBUG: grid_supply_point column not found in overview dataset")

# Check merge results
if 'minimum_observed_power_flow' in df_final.columns and 'maximum_observed_power_flow' in df_final.columns:
    sites_with_gsp_overview_data = df_final['minimum_observed_power_flow'].gt(0).sum() + df_final['maximum_observed_power_flow'].gt(0).sum()
    sites_without_gsp_overview_data = len(df_final) - sites_with_gsp_overview_data
else:
    sites_with_gsp_overview_data = 0
    sites_without_gsp_overview_data = len(df_final)

print(f"Sites with Grid Supply Points Overview data: {sites_with_gsp_overview_data}")
print(f"Sites without Grid Supply Points Overview data: {sites_without_gsp_overview_data}")

# Show statistics for key Grid Supply Points Overview columns
print(f"\nGrid Supply Points Overview Data Statistics:")
if 'minimum_observed_power_flow' in df_final.columns:
    print(f"  Records with Minimum Observed Power Flow: {df_final['minimum_observed_power_flow'].gt(0).sum()}")
if 'maximum_observed_power_flow' in df_final.columns:
    print(f"  Records with Maximum Observed Power Flow: {df_final['maximum_observed_power_flow'].gt(0).sum()}")
if 'asset_import_limit' in df_final.columns:
    print(f"  Records with Asset Import Limit: {df_final['asset_import_limit'].gt(0).sum()}")
if 'asset_export_limit' in df_final.columns:
    print(f"  Records with Asset Export Limit: {df_final['asset_export_limit'].gt(0).sum()}")
if 'technical_limit_import_summer' in df_final.columns:
    print(f"  Records with Technical Limit Import Summer: {df_final['technical_limit_import_summer'].gt(0).sum()}")
if 'technical_limit_import_winter' in df_final.columns:
    print(f"  Records with Technical Limit Import Winter: {df_final['technical_limit_import_winter'].gt(0).sum()}")
if 'technical_limit_import_access_period' in df_final.columns:
    print(f"  Records with Technical Limit Import Access Period: {df_final['technical_limit_import_access_period'].gt(0).sum()}")
if 'technical_limit_export' in df_final.columns:
    print(f"  Records with Technical Limit Export: {df_final['technical_limit_export'].gt(0).sum()}")

# Show summary statistics for numeric columns
print(f"\nGrid Supply Points Overview Statistics:")
for col in numeric_columns:
    non_zero_count = df_final[col].gt(0).sum()
    if non_zero_count > 0:
        print(f"  {col}:")
        print(f"    Non-zero values: {non_zero_count}")
        print(f"    Mean: {df_final[col].mean():.2f}")
        print(f"    Min: {df_final[col].min():.2f}")
        print(f"    Max: {df_final[col].max():.2f}")

# Show sample of final data with Grid Supply Points Overview columns
print("\nSample of final data with Grid Supply Points Overview columns (first 5 rows):")
gsp_overview_sample_cols = [
    'sitefunctionallocation',
    'Grid Supply Point',
    'minimum_observed_power_flow',
    'maximum_observed_power_flow',
    'asset_import_limit',
    'asset_export_limit',
    'technical_limit_import_summer',
    'technical_limit_import_winter',
    'technical_limit_import_access_period',
    'technical_limit_export'
]
# Only show columns that exist in the dataframe
existing_cols = [col for col in gsp_overview_sample_cols if col in df_final.columns]
if existing_cols:
    print(df_final[existing_cols].head(5).to_string())
else:
    print("No Grid Supply Points Overview columns found in final data")

# Remove duplicate SiteFunctionalLocation column (keep the original lowercase one)
if 'SiteFunctionalLocation' in df_final.columns and 'sitefunctionallocation' in df_final.columns:
    print("Removing duplicate SiteFunctionalLocation column (keeping sitefunctionallocation)...")
    df_final = df_final.drop(columns=['SiteFunctionalLocation'])

# Define columns to hide (DB-specific and technical columns)
columns_to_hide = ['__hash', '__ingested_at', 'id']

# Create clean dataset without unwanted columns
clean_df = df_final.drop(columns=[col for col in columns_to_hide if col in df_final.columns])

# Sort columns alphabetically A to Z
print("Sorting columns alphabetically...")
clean_df = clean_df.reindex(sorted(clean_df.columns), axis=1)

# Normalize column names for better readability
def normalize_column_name(col_name):
    """
    Normalize column names to be more readable for clients:
    - Replace underscores with spaces
    - Handle special cases for common abbreviations
    - Properly capitalize words
    """
    # Handle special cases first
    special_cases = {
        'installedcapacity_mva': 'Installed Capacity MVA',
        'sitefunctionallocation': 'Site Functional Location',
        'spatial_coordinates': 'Spatial Coordinates',
        'local_authority': 'Local Authority',
        'local_authority_code': 'Local Authority Code',
        'postcode': 'Postcode',
        'street': 'Street',
        'suburb': 'Suburb',
        'towncity': 'Town City',
        'county': 'County',
        'sitename': 'Site Name',
        'sitetype': 'Site Type',
        'sitevoltage': 'Site Voltage',
        'siteclassification': 'Site Classification',
        'siteassetcount': 'Site Asset Count',
        'civilassetcount': 'Civil Asset Count',
        'electricalassetcount': 'Electrical Asset Count',
        'powertransformercount': 'Power Transformer Count',
        'datecommissioned': 'Date Commissioned',
        'yearcommissioned': 'Year Commissioned',
        'assessmentdate': 'Assessment Date',
        'next_assessmentdate': 'Next Assessment Date',
        'last_report': 'Last Report',
        'maxdemandsummer': 'Max Demand Summer',
        'maxdemandwinter': 'Max Demand Winter',
        'transratingsummer': 'Transformer Rating Summer',
        'transratingwinter': 'Transformer Rating Winter',
        'reversepower': 'Reverse Power',
        'gridref': 'Grid Reference',
        'easting': 'Easting',
        'northing': 'Northing',
        'licencearea': 'Licence Area',
        'calculatedresistance': 'Calculated Resistance',
        'measuredresistance_ohm': 'Measured Resistance (Ohm)',
        'esqcroverallrisk': 'ESQCR Overall Risk',
        'what3words': 'What3Words'
    }
    
    # Check if it's a special case
    if col_name in special_cases:
        return special_cases[col_name]
    
    # Handle transformer rating columns (Trans1_Summer, Trans2_Winter, etc.)
    if col_name.startswith('Trans') and ('_Summer' in col_name or '_Winter' in col_name):
        parts = col_name.split('_')
        if len(parts) == 2:
            trans_num = parts[0].replace('Trans', 'Transformer ')
            season = parts[1]
            return f"{trans_num} {season}"
    
    # Handle ECR columns
    if 'ECR' in col_name and ('<' in col_name or '>' in col_name):
        # Keep ECR columns as they are since they have specific meaning
        return col_name
    
    # Handle other columns with underscores
    if '_' in col_name:
        # Split by underscore and capitalize each word
        words = col_name.split('_')
        # Capitalize first letter of each word
        normalized = ' '.join(word.capitalize() for word in words)
        return normalized
    
    # If no underscores, just capitalize the first letter
    return col_name.capitalize()

print("Normalizing column names for better readability...")
# Create a mapping of old to new column names
column_mapping = {col: normalize_column_name(col) for col in clean_df.columns}

# Show which columns were changed
changed_columns = {old: new for old, new in column_mapping.items() if old != new}
if changed_columns:
    print(f"Column name changes applied ({len(changed_columns)} columns):")
    for old_name, new_name in sorted(changed_columns.items()):
        print(f"  '{old_name}' -> '{new_name}'")
else:
    print("No column names needed normalization")

# Rename columns
clean_df = clean_df.rename(columns=column_mapping)

# Remove unwanted Transrating Summer 7 and 8 columns if present 22-10-2025
columns_to_remove = ['Transformer 7 Summer', 'Transformer 8 Summer', 'Transformer 7 Winter', 'Transformer 8 Winter']
clean_df = clean_df.drop(columns=[col for col in columns_to_remove if col in clean_df.columns], errors='ignore')


# Save the final processed data to CSV (single output file)
output_file = "transformed_transformer_data.csv"
clean_df.to_csv(output_file, index=False)
print(f"\nFinal processed data saved to: {output_file}")
print(f"Hidden columns: {[col for col in columns_to_hide if col in df_final.columns]}")
print(f"Total columns in output: {len(clean_df.columns)}")
print(f"Columns sorted alphabetically A to Z")

print(f"\nData processing completed. Final data saved to {output_file}")
print("Grid Supply Points Overview data integration completed successfully!")

# Close connection
# Note: SQLAlchemy engine doesn't need explicit closing like psycopg2 connections
print("Database connection handled by SQLAlchemy engine")

# ============================================================================
# FINAL COLUMN TRACKING SUMMARY
# ============================================================================

# Save tracking data to JSON files for later analysis
import json

# Define the JSON file names
json_files = [
    'table_to_columns_mapping.json',
    'calculated_columns.json', 
    'aggregated_columns.json',
    'complete_column_tracking.json'
]

# Delete existing JSON files if they exist
print("\nCleaning up existing JSON tracking files...")
for file_name in json_files:
    if os.path.exists(file_name):
        os.remove(file_name)
        print(f"Deleted existing file: {file_name}")

print("Creating fresh JSON tracking files...")

# Save table-to-column mapping
table_to_columns = {}
for col, info in column_tracking['database_columns'].items():
    table = info['table']
    if table not in table_to_columns:
        table_to_columns[table] = []
    table_to_columns[table].append({
        'column_name': col,
        'original_name': info['original_column']
    })

with open('table_to_columns_mapping.json', 'w') as f:
    json.dump(table_to_columns, f, indent=2)
print("✓ Table-to-columns mapping saved to: table_to_columns_mapping.json")

# Save calculated columns info
with open('calculated_columns.json', 'w') as f:
    json.dump(column_tracking['calculated_columns'], f, indent=2)
print("✓ Calculated columns info saved to: calculated_columns.json")

# Save aggregated columns info
with open('aggregated_columns.json', 'w') as f:
    json.dump(column_tracking['aggregated_columns'], f, indent=2)
print("✓ Aggregated columns info saved to: aggregated_columns.json")

# Save complete tracking data
with open('complete_column_tracking.json', 'w') as f:
    json.dump(column_tracking, f, indent=2)
print("✓ Complete column tracking data saved to: complete_column_tracking.json")

print_column_tracking_summary()

print("\n" + "="*80)
print("IMPORTANT NOTE: REVERSED DNOA LOGIC")
print("="*80)
print("All original records are preserved in the final dataset.")
print("DNOA columns are added where sitefunctionallocation matches are found.")
print("Records without DNOA matches have empty/null values in DNOA columns.")
print("All subsequent data integrations are applied to the complete dataset.")
print("="*80)








