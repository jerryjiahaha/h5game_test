"use strict";
// \ref https://github.com/streamproc/MediaStreamRecorder.git
console.log("game script loaded!");

class Component {
	constructor() {
		console.log("constructing");
		this.gravity = 9.8;
	}
	render(ctx) {
		console.log("rendering");
	}
	checkGravity(dt) {
		console.log("check gravity");
	}
}

class Ground extends Component {
	constructor(x, y, width, height) {
		super();
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
	render(ctx) {
		ctx.beginPath();
		ctx.fillStyle = "#000000";
		ctx.fillRect(this.x, this.y, this.width, this.height);
		ctx.closePath();
	}
}

class Role extends Component {
	constructor(radius, curX, curY) {
		super();
		this.curX = curX;
		this.curY = curY;
		this.radius = radius;
		this.velX = this.velY = 0;
	}
	render(ctx) {
		ctx.beginPath();
		ctx.fillStyle = "#A0A0A0";
		ctx.arc(this.curX, this.curY, this.radius, 0, 2*Math.PI);
		ctx.fill();
		ctx.closePath();
	}
	// but also check boundary
	checkGravity(clockTick_in_ms, ground_height) {
		let dt = clockTick_in_ms / 1000;
		let needUpdate = false;
		if ( this.curY + this.radius < ground_height ) {
			this.curY = this.curY + (this.velY + this.gravity/2*dt) * dt;
			this.velY = this.velY + this.gravity * dt;
			needUpdate = true;
		}
		if ( needUpdate && (this.curY + this.radius >= ground_height) ) {
			this.curY = ground_height - this.radius;
			this.velY = 0;
		}
		return needUpdate;
	}
}

class Container{
	constructor(iterable) {
		this._set = new Set(iterable);
	}
	add(sth) {
		this._set.add(sth);
	}
	render(ctx) {
		this._set.forEach( function(val, key, setobj) {
			val.render(ctx);
		}, null);
	}
}

function deployGame(id) {
	let c = document.getElementById(id);
	let ctx = c.getContext("2d");
	let width = c.width;
	let height = c.height;

	let container = new Container();

	// ground
	ctx.fillStyle = "#000000";
	let ground_ratio = 0.8;
	let ground_height = ground_ratio * height;
	let ground = new Ground(0, ground_height, width, height - ground_height);
	container.add(ground);
//	ground.render();
//	ctx.fillRect(0, ground_height, width, ground_height);

	// role
	let man_ratio = 0.05;
	let man_radius = man_ratio * height;
	let role = new Role(man_radius, man_radius, ground_height - man_radius);
	container.add(role);
//	role.render();

	container.render(ctx);

	// periodically check role's position
	let clockTick = 1000/10;
	let roleMonitor = window.setInterval( function() {
		if ( role.checkGravity(clockTick, ground_height) ) {
			ctx.clearRect(0, 0, width, height);
			container.render(ctx);
		}
	}, clockTick);

	// catch sound input
	let promise = navigator.mediaDevices.getUserMedia(
		{
			audio: true
		})
		.then( function(stream) {
			console.log("get stream");

			let audio = stream.getAudioTracks()[0];

			// \ref https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
			let audioCtx = new ( window.AudioContext || window.webkitAudioContext )();
			let source = audioCtx.createMediaStreamSource(stream);

			let analyser = audioCtx.createAnalyser();
			source.connect(analyser);

			let bufferSize = 2**14;
			let scriptNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
			scriptNode.onaudioprocess = function(audioEvt) {
				//				console.log("audio io event", audioEvt);
				let input = audioEvt.inputBuffer.getChannelData(0);
				let maxSample = Math.max.apply(null, input.map(Math.abs));

				// clear man last position
				ctx.clearRect(0, 0,width, height);

				// get man's next position
				if ( 0.1 < maxSample && maxSample < 0.7 ) {
					role.curX = role.curX + maxSample * man_ratio * width;
				}
				else if ( maxSample >= 0.7 ) {
					role.curY = role.curY - 3 * maxSample * man_ratio * height;
				}
				window.requestAnimationFrame( function() {
					container.render(ctx);
				});
			};
			analyser.connect(scriptNode);
			//source.connect(scriptNode);
			scriptNode.connect(audioCtx.destination);

		})
		.catch( function(err) {
			console.error(err);
			window.alert(err);
		});

}

deployGame("gameboard");
