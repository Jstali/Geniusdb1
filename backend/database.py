"""
Database configuration and connection management
Supports both PostgreSQL (production) and SQLite (development fallback)
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
import sqlite3
from contextlib import contextmanager

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "geniusdb")
POSTGRES_USER = os.getenv("POSTGRES_USER", "geniususer")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "changeme123")

# Connection pool for PostgreSQL
connection_pool = None

def use_postgres():
    """Check if PostgreSQL should be used"""
    return DATABASE_URL is not None or POSTGRES_HOST != "localhost"

def init_postgres_pool():
    """Initialize PostgreSQL connection pool"""
    global connection_pool
    try:
        if DATABASE_URL:
            connection_pool = pool.SimpleConnectionPool(
                1, 20,
                DATABASE_URL
            )
        else:
            connection_pool = pool.SimpleConnectionPool(
                1, 20,
                host=POSTGRES_HOST,
                port=POSTGRES_PORT,
                database=POSTGRES_DB,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD
            )
        print("✓ PostgreSQL connection pool initialized")
        return True
    except Exception as e:
        print(f"✗ Failed to initialize PostgreSQL pool: {e}")
        return False

@contextmanager
def get_db_connection():
    """
    Get database connection (PostgreSQL or SQLite fallback)
    Usage:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # ... use cursor
    """
    if use_postgres() and connection_pool:
        conn = connection_pool.getconn()
        try:
            yield conn
        finally:
            connection_pool.putconn(conn)
    else:
        # Fallback to SQLite
        conn = sqlite3.connect("user_views.db")
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

@contextmanager
def get_db_cursor(dict_cursor=True):
    """
    Get database cursor with automatic connection management
    Usage:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM users")
            results = cursor.fetchall()
    """
    with get_db_connection() as conn:
        if use_postgres() and connection_pool:
            cursor = conn.cursor(cursor_factory=RealDictCursor if dict_cursor else None)
        else:
            cursor = conn.cursor()
        try:
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()

def init_database():
    """Initialize database schema"""
    if use_postgres():
        init_postgres_schema()
    else:
        init_sqlite_schema()

def init_postgres_schema():
    """Initialize PostgreSQL database schema"""
    try:
        with get_db_cursor() as cursor:
            # Create user_views table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_views (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    slot INTEGER NOT NULL,
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
                )
            """)
            
            # Create saved_views table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS saved_views (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    view_name VARCHAR(255) NOT NULL,
                    selected_columns TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, view_name)
                )
            """)
            
            # Create index for faster queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_user_views_user_id 
                ON user_views(user_id)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_saved_views_user_id 
                ON saved_views(user_id)
            """)
            
            print("✓ PostgreSQL database schema initialized")
    except Exception as e:
        print(f"✗ Error initializing PostgreSQL schema: {e}")
        raise

def init_sqlite_schema():
    """Initialize SQLite database schema (fallback)"""
    try:
        conn = sqlite3.connect("user_views.db")
        cursor = conn.cursor()
        
        # Create user_views table
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
        
        # Create saved_views table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS saved_views (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                view_name TEXT NOT NULL,
                selected_columns TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, view_name)
            )
        """)
        
        conn.commit()
        conn.close()
        print("✓ SQLite database schema initialized (fallback mode)")
    except Exception as e:
        print(f"✗ Error initializing SQLite schema: {e}")
        raise

# Initialize connection pool on module import
if use_postgres():
    init_postgres_pool()

