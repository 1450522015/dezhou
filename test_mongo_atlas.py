from pymongo import MongoClient

# 👉 配置
URI = "mongodb+srv://lyf17190307298_db_user:63j1FNNed4yqm5dV@dev.xlug79g.mongodb.net/?appName=dev"
DB_NAME = "dev"

TEST_COLLECTION = "__test__"

try:
    client = MongoClient(URI, serverSelectionTimeoutMS=5000)

    # 1️⃣ 测试连接
    client.admin.command("ping")

    db = client[DB_NAME]

    # 2️⃣ 读写测试
    col = db[TEST_COLLECTION]
    col.insert_one({"ok": True})
    doc = col.find_one({"ok": True})
    col.drop()

    if doc:
        print("SUCCESS")
    else:
        print("FAILED: read/write error")

    client.close()

except Exception as e:
    print("FAILED:")
    print(e)