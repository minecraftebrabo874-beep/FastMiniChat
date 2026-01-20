const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let users = {};       // username -> {password, id}
let usersById = {};   // id -> username
let sockets = {};     // id -> ws

// histórico: "id1-id2" -> [ {fromName,text} ]
let chats = {};

let nextId = 1;

function chatKey(a, b){
  return [Math.min(a,b), Math.max(a,b)].join("-");
}

wss.on("connection", (ws) => {

  ws.on("message", (data) => {
    const msg = JSON.parse(data);

    // ===== REGISTRAR =====
    if (msg.type === "register") {
      if (users[msg.username]) {
        ws.send(JSON.stringify({ type: "register-error" }));
        return;
      }

      const id = nextId++;
      users[msg.username] = { password: msg.password, id };
      usersById[id] = msg.username;

      // já registra socket e faz login automático
      ws.userId = id;
      sockets[id] = ws;

      ws.send(JSON.stringify({
        type: "register-success",
        id,
        username: msg.username
      }));
    }

    // ===== LOGIN =====
    if (msg.type === "login") {
      const user = users[msg.username];
      if (user && user.password === msg.password) {
        ws.userId = user.id;
        sockets[user.id] = ws;

        ws.send(JSON.stringify({
          type: "login-success",
          id: user.id,
          username: msg.username
        }));
      } else {
        ws.send(JSON.stringify({ type: "login-error" }));
      }
    }

    // ===== PEDIR HISTÓRICO =====
    if (msg.type === "load-chat") {
      const fromId = ws.userId;
      const toId = msg.withId;
      const key = chatKey(fromId, toId);
      const history = chats[key] || [];

      ws.send(JSON.stringify({
        type: "chat-history",
        withId: toId,
        history
      }));
    }

    // ===== MENSAGEM =====
    if (msg.type === "private-message") {
      const fromId = ws.userId;
      const toId = Number(msg.to);

      if (fromId === toId) return; // impede falar consigo mesmo

      const text = msg.text.slice(0, 20000); // limite 20k

      const fromName = usersById[fromId];
      const key = chatKey(fromId, toId);

      if (!chats[key]) chats[key] = [];
      chats[key].push({ fromName, text });

      const targetSocket = sockets[toId];
      if (targetSocket) {
        targetSocket.send(JSON.stringify({
          type: "private-message",
          fromId,
          fromName,
          text
        }));
      }
    }
  });

  ws.on("close", () => {
    if (ws.userId) delete sockets[ws.userId];
  });
});

server.listen(3000, () => {
  console.log("Fast Mini Chat rodando...");
});
