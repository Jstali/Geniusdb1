from fastapi import FastAPI, Query, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import json
import os
import subprocess
import sys
import sqlite3
from typing import Optional, List
from pydantic import BaseModel

# Import our data manager
from data_manager import get_data

app = FastAPI(title="Genius DB API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for view data
class ViewData(BaseModel):
    name: str
    selected_columns: str
    chart_config: str = ""
    filters: str = ""
    map_config: str = ""
    sort_config: str = ""
    pagination_config: str = ""

# Pydantic model for new view management
class NewViewData(BaseModel):
    user_id: int
    selected_columns: List[str]

# Pydantic model for chart data requests
class ChartDataRequest(BaseModel):
    x_axis: str
    y_axis: Optional[str] = None
    filters: Optional[dict] = {}
    chart_type: Optional[str] = "bar"

# Pydantic model for view data response
class ViewDataResponse(BaseModel):
    view_name: str
    user_id: int
    selected_columns: List[str]
    data: List[dict]

# Load data files
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

# Initialize database with enhanced schema
def init_database():
    """Initialize the user_views database with enhanced schema"""
    try:
        conn = sqlite3.connect("user_views.db")
        cursor = conn.cursor()
        
        # Create user_views table with enhanced schema
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_views (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                slot INTEGER NOT NULL,
                name TEXT NOT NULL,
                selected_columns TEXT NOT NULL,
                chart_config TEXT DEFAULT '',
                filters TEXT DEFAULT '',
                map_config TEXT DEFAULT '',
                sort_config TEXT DEFAULT '',
                pagination_config TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, slot)
            )
        """)
        
        # Add new columns if they don't exist (for existing databases)
        try:
            cursor.execute("ALTER TABLE user_views ADD COLUMN map_config TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass  # Column already exists
            
        try:
            cursor.execute("ALTER TABLE user_views ADD COLUMN sort_config TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass  # Column already exists
            
        try:
            cursor.execute("ALTER TABLE user_views ADD COLUMN pagination_config TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        conn.commit()
        conn.close()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Error initializing database: {e}")

# Initialize database on startup
init_database()

@app.get("/")
def read_root():
    return {"message": "Welcome to Genius DB API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/data/columns")
def get_columns():
    try:
        with open(os.path.join(DATA_DIR, "table_to_columns_mapping.json")) as f:
            data = json.load(f)
        return data
    except Exception as e:
        return {"error": str(e)}

@app.get("/data/aggregated")
def get_aggregated_data():
    try:
        with open(os.path.join(DATA_DIR, "aggregated_columns.json")) as f:
            data = json.load(f)
        return data
    except Exception as e:
        return {"error": str(e)}

@app.get("/data/calculated")
def get_calculated_data():
    try:
        with open(os.path.join(DATA_DIR, "calculated_columns.json")) as f:
            data = json.load(f)
        return data
    except Exception as e:
        return {"error": str(e)}

@app.get("/data/map")
def get_map_data():
    try:
        # Use the processed data instead of reading CSV
        df = get_data()
        if df is None or df.empty:
            raise HTTPException(status_code=500, detail="No data available")
        
        # Extract map data with coordinates
        map_data = []
        for index, row in df.iterrows():
            # Get spatial coordinates
            spatial_coords = row.get('Spatial Coordinates')
            if pd.isna(spatial_coords) or spatial_coords == '\\N':
                continue
                
            # Parse coordinates (format: "lat, lng")
            try:
                coords = spatial_coords.strip('"').split(', ')
                if len(coords) == 2:
                    lat = float(coords[0])
                    lng = float(coords[1])
                    
                    # Skip invalid coordinates
                    if pd.isna(lat) or pd.isna(lng):
                        continue
                    
                    # Get site name
                    site_name = row.get('Site Name', f'Site {index}')
                    if pd.isna(site_name):
                        site_name = f'Site {index}'
                    
                    # Get additional information
                    site_type = row.get('Site Type', 'Unknown')
                    if pd.isna(site_type):
                        site_type = 'Unknown'
                        
                    site_voltage = row.get('Site Voltage', 'Unknown')
                    if pd.isna(site_voltage):
                        site_voltage = 'Unknown'
                        
                    county = row.get('County', 'Unknown')
                    if pd.isna(county):
                        county = 'Unknown'
                    
                    # Get Generation Headroom Mw value
                    generation_headroom = row.get('Generation Headroom Mw', None)
                    if pd.isna(generation_headroom):
                        generation_headroom = None
                    
                    # Get Bulk Supply Point
                    bulk_supply_point = row.get('Bulk Supply Point', None)
                    if pd.isna(bulk_supply_point):
                        bulk_supply_point = None
                        
                    # Get Constraint Description
                    constraint_description = row.get('Constraint description', None)
                    if pd.isna(constraint_description):
                        constraint_description = None
                        
                    # Get Licence Area (Network Operator)
                    licence_area = row.get('Licence Area', None)
                    if pd.isna(licence_area):
                        licence_area = None
                    
                    map_data.append({
                        "id": index,
                        "position": [lat, lng],
                        "site_name": site_name,
                        "site_type": site_type,
                        "site_voltage": site_voltage,
                        "county": county,
                        "generation_headroom": generation_headroom,
                        "popup_text": f"{site_name} ({site_type})",
                        "bulk_supply_point": bulk_supply_point,
                        "constraint_description": constraint_description,
                        "licence_area": licence_area
                    })
            except (ValueError, IndexError):
                # Skip rows with invalid coordinates
                continue
                
        return map_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing map data: {str(e)}")

@app.get("/data/transformers")
def get_transformer_data():
    try:
        # Use the processed data instead of reading CSV
        df = get_data()
        if df is None or df.empty:
            raise HTTPException(status_code=500, detail="No data available")
        
        print(f"Raw data shape: {df.shape}")
        print(f"Raw columns: {list(df.columns)}")
        
        # Comprehensive NaN and infinite value handling
        # Replace infinite values with None
        df = df.replace([float('inf'), float('-inf')], None)
        
        # Replace NaN values with None using multiple approaches
        df = df.where(pd.notna(df), None)
        
        # Additional check for any remaining problematic values
        for col in df.columns:
            if df[col].dtype == 'object':
                # For object columns, replace any string representations of nan
                df[col] = df[col].replace(['nan', 'NaN', 'null', 'None', '\\N'], None)
        
        # Convert DataFrame to list of dictionaries
        transformer_data = df.to_dict('records')
        
        # Additional cleaning of the records to ensure JSON compliance
        for record in transformer_data:
            for key, value in record.items():
                # Check for any remaining float values that might be problematic
                if isinstance(value, float):
                    if pd.isna(value):  # Use pd.isna instead of pd.isfinite
                        record[key] = None
        
        print(f"Processed data count: {len(transformer_data)}")
        print(f"Sample record keys: {list(transformer_data[0].keys()) if transformer_data else 'No data'}")
        
        return transformer_data
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_transformer_data: {str(e)}")
        print(f"Error details: {error_details}")
        raise HTTPException(status_code=500, detail=f"Error processing transformer data: {str(e)}")

@app.get("/process/transformers")
def process_transformer_data():
    try:
        # Instead of running the database script, we'll just return success
        # since we're reading directly from the CSV file
        return {"status": "success", "message": "Data is already available from CSV file"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to process data: {str(e)}"}

@app.post("/api/chart-data")
def get_chart_data(request: ChartDataRequest):
    """Get chart data with filtering and axis selection"""
    try:
        print(f"=== Chart Data Request ===")
        print(f"x_axis: {request.x_axis}")
        print(f"y_axis: {request.y_axis}")
        print(f"chart_type: {request.chart_type}")
        print(f"filters: {request.filters}")
        
        # Validate required parameters
        if not request.x_axis:
            return {"error": "x_axis is required"}, 400
            
        if request.chart_type != "pie" and not request.y_axis:
            return {"error": "y_axis is required for non-pie charts"}, 400
        
        # Use the processed data instead of reading CSV
        df = get_data()
        if df is None or df.empty:
            return {"error": "No data available"}, 500
            
        print(f"Loaded data with {len(df)} rows and {len(df.columns)} columns")
        print(f"Available columns: {list(df.columns)}")
        
        # Check if requested columns exist
        if request.x_axis not in df.columns:
            return {"error": f"Column '{request.x_axis}' not found in data"}, 400
            
        if request.y_axis and request.y_axis not in df.columns:
            return {"error": f"Column '{request.y_axis}' not found in data"}, 400
        
        # Apply filters if provided
        if request.filters:
            print(f"Applying filters: {request.filters}")
            for column, filter_conditions in request.filters.items():
                if column in df.columns and filter_conditions:
                    for condition in filter_conditions:
                        operator = condition.get("op") or condition.get("operator")
                        value = condition.get("value")
                        
                        if operator and value is not None:
                            try:
                                print(f"Applying filter: {column} {operator} {value}")
                                
                                # Apply filter based on operator
                                if operator == "=":
                                    df = df[df[column] == value]
                                elif operator == "!=":
                                    df = df[df[column] != value]
                                elif operator == ">":
                                    # Convert to numeric for comparison
                                    df[column] = pd.to_numeric(df[column], errors='coerce')
                                    df = df[df[column] > float(value)]
                                elif operator == "<":
                                    # Convert to numeric for comparison
                                    df[column] = pd.to_numeric(df[column], errors='coerce')
                                    df = df[df[column] < float(value)]
                                elif operator == ">=":
                                    # Convert to numeric for comparison
                                    df[column] = pd.to_numeric(df[column], errors='coerce')
                                    df = df[df[column] >= float(value)]
                                elif operator == "<=":
                                    # Convert to numeric for comparison
                                    df[column] = pd.to_numeric(df[column], errors='coerce')
                                    df = df[df[column] <= float(value)]
                                elif operator == "contains":
                                    df = df[df[column].astype(str).str.contains(str(value), case=False, na=False)]
                                elif operator == "in":
                                    # Handle list values for "in" operator
                                    if isinstance(value, list):
                                        df = df[df[column].isin(value)]
                                    elif isinstance(value, str):
                                        # Handle comma-separated values
                                        values = [v.strip() for v in value.split(",")]
                                        df = df[df[column].isin(values)]
                                
                                print(f"Filtered data now has {len(df)} rows")
                            except Exception as e:
                                print(f"Error applying filter for column {column}: {e}")
                                continue
        
        # Select only the required columns
        required_columns = [request.x_axis]
        if request.y_axis:
            required_columns.append(request.y_axis)
            
        filtered_df = df[required_columns]
        
        # Handle NaN and infinite values to make them JSON compliant
        filtered_df = filtered_df.replace([float('inf'), float('-inf')], None)
        filtered_df = filtered_df.where(pd.notna(filtered_df), None)
        
        # Convert DataFrame to list of dictionaries
        chart_data = filtered_df.to_dict('records')
        
        # Additional cleaning of the records to ensure JSON compliance
        for record in chart_data:
            for key, value in record.items():
                if isinstance(value, float) and pd.isna(value):
                    record[key] = None
        
        print(f"Returning {len(chart_data)} records for chart")
        
        return {
            "data": chart_data,
            "count": len(chart_data),
            "x_axis": request.x_axis,
            "y_axis": request.y_axis,
            "chart_type": request.chart_type
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_chart_data: {str(e)}")
        print(f"Error details: {error_details}")
        return {"error": f"Failed to get chart data: {str(e)}"}, 500

@app.get("/api/user/views")
def get_user_views(user_id: int = Query(1)):
    """Get all saved views for a user (max 5)"""
    try:
        conn = sqlite3.connect("user_views.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, slot, name, selected_columns, chart_config, filters, 
                   map_config, sort_config, pagination_config, created_at, updated_at 
            FROM user_views 
            WHERE user_id = ? 
            ORDER BY slot
        """, (user_id,))
        
        views = cursor.fetchall()
        conn.close()
        
        # Convert to list of dictionaries
        result = []
        for view in views:
            result.append({
                "slot": view["slot"],
                "name": view["name"],
                "selected_columns": view["selected_columns"],  # Keep as CSV string
                "chart_config": view["chart_config"],  # Keep as string
                "filters": view["filters"],  # Keep as JSON string
                "map_config": view["map_config"],  # Keep as JSON string
                "sort_config": view["sort_config"],  # Keep as JSON string
                "pagination_config": view["pagination_config"],  # Keep as JSON string
                "updated_at": view["updated_at"]
            })
        
        return {"views": result}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/user/views/{slot}")
def get_user_view(slot: int, user_id: int = Query(1)):
    """Get a specific saved view for a user by slot"""
    try:
        # Validate slot
        if slot < 1 or slot > 5:
            return {"error": "Slot must be between 1 and 5"}, 400
            
        conn = sqlite3.connect("user_views.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, slot, name, selected_columns, chart_config, filters, 
                   map_config, sort_config, pagination_config, created_at, updated_at 
            FROM user_views 
            WHERE user_id = ? AND slot = ?
        """, (user_id, slot))
        
        view = cursor.fetchone()
        conn.close()
        
        if not view:
            return {"error": "View not found"}, 404
            
        # Convert to dictionary
        result = {
            "slot": view["slot"],
            "name": view["name"],
            "selected_columns": view["selected_columns"],  # Keep as CSV string
            "chart_config": view["chart_config"],  # Keep as string
            "filters": view["filters"],  # Keep as JSON string
            "map_config": view["map_config"],  # Keep as JSON string
            "sort_config": view["sort_config"],  # Keep as JSON string
            "pagination_config": view["pagination_config"],  # Keep as JSON string
            "updated_at": view["updated_at"]
        }
        
        return result
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/user/views/{slot}")
def save_user_view(
    slot: int,
    view_data: ViewData,
    user_id: int = Query(1)
):
    """Save a user view"""
    try:
        # Validate slot
        if slot < 1 or slot > 5:
            return {"error": "Slot must be between 1 and 5"}, 400
        
        # Validate view name
        if not view_data.name or not view_data.name.strip():
            return {"error": "View name cannot be empty"}, 400
            
        # Validate selected_columns
        if not view_data.selected_columns or not view_data.selected_columns.strip():
            return {"error": "Selected columns cannot be empty"}, 400
            
        # Validate chart_config if provided
        if view_data.chart_config:
            try:
                # Try to parse JSON to validate it's valid
                json.loads(view_data.chart_config)
            except Exception:
                return {"error": "Invalid chart configuration format"}, 400
                
        # Validate filters if provided
        if view_data.filters:
            try:
                # Try to parse JSON to validate it's valid
                json.loads(view_data.filters)
            except Exception:
                return {"error": "Invalid filters format"}, 400
            
        conn = sqlite3.connect("user_views.db")
        cursor = conn.cursor()
        
        # Check if a view already exists in this slot for this user
        cursor.execute("""
            SELECT id FROM user_views 
            WHERE user_id = ? AND slot = ?
        """, (user_id, slot))
        
        existing_view = cursor.fetchone()
        
        if existing_view:
            # Update existing view
            cursor.execute("""
                UPDATE user_views 
                SET name = ?, selected_columns = ?, chart_config = ?, filters = ?, 
                    map_config = ?, sort_config = ?, pagination_config = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND slot = ?
            """, (view_data.name, view_data.selected_columns, view_data.chart_config, view_data.filters, 
                  view_data.map_config, view_data.sort_config, view_data.pagination_config, user_id, slot))
        else:
            # Insert new view
            cursor.execute("""
                INSERT INTO user_views (user_id, slot, name, selected_columns, chart_config, filters, 
                                      map_config, sort_config, pagination_config)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, slot, view_data.name, view_data.selected_columns, view_data.chart_config, view_data.filters,
                  view_data.map_config, view_data.sort_config, view_data.pagination_config))
        
        conn.commit()
        conn.close()
        
        return {
            "slot": slot,
            "name": view_data.name,
            "selected_columns": view_data.selected_columns,
            "chart_config": view_data.chart_config,
            "filters": view_data.filters,
            "map_config": view_data.map_config,
            "sort_config": view_data.sort_config,
            "pagination_config": view_data.pagination_config,
            "updated_at": "2025-09-30T12:34:56Z"  # Placeholder for actual timestamp
        }
    except Exception as e:
        return {"error": f"Failed to save view: {str(e)}"}, 500

@app.delete("/api/user/views/{slot}")
def delete_user_view(slot: int, user_id: int = Query(1)):
    """Delete a user view"""
    try:
        # Validate slot
        if slot < 1 or slot > 5:
            return {"error": "Slot must be between 1 and 5"}, 400
            
        conn = sqlite3.connect("user_views.db")
        cursor = conn.cursor()
        
        cursor.execute("""
            DELETE FROM user_views 
            WHERE user_id = ? AND slot = ?
        """, (user_id, slot))
        
        conn.commit()
        conn.close()
        
        return {"message": f"View slot {slot} cleared successfully"}
    except Exception as e:
        return {"error": str(e)}

# === NEW VIEW MANAGEMENT SYSTEM ===

@app.post("/api/views/{view_name}")
def save_update_view(view_name: str, view_data: NewViewData):
    """Save or update a view for a user"""
    try:
        # Validate view name
        if not view_name or not view_name.strip():
            return {"error": "View name cannot be empty"}, 400
            
        # Validate that view_name is one of the allowed values (View 1-5)
        allowed_view_names = ["View 1", "View 2", "View 3", "View 4", "View 5"]
        if view_name not in allowed_view_names:
            return {"error": "View name must be one of: View 1, View 2, View 3, View 4, View 5"}, 400
            
        # Validate selected columns
        if not view_data.selected_columns or len(view_data.selected_columns) == 0:
            return {"error": "Selected columns cannot be empty"}, 400
            
        # Convert selected columns to comma-separated string
        selected_columns_str = ",".join(view_data.selected_columns)
        
        conn = sqlite3.connect("user_views.db")
        cursor = conn.cursor()
        
        # Check if a view already exists with this name for this user
        cursor.execute("""
            SELECT id FROM saved_views 
            WHERE user_id = ? AND view_name = ?
        """, (view_data.user_id, view_name))
        
        existing_view = cursor.fetchone()
        
        if existing_view:
            # Update existing view
            cursor.execute("""
                UPDATE saved_views 
                SET selected_columns = ?, created_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND view_name = ?
            """, (selected_columns_str, view_data.user_id, view_name))
        else:
            # Insert new view
            cursor.execute("""
                INSERT INTO saved_views (user_id, view_name, selected_columns)
                VALUES (?, ?, ?)
            """, (view_data.user_id, view_name, selected_columns_str))
        
        conn.commit()
        conn.close()
        
        return {
            "message": f"View '{view_name}' saved successfully",
            "view_name": view_name,
            "user_id": view_data.user_id,
            "selected_columns": view_data.selected_columns
        }
    except Exception as e:
        return {"error": f"Failed to save view: {str(e)}"}, 500

@app.get("/api/views/{view_name}/data")
def load_view_data(view_name: str, user_id: int = Query(...)):
    """Load a view with filtered data"""
    try:
        # Validate that view_name is one of the allowed values (View 1-5)
        allowed_view_names = ["View 1", "View 2", "View 3", "View 4", "View 5"]
        if view_name not in allowed_view_names:
            return {"error": "View name must be one of: View 1, View 2, View 3, View 4, View 5"}, 400
            
        # Fetch saved view from DB
        conn = sqlite3.connect("user_views.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT selected_columns FROM saved_views 
            WHERE user_id = ? AND view_name = ?
        """, (user_id, view_name))
        
        view = cursor.fetchone()
        conn.close()
        
        if not view:
            return {"error": "View not found"}, 404
            
        # Extract saved columns (split by comma)
        selected_columns_str = view["selected_columns"]
        selected_columns = selected_columns_str.split(",") if selected_columns_str else []
        
        # Validate against allowed dataset columns (to prevent SQL injection)
        allowed_columns = get_allowed_columns()
        
        # Filter selected columns to only include allowed ones
        validated_columns = [col for col in selected_columns if col in allowed_columns]
        
        if not validated_columns:
            return {"error": "No valid columns found in view"}, 400
            
        # Use the processed data instead of reading CSV
        df = get_data()
        if df is None or df.empty:
            raise HTTPException(status_code=500, detail="No data available")
        
        # Filter DataFrame to only include selected columns
        filtered_df = df[validated_columns]
        
        # Handle NaN and infinite values to make them JSON compliant
        # Replace infinite values with None
        filtered_df = filtered_df.replace([float('inf'), float('-inf')], None)
        
        # Replace NaN values with None
        filtered_df = filtered_df.where(pd.notna(filtered_df), None)
        
        # Convert DataFrame to list of dictionaries
        filtered_data = filtered_df.to_dict('records')
        
        return {
            "view_name": view_name,
            "user_id": user_id,
            "selected_columns": validated_columns,
            "data": filtered_data
        }
    except Exception as e:
        # Log the full error for debugging
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in load_view_data: {str(e)}")
        print(f"Error details: {error_details}")
        return {"error": f"Failed to load view data: {str(e)}"}, 500

@app.get("/api/views/{view_name}/map")
def get_map_view(view_name: str, user_id: int = Query(...)):
    """Get map markers for a saved view"""
    try:
        # Validate that view_name is one of the allowed values (View 1-5)
        allowed_view_names = ["View 1", "View 2", "View 3", "View 4", "View 5"]
        if view_name not in allowed_view_names:
            return {"error": "View name must be one of: View 1, View 2, View 3, View 4, View 5"}, 400
            
        # Fetch saved view from DB
        conn = sqlite3.connect("user_views.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT selected_columns FROM saved_views 
            WHERE user_id = ? AND view_name = ?
        """, (user_id, view_name))
        
        view = cursor.fetchone()
        conn.close()
        
        if not view:
            return {"markers": []}
            
        # Extract saved columns (split by comma)
        selected_columns_str = view["selected_columns"]
        selected_columns = selected_columns_str.split(",") if selected_columns_str else []
        
        # Validate against allowed dataset columns (to prevent SQL injection)
        allowed_columns = get_allowed_columns()
        
        # Filter selected columns to only include allowed ones
        validated_columns = [col for col in selected_columns if col in allowed_columns]
        
        # Check if location-related columns are included
        # Common location column names in the dataset
        location_columns = [
            "Spatial Coordinates", 
            "Latitude", 
            "Longitude", 
            "lat", 
            "lng", 
            "location"
        ]
        
        has_location = any(col in validated_columns for col in location_columns)
        
        if not has_location:
            # If no location column is selected, return empty markers
            return {"markers": []}
            
        # Use the processed data instead of reading CSV
        df = get_data()
        if df is None or df.empty:
            return {"markers": []}
        
        # Filter DataFrame to only include selected columns
        filtered_df = df[validated_columns]
        
        # Handle NaN and infinite values to make them JSON compliant
        # Replace infinite values with None
        filtered_df = filtered_df.replace([float('inf'), float('-inf')], None)
        
        # Replace NaN values with None
        filtered_df = filtered_df.where(pd.notna(filtered_df), None)
        
        # Convert DataFrame to list of dictionaries
        filtered_data = filtered_df.to_dict('records')
        
        # Process data to extract map markers
        markers = []
        for row in filtered_data:
            # Look for location data in the row
            spatial_coords = None
            
            # Check for spatial coordinates column first
            if "Spatial Coordinates" in row and row["Spatial Coordinates"]:
                spatial_coords = row["Spatial Coordinates"]
            # Check for other possible location columns
            elif "Latitude" in row and "Longitude" in row and row["Latitude"] is not None and row["Longitude"] is not None:
                spatial_coords = f"{row['Latitude']}, {row['Longitude']}"
            
            # If we have location data, create a marker
            if spatial_coords:
                try:
                    # Parse coordinates (format: "lat, lng")
                    coords = spatial_coords.strip('"').split(', ')
                    if len(coords) == 2:
                        lat = float(coords[0])
                        lng = float(coords[1])
                        
                        # Skip invalid coordinates
                        if pd.isna(lat) or pd.isna(lng):
                            continue
                        
                        # Get site name if available
                        site_name = row.get('Site Name', 'Unknown Site')
                        if pd.isna(site_name):
                            site_name = 'Unknown Site'
                        
                        # Create marker with location and info
                        marker = {
                            "position": [lat, lng],
                            "site_name": site_name,
                            "info": {col: row[col] for col in validated_columns if col != "Spatial Coordinates"}
                        }
                        
                        markers.append(marker)
                except (ValueError, IndexError):
                    # Skip rows with invalid coordinates
                    continue
        
        return {"markers": markers}
        
    except Exception as e:
        # Log the full error for debugging
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_map_view: {str(e)}")
        print(f"Error details: {error_details}")
        return {"error": f"Failed to load map view data: {str(e)}"}, 500

# New endpoint to get filtered map data with additional filters
@app.post("/api/views/{view_name}/map-data")
def get_filtered_map_data(view_name: str, request_data: dict = Body(default={})):
    """Get map markers for a saved view with additional filters applied"""
    print("=== DEBUG: get_filtered_map_data called ===")
    print(f"view_name: {view_name}")
    print(f"request_data: {request_data}")
    
    try:
        # Extract filters and selected_columns from request data
        filters = request_data.get("filters", {})
        selected_columns = request_data.get("selected_columns", [
            "site_name", "latitude", "longitude", "voltage_level", 
            "available_power", "network_operator"
        ])
        
        print(f"get_filtered_map_data called with view_name: {view_name}, filters: {filters}, selected_columns: {selected_columns}")
        print(f"Number of selected columns: {len(selected_columns)}")
        print(f"Selected columns details: {selected_columns}")
        
        # Validate that view_name is one of the allowed values (View 1-5)
        allowed_view_names = ["View 1", "View 2", "View 3", "View 4", "View 5"]
        if view_name not in allowed_view_names:
            print(f"Invalid view name: {view_name}")
            return {"error": "View name must be one of: View 1, View 2, View 3, View 4, View 5"}, 400
            
        # Use the processed data instead of reading CSV
        df = get_data()
        if df is None or df.empty:
            print("No data available")
            return {
                "count": 0,
                "rows": []
            }
        print(f"Loaded data with {len(df)} rows")
        print(f"Available columns in CSV: {list(df.columns)}")
        
        # Apply filters if provided
        if filters:
            print(f"Applying filters: {filters}")
            for column, filter_conditions in filters.items():
                # Map frontend column names to CSV column names
                column_mapping = {
                    "site_name": "Site Name",
                    "voltage_level": "Site Voltage",
                    "available_power": "Generation Capacity",
                    "network_operator": "Licence Area"
                }
                
                # Get the actual column name in the CSV
                csv_column = column_mapping.get(column, column)
                
                if csv_column in df.columns and filter_conditions:
                    for condition in filter_conditions:
                        operator = condition.get("op") or condition.get("operator")
                        value = condition.get("value")
                        
                        if operator and value is not None:
                            try:
                                print(f"Applying filter: {csv_column} {operator} {value}")
                                
                                # Apply filter based on operator
                                if operator == "=":
                                    df = df[df[csv_column] == value]
                                elif operator == "!=":
                                    df = df[df[csv_column] != value]
                                elif operator == ">":
                                    # Convert to numeric for comparison
                                    df[csv_column] = pd.to_numeric(df[csv_column], errors='coerce')
                                    df = df[df[csv_column] > float(value)]
                                elif operator == "<":
                                    # Convert to numeric for comparison
                                    df[csv_column] = pd.to_numeric(df[csv_column], errors='coerce')
                                    df = df[df[csv_column] < float(value)]
                                elif operator == ">=":
                                    # Convert to numeric for comparison
                                    df[csv_column] = pd.to_numeric(df[csv_column], errors='coerce')
                                    df = df[df[csv_column] >= float(value)]
                                elif operator == "<=":
                                    # Convert to numeric for comparison
                                    df[csv_column] = pd.to_numeric(df[csv_column], errors='coerce')
                                    df = df[df[csv_column] <= float(value)]
                                elif operator == "contains":
                                    df = df[df[csv_column].astype(str).str.contains(str(value), case=False, na=False)]
                                elif operator == "in":
                                    # Handle list values for "in" operator
                                    if isinstance(value, list):
                                        df = df[df[csv_column].isin(value)]
                                    elif isinstance(value, str):
                                        # Handle comma-separated values
                                        values = [v.strip() for v in value.split(",")]
                                        df = df[df[csv_column].isin(values)]
                                
                                print(f"Filtered data now has {len(df)} rows")
                            except Exception as e:
                                print(f"Error applying filter for column {csv_column}: {e}")
                                continue
        
        print(f"Data after filtering has {len(df)} rows")
        
        # Extract map data with coordinates
        rows = []
        for index, row in df.iterrows():
            # Get spatial coordinates
            spatial_coords = row.get('Spatial Coordinates')
            if pd.isna(spatial_coords) or spatial_coords == '\\N':
                continue
                
            # Parse coordinates (format: "lat, lng")
            try:
                coords = spatial_coords.strip().split(', ')
                if len(coords) == 2:
                    lat = float(coords[0])
                    lng = float(coords[1])
                    
                    # Skip invalid coordinates
                    if pd.isna(lat) or pd.isna(lng):
                        continue
                    
                    # Create row with selected columns
                    result_row = {}
                    
                    # Add coordinates
                    result_row["latitude"] = lat
                    result_row["longitude"] = lng
                    
                    # Map and add other selected columns
                    column_mapping = {
                        # Frontend column names (from original_name in JSON)
                        "site_name": "Site Name",
                        "voltage_level": "Site Voltage", 
                        "available_power": "Generation Capacity",
                        "network_operator": "Licence Area",
                        "spatial_coordinates": "Spatial Coordinates",
                        "site_type": "Site Type",
                        "county": "County",
                        "postcode": "Postcode",
                        "local_authority": "Local Authority",
                        "max_demand_summer": "Max Demand Summer",
                        "max_demand_winter": "Max Demand Winter",
                        "installed_capacity": "Installed Capacity MVA",
                        "power_transformer_count": "Power Transformer Count",
                        "assessment_date": "Assessment Date",
                        "date_commissioned": "Date Commissioned",
                        "licence_area": "Licence Area",
                        "site_voltage": "Site Voltage",
                        "generation_headroom_mw": "Generation Headroom Mw",
                        "site_classification": "Site Classification",
                        "site_functional_location": "Site Functional Location",
                        "what3words": "What3Words",
                        # Direct CSV column names (for exact matches)
                        "Site Name": "Site Name",
                        "Site Voltage": "Site Voltage",
                        "Generation Headroom Mw": "Generation Headroom Mw",
                        "Licence Area": "Licence Area",
                        "Spatial Coordinates": "Spatial Coordinates",
                        "Site Type": "Site Type",
                        "County": "County",
                        "Postcode": "Postcode",
                        "Local Authority": "Local Authority",
                        "Max Demand Summer": "Max Demand Summer",
                        "Max Demand Winter": "Max Demand Winter",
                        "Installed Capacity MVA": "Installed Capacity MVA",
                        "Power Transformer Count": "Power Transformer Count",
                        "Assessment Date": "Assessment Date",
                        "Date Commissioned": "Date Commissioned",
                        "Site Classification": "Site Classification",
                        "Site Functional Location": "Site Functional Location",
                        "What3Words": "What3Words",
                        # Special handling for coordinates
                        "latitude": "Spatial Coordinates",  # Map to actual CSV column
                        "longitude": "Spatial Coordinates",  # Map to actual CSV column
                    }
                    
                    # Check if this row has data for the selected columns
                    has_required_data = True
                    for frontend_col in selected_columns:
                        if frontend_col == "latitude" or frontend_col == "longitude":
                            # These are extracted from Spatial Coordinates, so they're always available if we have coordinates
                            continue
                        elif frontend_col in column_mapping:
                            csv_col = column_mapping[frontend_col]
                            if csv_col in row and not pd.isna(row[csv_col]) and row[csv_col] != '':
                                result_row[frontend_col] = row[csv_col]
                            else:
                                has_required_data = False
                                break
                        else:
                            # For any other columns, try multiple strategies to find a match
                            possible_matches = [
                                frontend_col,  # Try exact match first
                                frontend_col.replace("_", " ").title(),  # Replace underscores and title case
                                frontend_col.replace("_", " "),  # Just replace underscores
                                frontend_col.title(),  # Just title case
                                frontend_col.lower(),  # Lowercase
                                frontend_col.upper(),  # Uppercase
                            ]
                            
                            found_match = False
                            for csv_col in possible_matches:
                                if csv_col in row and not pd.isna(row[csv_col]) and row[csv_col] != '':
                                    result_row[frontend_col] = row[csv_col]
                                    found_match = True
                                    break
                            
                            if not found_match:
                                has_required_data = False
                                break
                    
                    # Only add this row if it has data for all selected columns
                    if has_required_data:
                        rows.append(result_row)
            except (ValueError, IndexError):
                # Skip rows with invalid coordinates
                continue
                
        print(f"Created {len(rows)} rows")
        print(f"Filtering stats: Started with {len(df)} rows, filtered to {len(rows)} rows")
        print(f"Selected columns used for filtering: {selected_columns}")
        if len(rows) > 0:
            print(f"Sample filtered row: {rows[0]}")
        else:
            print("WARNING: No rows passed the filtering criteria!")
            print("This might be due to:")
            print("1. Selected columns not matching CSV column names")
            print("2. Rows missing data for required columns")
            print("3. Invalid coordinate data")
        print("=== DEBUG: Returning new format ===")
        return {
            "count": len(rows),
            "rows": rows
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_filtered_map_data: {str(e)}")
        print(f"Error details: {error_details}")
        return {"error": f"Failed to load filtered map data: {str(e)}"}, 500

@app.post("/api/map-data")
def get_homepage_map_data(request_data: dict = Body(default={})):
    """Get map markers for the home page with filters applied"""
    print("=== DEBUG: get_homepage_map_data called ===")
    print(f"request_data: {request_data}")
    
    try:
        # Extract filters and selected_columns from request data
        filters = request_data.get("filters", {})
        selected_columns = request_data.get("selected_columns", [
            "site_name", "latitude", "longitude", "voltage_level", 
            "available_power", "network_operator"
        ])
        print(f"Applying filters: {filters}")
        print(f"Selected columns: {selected_columns}")
        
        # Check if location-related columns are included
        location_columns = ["latitude", "longitude", "Spatial Coordinates"]
        has_location = any(col in selected_columns for col in location_columns)
        
        if not has_location:
            print("No location columns in selected_columns, returning empty result")
            return {
                "rows": [],
                "count": 0
            }
        
        # Use the processed data instead of reading CSV
        df = get_data()
        if df is None or df.empty:
            print("No data available")
            return {
                "rows": [],
                "count": 0
            }
        print(f"Loaded data with {len(df)} rows")
        
        # Build SQL-like query dynamically with WHERE clauses
        # In this case, we're using pandas filtering which is equivalent
        
        # Apply Site Name filter (ILIKE equivalent)
        if "site_name" in filters and filters["site_name"]:
            site_name_filter = filters["site_name"]
            df = df[df["Site Name"].str.contains(site_name_filter, case=False, na=False)]
            print(f"Applied site name filter: {site_name_filter}, rows now: {len(df)}")
        
        # Apply Voltage Level filter (= equivalent)
        if "voltage_level" in filters and filters["voltage_level"]:
            voltage_filter = filters["voltage_level"]
            df = df[df["Site Voltage"] == voltage_filter]
            print(f"Applied voltage level filter: {voltage_filter}, rows now: {len(df)}")
        
        # Apply Generation Capacity filter (>= equivalent)
        if "available_power" in filters and filters["available_power"] is not None:
            power_filter = float(filters["available_power"])
            # Convert to numeric for comparison
            df["Generation Capacity"] = pd.to_numeric(df["Generation Capacity"], errors='coerce')
            df = df[df["Generation Capacity"] >= power_filter]
            print(f"Applied generation capacity filter: >= {power_filter}, rows now: {len(df)}")
        
        # Apply Network Operator filter (= equivalent)
        if "network_operator" in filters and filters["network_operator"]:
            operator_filter = filters["network_operator"]
            df = df[df["Licence Area"] == operator_filter]
            print(f"Applied network operator filter: {operator_filter}, rows now: {len(df)}")
        
        print(f"Data after all filtering has {len(df)} rows")
        
        # Extract map data with coordinates
        rows = []
        for index, row in df.iterrows():
            # Get spatial coordinates
            spatial_coords = row.get('Spatial Coordinates')
            if pd.isna(spatial_coords) or spatial_coords == '\\N':
                continue
                
            # Parse coordinates (format: "lat, lng")
            try:
                coords = spatial_coords.strip().split(', ')
                if len(coords) == 2:
                    lat = float(coords[0])
                    lng = float(coords[1])
                    
                    # Skip invalid coordinates
                    if pd.isna(lat) or pd.isna(lng):
                        continue
                    
                    # Create row with selected columns
                    result_row = {}
                    
                    # Add coordinates
                    result_row["latitude"] = lat
                    result_row["longitude"] = lng
                    
                    # Map and add other selected columns
                    column_mapping = {
                        # Frontend column names (from original_name in JSON)
                        "site_name": "Site Name",
                        "voltage_level": "Site Voltage", 
                        "available_power": "Generation Capacity",
                        "network_operator": "Licence Area",
                        "spatial_coordinates": "Spatial Coordinates",
                        "site_type": "Site Type",
                        "county": "County",
                        "postcode": "Postcode",
                        "local_authority": "Local Authority",
                        "max_demand_summer": "Max Demand Summer",
                        "max_demand_winter": "Max Demand Winter",
                        "installed_capacity": "Installed Capacity MVA",
                        "power_transformer_count": "Power Transformer Count",
                        "assessment_date": "Assessment Date",
                        "date_commissioned": "Date Commissioned",
                        "licence_area": "Licence Area",
                        "site_voltage": "Site Voltage",
                        "generation_headroom_mw": "Generation Headroom Mw",
                        "site_classification": "Site Classification",
                        "site_functional_location": "Site Functional Location",
                        "what3words": "What3Words",
                        # Direct CSV column names (for exact matches)
                        "Site Name": "Site Name",
                        "Site Voltage": "Site Voltage",
                        "Generation Headroom Mw": "Generation Headroom Mw",
                        "Licence Area": "Licence Area",
                        "Spatial Coordinates": "Spatial Coordinates",
                        "Site Type": "Site Type",
                        "County": "County",
                        "Postcode": "Postcode",
                        "Local Authority": "Local Authority",
                        "Max Demand Summer": "Max Demand Summer",
                        "Max Demand Winter": "Max Demand Winter",
                        "Installed Capacity MVA": "Installed Capacity MVA",
                        "Power Transformer Count": "Power Transformer Count",
                        "Assessment Date": "Assessment Date",
                        "Date Commissioned": "Date Commissioned",
                        "Site Classification": "Site Classification",
                        "Site Functional Location": "Site Functional Location",
                        "What3Words": "What3Words",
                        # Special handling for coordinates
                        "latitude": "Spatial Coordinates",  # Map to actual CSV column
                        "longitude": "Spatial Coordinates",  # Map to actual CSV column
                    }
                    
                    # Check if this row has data for the selected columns
                    has_required_data = True
                    for frontend_col in selected_columns:
                        if frontend_col == "latitude" or frontend_col == "longitude":
                            # These are extracted from Spatial Coordinates, so they're always available if we have coordinates
                            continue
                        elif frontend_col in column_mapping:
                            csv_col = column_mapping[frontend_col]
                            if csv_col in row and not pd.isna(row[csv_col]) and row[csv_col] != '':
                                result_row[frontend_col] = row[csv_col]
                            else:
                                has_required_data = False
                                break
                        else:
                            # For any other columns, try multiple strategies to find a match
                            possible_matches = [
                                frontend_col,  # Try exact match first
                                frontend_col.replace("_", " ").title(),  # Replace underscores and title case
                                frontend_col.replace("_", " "),  # Just replace underscores
                                frontend_col.title(),  # Just title case
                                frontend_col.lower(),  # Lowercase
                                frontend_col.upper(),  # Uppercase
                            ]
                            
                            found_match = False
                            for csv_col in possible_matches:
                                if csv_col in row and not pd.isna(row[csv_col]) and row[csv_col] != '':
                                    result_row[frontend_col] = row[csv_col]
                                    found_match = True
                                    break
                            
                            if not found_match:
                                has_required_data = False
                                break
                    
                    # Only add this row if it has data for all selected columns
                    if has_required_data:
                        rows.append(result_row)
            except (ValueError, IndexError):
                # Skip rows with invalid coordinates
                continue
                
        print(f"Created {len(rows)} rows for response")
        return {
            "rows": rows,
            "count": len(rows)
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_homepage_map_data: {str(e)}")
        print(f"Error details: {error_details}")
        return {"error": f"Failed to load filtered map data: {str(e)}"}, 500

def get_allowed_columns():
    """Get list of allowed columns to prevent SQL injection"""
    try:
        # Use the processed data to get actual column names
        df = get_data()
        if df is not None and not df.empty:
            return list(df.columns)
        else:
            # Fallback to a predefined list if data is not available
            return [
                "Site Name", "Site Type", "Site Voltage", "County", "Licence Area",
                "Bulk Supply Point", "Constraint description", "Constraint Occurrence Year",
                "Generation Headroom Mw", "ECR MW", "Total ECR MW", "Primary Voltage (Kv)",
                "Primary Rating (MVA)", "Primary X (Ohm)", "Primary Y (Ohm)", "Primary Z (Ohm)",
                "Primary R (Ohm)", "Spatial Coordinates"
            ]
    except Exception:
        # Fallback to a predefined list if data reading fails
        return [
            "Site Name", "Site Type", "Site Voltage", "County", "Licence Area",
            "Bulk Supply Point", "Constraint description", "Constraint Occurrence Year",
            "Generation Headroom Mw", "ECR MW", "Total ECR MW", "Primary Voltage (Kv)",
            "Primary Rating (MVA)", "Primary X (Ohm)", "Primary Y (Ohm)", "Primary Z (Ohm)",
            "Primary R (Ohm)", "Spatial Coordinates"
        ]

# === END NEW VIEW MANAGEMENT SYSTEM ===

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)