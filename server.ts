import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, apiKey, model, systemInstruction, provider, baseUrl } = req.body;
      
      if (provider === 'openai-compatible') {
        if (!apiKey) {
           res.status(401).json({ error: "No API key provided for OpenAI compatible provider." });
           return;
        }

        const openaiMessages = [];
        if (systemInstruction) {
           openaiMessages.push({ role: "system", content: systemInstruction });
        }
        for (const msg of messages) {
           const role = msg.role === 'model' ? 'assistant' : 'user';
           openaiMessages.push({ role, content: msg.parts[0].text });
        }

        const fetchRes = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'deepseek-chat',
            messages: openaiMessages,
            stream: true
          })
        });

        if (!fetchRes.ok) {
           const errText = await fetchRes.text();
           throw new Error(`OpenAI API Error: ${fetchRes.status} ${errText}`);
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = fetchRes.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        
        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";
          
          for (const line of lines) {
             const trimmedData = line.trim();
             if (trimmedData.startsWith('data: ')) {
               const dataStr = trimmedData.slice(6);
               if (dataStr === '[DONE]') {
                 res.write(`data: [DONE]\n\n`);
                 continue;
               }
               try {
                 const parsed = JSON.parse(dataStr);
                 const chunkText = parsed.choices?.[0]?.delta?.content;
                 if (chunkText) {
                   res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                 }
               } catch (e) {
                 // ignore parse errors for incomplete chunks
               }
             }
          }
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
        return;
      }

      // Gemini fallback
      const { GoogleGenAI } = await import("@google/genai");
      
      const genAiApiKey = apiKey || process.env.GEMINI_API_KEY;
      if (!genAiApiKey) {
         res.status(401).json({ error: "No API key provided. Please configure one in settings or provide GEMINI_API_KEY env." });
         return;
      }
      
      const ai = new GoogleGenAI({ 
        apiKey: genAiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const responseStream = await ai.models.generateContentStream({
        model: model || 'gemini-3-flash-preview',
        contents: messages,
        config: {
          systemInstruction: systemInstruction,
        }
      });
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch(err: any) {
      console.error(err);
      
      let clientErrorMessage = err.message || "Failed to generate chat response.";
      
      // Skill recommendation for 429 errors
      if (err.status === 429 || (err.message && err.message.includes("RESOURCE_EXHAUSTED"))) {
        clientErrorMessage = "AI 额度已用尽 (RESOURCE_EXHAUSTED)。如果您使用的是免费版 API Key，可以尝试在 “设置 > AI 教练设置” 中选择其他模型，或者稍后再试。升级到付费版可以获得更高额度。";
      } else if (err.status === 403 || (err.message && (err.message.includes("PERMISSION_DENIED") || err.message.includes("API_KEY_INVALID")))) {
        clientErrorMessage = "API Key 校验失败或权限不足。请在 “设置 > AI 教练设置” 中检查您的 API Key 是否正确。";
      }

      if (!res.headersSent) {
        res.status(err.status || 500).json({ error: clientErrorMessage });
      } else {
        // If streaming, we might need to send the error as a data chunk before ending
        try {
          res.write(`data: ${JSON.stringify({ error: clientErrorMessage })}\n\n`);
        } catch(e) {}
        res.end();
      }
    }
  });

  function basicAuthHeader(user: string, pass: string) {
    return "Basic " + Buffer.from(user + ":" + pass).toString('base64');
  }

  // 1. Sync pull via WebDAV
  app.post("/api/sync/pull", async (req, res) => {
    const { webdavUrl, username, password } = req.body;
    if (!webdavUrl || !username || !password) {
      return res.status(400).json({ error: "请输入 WebDAV 地址、账号和密码" });
    }

    try {
      const baseUrl = webdavUrl.replace(/\/$/, "");
      const fileUrl = baseUrl + "/TIMEDONUTS/sync.json";
      const authHeader = basicAuthHeader(username, password);

      const fetchRes = await fetch(fileUrl, {
        headers: { 'Authorization': authHeader }
      });

      if (fetchRes.status === 404) {
        return res.status(404).json({ error: "云端暂无数据" });
      }
      if (fetchRes.status === 401) {
        return res.status(401).json({ error: "账户密码错误" });
      }
      if (!fetchRes.ok) {
        throw new Error(`WebDAV GET Error: ${fetchRes.status} ${fetchRes.statusText}`);
      }

      const data = await fetchRes.json();
      res.json({
        data,
        updatedAt: data.lastModified ? new Date(data.lastModified).getTime() : Date.now(),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 2. Sync push via WebDAV
  app.post("/api/sync/push", async (req, res) => {
    const { webdavUrl, username, password, data, force } = req.body;
    if (!webdavUrl || !username || !password || !data) {
      return res.status(400).json({ error: "请输入完整的同步信息" });
    }

    try {
      const baseUrl = webdavUrl.replace(/\/$/, "");
      const dirUrl = baseUrl + "/TIMEDONUTS";
      const fileUrl = dirUrl + "/sync.json";
      const authHeader = basicAuthHeader(username, password);

      if (!force) {
        const fetchRes = await fetch(fileUrl, { headers: { 'Authorization': authHeader } });
        if (fetchRes.ok) {
           const remoteData = await fetchRes.json();
           const incomingUpdated = data.lastModified ? new Date(data.lastModified).getTime() : Date.now();
           const remoteUpdated = remoteData.lastModified ? new Date(remoteData.lastModified).getTime() : 0;
           if (remoteUpdated > incomingUpdated) {
             return res.status(409).json({
               error: "云端有更新的数据，发生同步冲突",
               cloudUpdatedAt: remoteUpdated,
               localUpdatedAt: incomingUpdated
             });
           }
        }
      }

      data.lastModified = new Date().toISOString();
      const dataStr = JSON.stringify(data);

      let putRes = await fetch(fileUrl, {
        method: 'PUT',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: dataStr
      });

      if (putRes.status === 409 || putRes.status === 404) {
         // Need to MKCOL directory first
         const mkcolRes = await fetch(dirUrl, {
           method: 'MKCOL',
           headers: { 'Authorization': authHeader }
         });
         if (!mkcolRes.ok && mkcolRes.status !== 405) {
            throw new Error(`Failed to create TIMEDONUTS directory: ${mkcolRes.status}`);
         }
         
         putRes = await fetch(fileUrl, {
           method: 'PUT',
           headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
           body: dataStr
         });
      }

      if (!putRes.ok) {
         if (putRes.status === 401) {
            return res.status(401).json({ error: "账户密码错误" });
         }
         const errText = await putRes.text();
         throw new Error(`WebDAV PUT Error: ${putRes.status} ${errText}`);
      }

      res.json({ success: true, cloudUpdatedAt: new Date(data.lastModified).getTime() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3. Clear cloud data
  app.post("/api/sync/clear", async (req, res) => {
    const { webdavUrl, username, password } = req.body;
    if (!webdavUrl || !username || !password) {
      return res.status(400).json({ error: "请输入验证信息" });
    }
    
    try {
      const fileUrl = webdavUrl.replace(/\/$/, "") + "/TIMEDONUTS/sync.json";
      const delRes = await fetch(fileUrl, {
        method: 'DELETE',
        headers: { 'Authorization': basicAuthHeader(username, password) }
      });
      
      if (delRes.status === 404) {
        return res.status(404).json({ error: "云端未发现数据" });
      }
      if (delRes.status === 401) {
        return res.status(401).json({ error: "密码不正确，无法清空该账号数据" });
      }
      if (!delRes.ok) {
        throw new Error(`WebDAV DELETE Error: ${delRes.status}`);
      }
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
