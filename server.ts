import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Redis from "ioredis";
import RedisMock from "ioredis-mock";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  const redisUrl = process.env.REDIS_URL;
  const redis = redisUrl ? new Redis(redisUrl) : new (RedisMock as any)();
  if (!redisUrl) {
    console.log("REDIS_URL not found. Using in-memory ioredis-mock.");
  }

  // API Routes
  
  // 1. Sync pull
  app.post("/api/sync/pull", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "请输入账号和密码" });
    }

    try {
      const dataStr = await redis.hget(`sync:${username}`, "data");
      const pwdStr = await redis.hget(`sync:${username}`, "password");
      const updatedAt = await redis.hget(`sync:${username}`, "updatedAt");

      if (!dataStr) {
        return res.status(404).json({ error: "云端暂无数据" });
      }

      if (pwdStr !== password) {
        return res.status(401).json({ error: "密码不正确，无权访问该账号数据" });
      }

      res.json({
        data: JSON.parse(dataStr),
        updatedAt: parseInt(updatedAt || "0", 10),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 2. Sync push
  app.post("/api/sync/push", async (req, res) => {
    const { username, password, data, force } = req.body;
    if (!username || !password || !data) {
      return res.status(400).json({ error: "请输入账号和密码" });
    }

    try {
      const pwdStr = await redis.hget(`sync:${username}`, "password");
      if (pwdStr && pwdStr !== password) {
        return res.status(401).json({ error: "账号已存在，但密码不匹配" });
      }

      const updatedAt = await redis.hget(`sync:${username}`, "updatedAt");
      const currentUpdated = parseInt(updatedAt || "0", 10);
      const incomingUpdated = data.lastModified ? new Date(data.lastModified).getTime() : Date.now();

      if (!force && pwdStr) {
        // If not forced, check conflict: Cloud is newer?
        if (currentUpdated > incomingUpdated) {
          return res.status(409).json({ 
            error: "云端有更新的数据，发生同步冲突",
            cloudUpdatedAt: currentUpdated,
            localUpdatedAt: incomingUpdated
          });
        }
      }

      // Save to redis
      const saveTime = Date.now();
      await redis.hset(`sync:${username}`, {
        password: password, // For simplicity we store plain text or simple hash here
        data: JSON.stringify(data),
        updatedAt: saveTime.toString()
      });

      res.json({ success: true, updatedAt: saveTime });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3. Clear cloud data (cancel sync / delete)
  app.post("/api/sync/clear", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "请输入账号和密码" });
    }
    try {
      const pwdStr = await redis.hget(`sync:${username}`, "password");
      if (!pwdStr) {
        return res.status(404).json({ error: "云端未发现数据" });
      }
      if (pwdStr !== password) {
        return res.status(401).json({ error: "密码不正确，无法清空该账号数据" });
      }

      await redis.del(`sync:${username}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
