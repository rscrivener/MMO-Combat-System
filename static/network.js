network = {
	playerID: "me",
	players: {},
	Init: function(){
		//
		ws = new WebSocket("ws://localhost:8080/ws");
		ws.onopen = function(){
		};
		ws.onmessage = this.WSParser;
		network.players[this.playerID] = new this.Player();
	}, Player: function(){
		return {
			pos: function(){
				return [game.cameraTranslation[0] * -1, game.cameraTranslation[1] * -1];
			},
			angle: 0,
			radians: function(){
				return  this.angle * Math.PI / 180;
			},
			color: {
				head: [1, 1, 1],
				body: [0, 0, 0]
			},
			head: function(){
				var offsetX = $("#dot").width()/2/game.scale[0];
				var offsetY = $("#dot").height()/2/game.scale[1];

				return [
					0, -offsetY,
					offsetX, -offsetY,
					offsetX, 0,

					offsetX, 0,
					offsetX, offsetY,
					0, offsetY
				]
			}, body: function(){
				var offsetX = $("#dot").width()/2/game.scale[0];
				var offsetY = $("#dot").height()/2/game.scale[1];

				return [
					0, -offsetY,
					offsetX, 0,
					0, offsetY,

					0, -offsetY,
					0, offsetY,
					-offsetX, -offsetY,

					-offsetX, -offsetY,
					-offsetY, offsetY,
					0, offsetY,
				]
			}
		}
	}, WSParser: function(e){
		var parsed = JSON.parse(e.data);
		console.log(parsed.InitID);
		if(parsed["InitID"] != undefined){
			playerID = parsed.InitID;
			delete network.players.me;
			network.players[network.playerID] = new network.Player();
			console.log(playerID);
		}
	}
}

function drawPlayer(playerID){
	var player = network.players[playerID];
	var scaleMatrix = glmath.scale(game.scale[0], game.scale[1]);
	var cameraMatrix = glmath.translation(game.cameraTranslation[0]*game.scale[0], game.cameraTranslation[1]*game.scale[1]);
	var rotationMatrix = glmath.rotation(game.angleInRadians());
	var centerToWindowMatrix = glmath.translation(game.canvas.width/2, game.canvas.height/2);

	var translationMatrix = glmath.translation(player.pos()[0] * game.scale[0], player.pos()[1]*game.scale[1]);

	var projectionMatrix = glmath.projection(game.canvas.width, game.canvas.height);
	var playerRotationMatrix = glmath.rotation(player.radians());
	var playerRotationMatrix2 = glmath.rotation(90 * Math.PI / 180);

	var matrix = glmath.identity();
	matrix = glmath.multiply(matrix, scaleMatrix);
	//matrix = glmath.multiply(matrix, playerRotationMatrix);
	matrix = glmath.multiply(matrix, playerRotationMatrix2);
	matrix = glmath.multiply(matrix, translationMatrix);
	matrix = glmath.multiply(matrix, cameraMatrix);
	//matrix = glmath.multiply(matrix, rotationMatrix);
	matrix = glmath.multiply(matrix, centerToWindowMatrix);

	matrix = glmath.multiply(matrix, projectionMatrix);

	game.gl.uniformMatrix3fv(game.uLocations.matrix, false, matrix);

	game.gl.uniform4f(game.uLocations.color, player.color.head[0], player.color.head[1], player.color.head[2], 1);

	game.InitGeometry(player.head());
	
	game.gl.drawArrays(game.gl.TRIANGLES, 0, Math.round(player.head().length/2));

	game.gl.uniform4f(game.uLocations.color, player.color.body[0], player.color.body[1], player.color.body[2], 1);

	game.InitGeometry(player.body());
	
	game.gl.drawArrays(game.gl.TRIANGLES, 0, Math.round(player.body().length/2));
}
