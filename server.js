const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// "Banco de dados"
let users = {};       // username -> {password, id}
let usersById = {};   // id -> username
let sockets = {};     // id -> websocket
let nextId = 1;

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

      ws.send(JSON.stringify({
        type: "register-success",
        id
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

    // ===== MENSAGEM PRIVADA =====
    if (msg.type === "private-message") {
      const fromId = ws.userId;
      const toId = Number(msg.to);

      const targetSocket = sockets[toId];
      if (!targetSocket) return;

      targetSocket.send(JSON.stringify({
        type: "private-message",
        fromId,
        fromName: usersById[fromId],
        text: msg.text
      }));
    }
  });

  ws.on("close", () => {
    if (ws.userId) delete sockets[ws.userId];
  });
});

server.listen(3000, () => {
  console.log("Fast Mini Chat rodando...");
});
