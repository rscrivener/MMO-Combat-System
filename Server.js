var WebSocketServer = require("ws").Server;
var express = require("express");
var http = require("http");
var app = express();
server = http.createServer(app);

app.use(express.static(__dirname + "/static"));

server.listen(8080);

var wss = new WebSocketServer({server: server, path: "/ws"})

Object.prototype.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};
var ConCounter = 0;
var connections = {};

wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        //console.log('received: %s', message);
        ws.send(message);
    });
    ws.on('close', function(){
    	//
    	delete connections[ws.ID];
    })
    connections["user"+ConCounter] = ws;
    var ID = Object.size(connections);
    ConCounter++;
    console.log("User"+ID);
    var output = {
    	"InitID": "User"+ID
    };
    ws.ID = output.InitID;
    ws.send(JSON.stringify(output));
});

