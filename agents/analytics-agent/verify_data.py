import os
import duckdb
from pathlib import Path
from dotenv import load_dotenv

# Load env variables from .env file
env_path = Path(".env")
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print("Loaded environment variables from .env")

# Connect to a brand new IN-MEMORY DuckDB connection to avoid locking data/analytics.db
print("Connecting to an IN-MEMORY DuckDB connection to inspect RDS...")
con = duckdb.connect()

print("\n--- TESTING RDS MYSQL CONNECTIONS DIRECTLY (IN-MEMORY) ---")
con.execute("INSTALL mysql;")
con.execute("LOAD mysql;")

sources = ["challan_payment", "service_history_payments", "buy_fastag_payment"]
for src in sources:
    prefix = ""
    if src == "challan_payment":
        prefix = "RDS_CHALLAN_"
    elif src == "service_history_payments":
        prefix = "RDS_SERVICE_HISTORY_"
    elif src == "buy_fastag_payment":
        prefix = "RDS_FASTAG_"
        
    host = os.getenv(f"{prefix}HOST") or os.getenv("RDS_HOST")
    port = os.getenv(f"{prefix}PORT") or os.getenv("RDS_PORT", "3306")
    user = os.getenv(f"{prefix}USER") or os.getenv("RDS_USER")
    password = os.getenv(f"{prefix}PASSWORD") or os.getenv("RDS_PASSWORD", "")
    db = os.getenv(f"{prefix}DATABASE") or os.getenv("RDS_DATABASE")
    table = os.getenv(f"{prefix}TABLE") or src
    
    print(f"\nChecking source '{src}':")
    print(f"  Target MySQL DB details: Host={host}, Port={port}, User={user}, Database={db}, Table={table}")
    
    if not host or not user or not db:
        print(f"  [ERROR] Missing connection credentials for prefix {prefix}")
        continue

    alias = f"test_mysql_{src}"
    try:
        con.execute(f"DETACH DATABASE IF EXISTS {alias};")
    except Exception:
        pass
        
    parts = [
        f"host={host}",
        f"port={port}",
        f"user={user}",
        f"db={db}"
    ]
    if password:
        cleaned_pwd = password.strip("'\"")
        parts.append(f"passwd={cleaned_pwd}")
        
    conn_str = " ".join(parts)
    attach_query = f"ATTACH '{conn_str}' AS {alias} (TYPE MYSQL, READ_ONLY);"
    
    try:
        con.execute(attach_query)
        print(f"  [SUCCESS] Successfully attached RDS database as {alias}")
        
        # Check if table exists in attached schema
        tbl_count = con.execute(f"SELECT COUNT(*) FROM {alias}.{table}").fetchone()[0]
        print(f"  [SUCCESS] Remote table '{table}' has {tbl_count} rows in RDS MySQL")
        
        # Sample date ranges in RDS MySQL
        date_col = "created_at"
        max_min_date = con.execute(f"SELECT MIN({date_col}), MAX({date_col}) FROM {alias}.{table}").fetchone()
        print(f"  [INFO] Date range in RDS MySQL ({date_col}): Min={max_min_date[0]}, Max={max_min_date[1]}")
        
        # Check rows in the last 7 days (after 2026-06-17)
        recent_count = con.execute(f"SELECT COUNT(*) FROM {alias}.{table} WHERE {date_col} >= '2026-06-17'").fetchone()[0]
        print(f"  [INFO] Rows in MySQL >= 2026-06-17: {recent_count}")
        
    except Exception as e:
        print(f"  [FAILURE] Failed to attach/query MySQL source: {e}")
    finally:
        try:
            con.execute(f"DETACH DATABASE IF EXISTS {alias};")
        except Exception:
            pass

con.close()
print("\nDone checking RDS MySQL connection profiles.")
