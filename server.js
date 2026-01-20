const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let users = {}; 

wss.on("connection", ws => {
    ws.on("message", data => {
        const msg = JSON.parse(data);

        // Criar conta
        if(msg.type === "register"){
            if(users[msg.name]){
                ws.send(JSON.stringify({type:"error", text:"Usuário já existe"}));
            } else {
                users[msg.name] = msg.pass;
                ws.send(JSON.stringify({type:"success", text:"Conta criada!"}));
            }
        }

        // Login
        if(msg.type === "login"){
            if(users[msg.name] === msg.pass){
                ws.user = msg.name;
                ws.send(JSON.stringify({type:"login_ok"}));
            } else {
                ws.send(JSON.stringify({type:"error", text:"Login inválido"}));
            }
        }

        // Chat
        if(msg.type === "chat"){
            if(!ws.user) return;
            const pacote = JSON.stringify({
                type:"chat",
                user: ws.user,
                text: msg.text
            });
            wss.clients.forEach(client=>{
                if(client.readyState === WebSocket.OPEN){
                    client.send(pacote);
                }
            });
        }
    });
});

app.use(express.static(path.join(__dirname, "public")));

server.listen(process.env.PORT || 3000, ()=>{
    console.log("Fast Mini Chat rodando...");
});
