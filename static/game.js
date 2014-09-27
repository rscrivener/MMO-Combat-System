$(function(){
	map.Init();
	network.Init();
	game.Init();
	initEventVars();
	initKeyCodes();
	initTracking();
	initTimers();
	InitWS();
});
window.game = {
	settings: {
		sensitivity: 2,
	},
	gl: undefined, // graphics language element
	canvas: undefined, //canvas element
	vShader: undefined, // vertex shader
	fShader: undefined, // fragment shader
	program: undefined,
	uLocations: { // stores the uniform locations
		position: undefined,
		resolution: undefined,
		color: undefined,
		matrix: undefined,
	},
	buffer: undefined,
	color: {
		r: 11/255,
		g: 37/255,
		b: 225/255,
		a: 1
	},
	cameraTranslation: [-50, -75],
	offsetTranslation: [0, 0],
	angleInRadians: function(){
		return this.angle * Math.PI / 180;
	},
	angle: 0,
	scale: [3,3],
	Init: function(){
		this.canvas = document.getElementById("canvas");
		$(canvas).width(window.innerWidth);
		$(canvas).height(window.innerHeight);
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		$("#dot").css({"left": window.innerWidth/2 - 20, "top": window.innerHeight/2 - 20});
		this.gl = getWebGLContext(this.canvas);
		if(!this.gl){
			return;
		}
		
		this.InitProgram();
		
		this.gl.useProgram(this.program);
		// look up  where the vertex data needs to go
		this.uLocations.position = this.gl.getAttribLocation(this.program, "a_position");
		// find uniform locations
		this.uLocations.color = this.gl.getUniformLocation(this.program, "u_color");
		this.uLocations.matrix = this.gl.getUniformLocation(this.program, "u_matrix");

		this.InitBuffer();

		this.InitCamera();

		this.gl.uniform4f(this.uLocations.color, this.color.r, this.color.g, this.color.b, this.color.a);

		this.update();
	},
	InitProgram: function(){
		this.vShader = createShaderFromScriptElement(this.gl, "2d-vertex-shader");
		this.fShader = createShaderFromScriptElement(this.gl, "2d-fragment-shader");
		this.program = createProgram(this.gl, [this.vShader, this.fShader]);
	},
	InitBuffer: function(){
		this.buffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
		this.gl.enableVertexAttribArray(this.uLocations.position);
		this.gl.vertexAttribPointer(this.uLocations.position, 2, this.gl.FLOAT, false, 0, 0);
	},
	InitGeometry: function(vectorData){
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			new Float32Array(vectorData),
			this.gl.STATIC_DRAW);
	}, InitCamera: function(){
		var size = map.compiledMap.size;
		var blocks = map.mapData1.length;
		this.cameraTranslation[0] = size[0] * blocks / 2 * -1; // find center of map, x coord
		this.cameraTranslation[1] = size[1] * blocks / 2 * -1; // find center of map, y coord
	},
	update: function(){
		// clear the buffer
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		// create the matrixes
		var scaleMatrix = glmath.scale(this.scale[0], this.scale[1]);
		var cameraMatrix = glmath.translation(game.cameraTranslation[0]*this.scale[0], game.cameraTranslation[1]*this.scale[1]);
		var rotationMatrix = glmath.rotation(this.angleInRadians());
		var centerToWindowMatrix = glmath.translation(this.canvas.width/2, this.canvas.height/2);
		//var translationMatrix = glmath.translation(this.translation[0], this.translation[1]);
		var projectionMatrix = glmath.projection(this.canvas.width, this.canvas.height);
		

		var matrix = glmath.identity();
		matrix = glmath.multiply(matrix, scaleMatrix);
		matrix = glmath.multiply(matrix, cameraMatrix);
		matrix = glmath.multiply(matrix, rotationMatrix);
		matrix = glmath.multiply(matrix, centerToWindowMatrix);

		matrix = glmath.multiply(matrix, projectionMatrix);
		this.gl.uniformMatrix3fv(this.uLocations.matrix, false, matrix);

		for(var x = 0; x < map.compiledMap.types.length; x++){
			var vectorMap = map.compiledMap[map.compiledMap.types[x]];
			this.gl.uniform4f(this.uLocations.color, vectorMap.color.r, vectorMap.color.g, vectorMap.color.b, vectorMap.color.a);
			this.InitGeometry(vectorMap.vectorData);
			
			this.gl.drawArrays(this.gl.TRIANGLES, 0, Math.round(vectorMap.vectorData.length/2));
		}
		drawPlayer(network.playerID);
	}
}
glmath = {
	identity: function(){
		return [
			1, 0, 0,
			0, 1, 0,
			0, 0, 1
		];
	},
	projection: function(width, height){
		return [
			2 / width, 0, 0,
			0, -2 / height, 0,
			-1, 1, 1
		];
	},
	translation: function(tx, ty){
		return [
		    1, 0, 0,
		    0, 1, 0,
		    tx, ty, 1
		  ];
	},
	rotation: function(angleInRadians){
		var c = Math.cos(angleInRadians);
		var s = Math.sin(angleInRadians);
		return [
		    c,-s, 0,
		    s, c, 0,
		    0, 0, 1
		  ];
	},
	scale: function(sx, sy){
		return [
		    sx, 0, 0,
		    0, sy, 0,
		    0, 0, 1
		  ];
	}, multiply: function(a, b){
		var a00 = a[0*3+0];
		var a01 = a[0*3+1];
		var a02 = a[0*3+2];
		var a10 = a[1*3+0];
		var a11 = a[1*3+1];
		var a12 = a[1*3+2];
		var a20 = a[2*3+0];
		var a21 = a[2*3+1];
		var a22 = a[2*3+2];
		var b00 = b[0*3+0];
		var b01 = b[0*3+1];
		var b02 = b[0*3+2];
		var b10 = b[1*3+0];
		var b11 = b[1*3+1];
		var b12 = b[1*3+2];
		var b20 = b[2*3+0];
		var b21 = b[2*3+1];
		var b22 = b[2*3+2];
		return [a00 * b00 + a01 * b10 + a02 * b20,
		      a00 * b01 + a01 * b11 + a02 * b21,
		      a00 * b02 + a01 * b12 + a02 * b22,
		      a10 * b00 + a11 * b10 + a12 * b20,
		      a10 * b01 + a11 * b11 + a12 * b21,
		      a10 * b02 + a11 * b12 + a12 * b22,
		      a20 * b00 + a21 * b10 + a22 * b20,
		      a20 * b01 + a21 * b11 + a22 * b21,
		      a20 * b02 + a21 * b12 + a22 * b22];
	}
}
initTracking = function(){
	document.addEventListener('pointerlockerror', function(){
		console.log("failed");
	}, false);
	$("#canvas").click(function(){
		game.canvas.requestPointerLock();
	});
	window.addEventListener("pointerlockchange", function(e){
		if(document.pointerLockElement === game.canvas){
			console.log("Locked!");
		} else {
			console.log("Not locked!");
		}
	}, false);
	document.addEventListener("mousemove", function(e){
		window.mouseXmovement = e.movementX;
	}, false);
	window.addEventListener("mousedown", function(e){
		if(e.which == 3) {
			window.rightMouse = true;
		}
	}, false)
	window.addEventListener("mouseup", function(e){
		if(e.which == 3) {
			window.rightMouse = false;
		}
	})
	window.addEventListener('keydown', function(e){
		if(e.keyCode in keyCodes){
			if (keyCodes[e.keyCode]){
				keyStates[keyCodes[e.keyCode]] = true;
			}
			if(keyCodes[e.keyCode] == 'p'){
				if(paused == false){
					stopTimers();
					paused = true;
				} else {
					paused = false;
					initTimers();
				}
			}
		} else{
			if(e.keyCode == 191){
				$("#cheatBox").toggleClass("hidden");
				$('#ppbutton').toggleClass('pause');
				$('#ppbutton').toggleClass('play');
				if($('#ppbutton').hasClass('pause')){
					$("#cheatBox").attr("disabled", "disabled");
				} else {
					$("#cheatBox").removeAttr("disabled");
				}
				$("#cheatBox").focus();
			}
			if($("#cheatBox").is(":focus")){
				if(e.keyCode == 13){
					var cheatCode = $("#cheatBox").val();
					$("#cheatBox").toggleClass("hidden");
					$('#ppbutton').toggleClass('pause');
					$('#ppbutton').toggleClass('play');
					if($('#ppbutton').hasClass('pause')){
						$("#cheatBox").attr("disabled", "disabled");
					} else {
						$("#cheatBox").removeAttr("disabled");
					}
					$("#cheatBox").focus();
					if(cheatCode == "/nofire"){
						setInterval(function(){
							window.canFire = true;
						}, 1);
					}
				}
			}
			if(e.keyCode == 32) keyStates.space = true; // space bar
			if(e.keyCode == 49) keyStates.red = true; //red state
			else if(e.keyCode == 50) keyStates.blue = true; //blue state
			else if(e.keyCode == 51) keyStates.green = true; //green state

			else if(e.keyCode == 37) keyStates.left = true;
			else if(e.keyCode == 38) keyStates.up = true;
			else if(e.keyCode == 39) keyStates.right = true;
			else if(e.keyCode == 40) keyStates.down = true;
		}
	}, false);
	window.addEventListener('keyup', function(e){
		if(e.keyCode in keyCodes){
			keyStates[keyCodes[e.keyCode]] = false;
		} else {
			if(e.keyCode == 37) keyStates.left = false;
			else if(e.keyCode == 38) keyStates.up = false;
			else if(e.keyCode == 39) keyStates.right = false;
			else if(e.keyCode == 40) keyStates.down = false;
		}
	}, false);
}

initKeyCodes = function(){
	window.keyCodes = {};
	var avKeys = "abcdefghijklmnopqrstuvwxyz";

	for(var i = 0, keyCode = 65; i < 26; i++, keyCode++){
		keyCodes[keyCode] = avKeys[i];
	}

	window.keyStates = {};

	for(var i in keyCodes){
		keyStates[keyCodes[i]] = false;
	}

	function event(s){
		if(keyStates[s] && window.canFire){
			keyStates[s] = false;
			window.canFire = false;
			return true;
		} return false;
	}

	keyStates.space = false;
	keyStates.red = false;
	keyStates.blue = false;
	keyStates.green = false;
	keyStates.normal = false;
	keyStates.super = false;

	keyStates.left = false;
	keyStates.up = false;
	keyStates.right = false;
	keyStates.down = false;
}
initEventVars = function(){
	//
	window.rightMouse = false;
	window.mouseXmovement = 0;
	window.paused = false;
}
stopTimers = function(){
	clearInterval(timerInterval);
}
initTimers = function(){
	window.timerInterval = setInterval(function(){ // this thing here activates every second, used to regenerate powers
		var trans = mapMovement();
		var oldTrans = [game.cameraTranslation[0], game.cameraTranslation[1]];
		if(rightMouse){
			if(window.mouseXmovement > 0) {
				// positive movement
				if(game.angle < 360){
					game.angle += window.mouseXmovement * game.settings.sensitivity;
				} else {
					game.angle = 0;
				}
			} else {
				// negative movement
				if (game.angle > 0){
					game.angle += window.mouseXmovement * game.settings.sensitivity; // movement will already be negative value
				} else {
					game.angle = 360;
				}
			}
			if(keyStates["d"]){
				//
				game.cameraTranslation[0] += trans.right[0];
				game.cameraTranslation[1] += trans.right[1];
			}
			if(keyStates["a"]){
				//
				game.cameraTranslation[0] += trans.left[0];
				game.cameraTranslation[1] += trans.left[1];
			}
			window.mouseXmovement = 0;
		} else {
			if(keyStates["d"]){
				if (game.angle < 360){
					game.angle += 2;
				} else {
					game.angle = 0;
				}
			}
			if(keyStates["a"]){
				if (game.angle > 0){
					game.angle -= 2;
				} else {
					game.angle = 360;
				}
			}
		}
		if(keyStates["w"]){
			game.cameraTranslation[0] -= trans.foward[0];
			game.cameraTranslation[1] -= trans.foward[1];
		}
		if (keyStates["s"]){
			game.cameraTranslation[0] += trans.foward[0];
			game.cameraTranslation[1] += trans.foward[1];
		}
		game.cameraTranslation = removeOverflow(oldTrans);
		game.update();
	}, 1000/60);
}

function moveMap(){
	var moveTranslation = [0,0];
	var a_angle = game.angle;
	var distance = 1;
	var cos = function(angle, hyp){
		return hyp * Math.cos(angle);
	}
	var sin = function(angle, hyp){
		return hyp * Math.sin(angle);
	}
	var orientationSC = 0 // orientation sin and cos
	var directonXY = [1, 1]; //orientation of X & Y
	if(a_angle < 90) {
		// calc for 90 degree or less
		a_angle -= 0; //convert angle to 90 degrees
		orientationSC = 1;
		directonXY = [1, -1];
	} else if (a_angle < 180){
		// calc for 180 degree to 90 degree
		a_angle -= 90;
		orientationSC = 0;
		directonXY = [1, 1];
	} else if (a_angle < 270){
		// calc for 270 to 180 degree
		a_angle -= 180;
		orientationSC = 1;
		directonXY = [-1, 1];
	} else if (a_angle <= 360){
		// calc for 270 to 180
		a_angle -= 270;
		orientationSC = 0;
		directonXY = [-1, -1];
	}
	a_angle = a_angle * Math.PI / 180;
	var orientations = [[cos(a_angle, distance), sin(a_angle, distance)], [sin(a_angle, distance), cos(a_angle, distance)]];
	moveTranslation = [
		orientations[orientationSC][0] * directonXY[0], // x move
		orientations[orientationSC][1] * directonXY[1]]; // y move
	return moveTranslation;
}
function mapMovement(){
	var moveTranslation = {
		foward: [0,0],
		left: [0,0],
		right: [0,0],
	}
	var a_angle = game.angle;
	var distance = 1;
	var cos = function(angle, hyp){
		return hyp * Math.cos(angle);
	}
	var sin = function(angle, hyp){
		return hyp * Math.sin(angle);
	}
	var orientationSC = 0 // orientation sin and cos
	var sAngle = 0;
	var directonXY = [1, 1]; //orientation of X & Y
	var sDirectionXY = [1,1];
	if(a_angle < 90) {
		// calc for 90 degree or less
		a_angle -= 0; //convert angle to 90 degrees
		orientationSC = 1;
		directonXY = [1, -1];
		sAngle = 1;
		sDirectionXY = [-1, -1];
	} else if (a_angle < 180){
		// calc for 180 degree to 90 degree
		a_angle -= 90;
		orientationSC = 0;
		directonXY = [1, 1];
		sAngle = 0;
		sDirectionXY = [1, -1];
	} else if (a_angle < 270){
		// calc for 270 to 180 degree
		a_angle -= 180;
		orientationSC = 1;
		directonXY = [-1, 1];
		sAngle = 1;
		sDirectionXY = [1, 1];
	} else if (a_angle <= 360){
		// calc for 270 to 180
		a_angle -= 270;
		orientationSC = 0;
		directonXY = [-1, -1];
		sAngle = 0;
		sDirectionXY = [-1, 1];
	}
	var sAngles = [a_angle * Math.PI / 180, (90 - a_angle) * Math.PI / 180];
	a_angle = a_angle * Math.PI / 180;
	var orientations = [[cos(a_angle, distance), sin(a_angle, distance)], [sin(a_angle, distance), cos(a_angle, distance)]];
	var sOrienation = [sin(sAngles[sAngle], distance), cos(sAngles[sAngle], distance)];

	moveTranslation = {
		foward:[
			orientations[orientationSC][0] * directonXY[0],
			orientations[orientationSC][1] * directonXY[1]
		], strafe: [
			sOrienation[0] * sDirectionXY[0],
			sOrienation[1] * sDirectionXY[1]
		], left: [
			sOrienation[0] * sDirectionXY[0] * -1,
			sOrienation[1] * sDirectionXY[1] * -1
		], right: [
			sOrienation[0] * sDirectionXY[0],
			sOrienation[1] * sDirectionXY[1]
		]
	};
	return moveTranslation;
}

function removeOverflow(oldTrans){
	var newTrans = [game.cameraTranslation[0], game.cameraTranslation[1]];
	var difference = [
		game.cameraTranslation[0] - oldTrans[0],
		game.cameraTranslation[1] - oldTrans[1]
	];
	var pos = [
		oldTrans[0] * -1,
		oldTrans[1] * -1
	];
	var index = [
		Math.floor(pos[0]/map.compiledMap.size[0]),
		Math.floor(pos[1]/map.compiledMap.size[1]),
	];
	//console.log(index);
	/*if(difference[0] != 0 & difference[1] != 0){
		console.log(difference);
	}*/
	var xWidth = $("#dot").width()/ 2 / game.scale[0];
	var yHeight = $("#dot").height()/ 2 / game.scale[1];
	if(difference[0] < 0){
		// going to the right
		var xIndex = Math.floor((pos[0]+xWidth)/map.compiledMap.size[0]);
		if(map.mapData1[index[1]][xIndex] == 1){
			newTrans[0] = Math.floor((pos[0]+xWidth)/map.compiledMap.size[0]) * map.compiledMap.size[0] * -1 + xWidth;
		}
	} else {
		// going to the left
		var xIndex = Math.floor((pos[0]-xWidth)/map.compiledMap.size[0]);
		if(map.mapData1[index[1]][xIndex-1] == 1 & ((xIndex) * map.compiledMap.size[0])+1 > pos[0]-xWidth){
			newTrans[0] = (Math.floor((pos[0]-xWidth)/map.compiledMap.size[0])) * map.compiledMap.size[0] * -1 - xWidth;
		} else if (map.mapData1[index[1]][xIndex] == 1){
			newTrans[0] = (Math.floor((pos[0]-xWidth)/map.compiledMap.size[0])+1) * map.compiledMap.size[0] * -1 - xWidth;
		}
	}
	if(difference[1] < 0){
		// going down
		var yIndex = Math.floor((pos[1]+yHeight)/map.compiledMap.size[1]);
		if(map.mapData1[yIndex][index[0]] == 1){
			newTrans[1] = Math.floor((pos[1]+yHeight)/map.compiledMap.size[1]) * map.compiledMap.size[1] * -1 + yHeight;
		}
	} else {
		// going up
		var yIndex = Math.floor((pos[1]-yHeight)/map.compiledMap.size[1]);
		if(map.mapData1[yIndex-1][index[0]] == 1 & ((yIndex) * map.compiledMap.size[1])+1 > pos[1]-yHeight){
			newTrans[1] = (Math.floor((pos[1]-yHeight)/map.compiledMap.size[1])) * map.compiledMap.size[1] * -1 - yHeight;
		} else if (map.mapData1[yIndex][index[0]] == 1){
			newTrans[1] = (Math.floor((pos[1]-yHeight)/map.compiledMap.size[1])+1) * map.compiledMap.size[1] * -1 - yHeight;
		}
	}
	return newTrans;
}

function InitWS(){
	
}