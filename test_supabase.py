import psycopg2

# 👉 替换成你的真实密码
DB_CONFIG = {
    "host": "aws-1-ap-northeast-1.pooler.supabase.com",
    "port": 5432,
    "dbname": "postgres",
    "user": "postgres.wmrjcfagtdceirtfqrgf",
    "password": "kXCFLxZF7aRUGNIf"
}

try:
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    cur.execute("SELECT 1;")
    cur.fetchone()
    print("SUCCESS")
    conn.close()

except psycopg2.OperationalError as e:
    print("CONNECTION FAILED:")
    print(e)

except Exception as e:
    print("ERROR:")
    print(e)