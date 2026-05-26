import express from "express";
import path from "path";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { cert, getApps } from "firebase-admin/app";

dotenv.config();

const PORT = Number(process.env.PORT || 3000);

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL
  ? {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }
  : undefined;

if (!getApps().length) {
  admin.initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : admin.credential.applicationDefault(),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const firestore = admin.firestore();
const firebaseAuth = admin.auth();

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

app.use(express.json());

const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);

    if (!decoded.email_verified) {
      return res.status(403).json({ error: "Email not verified" });
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    console.error("Token verification failed", error);
    return res.status(401).json({ error: "Invalid auth token" });
  }
};

const getTodoDoc = (id: string) => firestore.collection("todos").doc(id);

app.get("/api/todos", authenticateToken, async (req: any, res, next: any) => {
  try {
    const snapshot = await firestore.collection("todos").where("userId", "==", req.user.uid).get();
    const todos = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    res.json(todos);
  } catch (error) {
    next(error);
  }
});

app.post("/api/todos", authenticateToken, async (req: any, res, next: any) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const payload = {
      userId: req.user.uid,
      text,
      completed: false,
      important: false,
      updatedAt: new Date().toISOString(),
    };

    const docRef = await firestore.collection("todos").add(payload);
    const todo = { ...payload, id: docRef.id };

    broadcastToUser(req.user.uid, { type: "TODO_CREATED", payload: todo });
    res.json(todo);
  } catch (error) {
    next(error);
  }
});

app.put("/api/todos/:id", authenticateToken, async (req: any, res: any, next: any) => {
  try {
    const todoRef = getTodoDoc(req.params.id);
    const doc = await todoRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Todo not found" });
    }

    const todo = doc.data();
    if (todo?.userId !== req.user.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updatedTodo = {
      ...todo,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await todoRef.update(updatedTodo);
    broadcastToUser(req.user.uid, { type: "TODO_UPDATED", payload: { ...updatedTodo, id: req.params.id } });
    res.json({ ...updatedTodo, id: req.params.id });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/todos/:id", authenticateToken, async (req: any, res: any, next: any) => {
  try {
    const todoRef = getTodoDoc(req.params.id);
    const doc = await todoRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Todo not found" });
    }

    const todo = doc.data();
    if (todo?.userId !== req.user.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await todoRef.delete();
    broadcastToUser(req.user.uid, { type: "TODO_DELETED", payload: { id: req.params.id } });
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.use((err: any, req: any, res: any, next: any) => {
  console.error("Express Error Handler:", err.stack || err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

const clients = new Map<string, Set<WebSocket>>();

wss.on("connection", (ws: WebSocket) => {
  let userId: string | null = null;

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === "AUTH") {
        const decoded = await firebaseAuth.verifyIdToken(data.token);
        if (!decoded.email_verified) {
          ws.send(JSON.stringify({ type: "AUTH_ERROR", message: "Email not verified" }));
          return;
        }

        userId = decoded.uid;
        if (!clients.has(userId)) {
          clients.set(userId, new Set());
        }
        clients.get(userId)?.add(ws);
        ws.send(JSON.stringify({ type: "AUTH_SUCCESS" }));
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: "AUTH_ERROR" }));
    }
  });

  ws.on("close", () => {
    if (userId) {
      const userSockets = clients.get(userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          clients.delete(userId);
        }
      }
    }
  });
});

function broadcastToUser(userId: string, data: any) {
  const userSockets = clients.get(userId);
  if (!userSockets) return;
  userSockets.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

async function startServer() {
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
