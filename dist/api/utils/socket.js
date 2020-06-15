"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
// let connections = new Map()
// let connectionCounter = 0
// let lastConn: any
let srvr;
const connect = (server) => {
    srvr = new WebSocket.Server({ server, clientTracking: true });
    console.log('=> [socket] connected to server');
    srvr.on('connection', socket => {
        console.log('=> [socket] connection received');
        // var id = connectionCounter++;
        // connections.set(id, socket)
        // lastConn = socket
    });
};
exports.connect = connect;
const send = (body) => {
    // connections.forEach((socket, index) => {
    //   socket.send(body)
    // })
    // if(lastConn) lastConn.send(body)
    srvr.clients.forEach(c => {
        console.log(c);
        if (c)
            c.send(body);
    });
};
exports.send = send;
const sendJson = (object) => {
    send(JSON.stringify(object));
};
exports.sendJson = sendJson;
//# sourceMappingURL=socket.js.map