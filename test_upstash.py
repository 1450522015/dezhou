from upstash_redis import Redis

# 👉 你的配置（可直接写死，也可以换成环境变量）
URL = "https://dominant-snipe-95195.upstash.io"
TOKEN = "gQAAAAAAAXPbAAIncDJjYjAwNjQwYjI5MWM0OTY0ODAxOTBkNDM3NmJiNWQwZnAyOTUxOTU"

TEST_KEY = "__test__"

try:
    r = Redis(url=URL, token=TOKEN)

    r.set(TEST_KEY, "ok")
    val = r.get(TEST_KEY)
    r.delete(TEST_KEY)

    if val == "ok":
        print("SUCCESS")
    else:
        print(f"FAILED: value mismatch -> {val}")

except Exception as e:
    print("FAILED:")
    print(e)