import duckdb

con = duckdb.connect()
con.execute("INSTALL mysql;")
con.execute("LOAD mysql;")

print("Connecting to local MySQL database 'agent_verse' on localhost:3306...")
try:
    con.execute("ATTACH 'host=127.0.0.1 port=3306 user=root db=agent_verse' AS local_mysql (TYPE MYSQL, READ_ONLY);")
    print("[SUCCESS] Attached local MySQL database.")
    
    # List tables in local_mysql
    tables = con.execute("SELECT table_name FROM duckdb_tables WHERE database_name = 'local_mysql';").fetchall()
    print("Tables in local MySQL:", [t[0] for t in tables])
    
    for t in [t[0] for t in tables]:
        count = con.execute(f"SELECT COUNT(*) FROM local_mysql.{t}").fetchone()[0]
        print(f"  Table '{t}': {count} rows")
        if count > 0:
            sample = con.execute(f"SELECT * FROM local_mysql.{t} LIMIT 2").fetchall()
            print("    Sample:", sample)
except Exception as e:
    print("[FAILURE] Could not attach/query local MySQL:", e)
con.close()
