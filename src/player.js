/*
					Player.js
	This module defines the player entities which are
	used to battle against one another upon the ring.

*/


/*
	Preloads assets to be used by player entities.
*/
playerPreload = function(){
		game.load.spritesheet('gum','gfx/gumSheet.png',64,64);
		game.load.spritesheet('slash','gfx/slash.png',64,64);
		game.load.audio('blip','sfx/blip.wav');
		game.load.audio('burp','sfx/burp.wav');
}


/*
						createPlayer
	Returns a player entity to be controlled by a user
*/
createPlayer =  function(x,y,name,ID){
	//Initializes entity and core properties
	var player = game.add.sprite(x,y,name,0);
	player.anchor.set(0.5);
	game.physics.enable(player,Phaser.Physics.ARCADE);
	player.body.allowGravity = false;
	player.body.collideWorldBounds = true;
	player.body.setSize(16,20,0,12) //(w,h,ox,oy)

	//If created player ent is user, then make the cam follow em.
	if(ID == session.id){game.camera.follow(player);}

	//Creates a group of slash sprites to interact with enemy
	player.slashes = game.add.group();
	player.slashes.enableBody= true;
	player.slashes.setAll("allowGravity",false);
	player.slashes.physicsBodyType = Phaser.Physics.ARCADE;
	player.slashes.createMultiple(4,'slash');
	player.slashes.setAll('anchor.x',0.5);
	player.slashes.setAll('anchor.y',0.5);
	player.scale.set(2);

	//Setup sound effects
	player.slashSound = game.add.audio('blip');
	player.slashSound.allowMultiple = true;
	player.hitSound = game.add.audio('burp');
	player.hitSound.allowMultiple = false;

	//Defines game controls (needs to be moved to dedicated module later)
	player.ID = ID;
	player.cursors = game.input.keyboard.createCursorKeys();
	player.atk = game.input.keyboard.addKey(Phaser.Keyboard.Z);
	player.debug = game.input.keyboard.addKey(Phaser.Keyboard.Y); //debug key
	player.runSpeed = 850;
	player.slashTimer = game.time.now; 
	player.slashSpeed = 100;
	player.slashDelay = 200;
	
	//Set up player animation properties
	player.dir = 'down';
	player.smoothed = false;

	//Show current damage above sprite
	player.dmg = 0;
	player.fontStyle = { font: "20px Arial", fill: "#ff0044", wordWrap: true, wordWrapWidth: player.width*2, align: "center" };
	player.dmgText = game.add.text(player.x,player.y,"DMG: ",player.fontStyle);
	player.dmgText.anchor.set(0.5);

	/*
		Player's slash attack.
	*/
	player.slash = function(){
		if(player.slashTimer>game.time.now){return;}
		var slash = player.slashes.getFirstExists(false);
		if(!slash){return}
		player.slashTimer = game.time.now + player.slashDelay;
		slash.body.mass = 10;

		if(player.dir=='up'){
			slash.reset(player.x,player.y-slash.height);
			slash.frame = 3;
			slash.body.velocity.x = player.body.velocity.x;
			slash.body.velocity.y = player.body.velocity.y-player.slashSpeed;
		}
		if(player.dir=='down'){
			slash.reset(player.x,player.y+slash.height);
			slash.frame = 1;
			slash.body.velocity.x = player.body.velocity.x
			slash.body.velocity.y = player.body.velocity.y+player.slashSpeed;
		}
		if(player.dir=='left'){
			slash.reset(player.x-slash.width,player.y);
			slash.frame = 2;
			slash.body.velocity.x = player.body.velocity.x-player.slashSpeed;
			slash.body.velocity.y = player.body.velocity.y;
		}
		if(player.dir=='right'){
			slash.reset(player.x+slash.width,player.y);
			slash.frame = 0;
			slash.body.velocity.x = player.body.velocity.x+player.slashSpeed;
			slash.body.velocity.y = player.body.velocity.y;
		}
		slash.lifespan = 100;
		player.slashSound.play();
	}


	/*
		Player.hit is called from the collision func which
		auto-passes in colliding ents in the order specified.
	*/
	player.hit = function(player,slash){
		slash.kill();
		player.hitSound.play();
		player.dmg +=10;
	}


	/*
		Takes user input and translates into movement or
		other moves for the player entity to execute.
	*/
	player.controls = function(){
		player.body.velocity.x = 0;
		player.body.velocity.y = 0;
		//if(!controlling){return;}
		
		if(player.ID != session.id){
			return;
		}
		
		var c = player.cursors
		
		if (c.up.isDown){
			player.body.velocity.y += -player.runSpeed;
			player.dir = 'up';
			player.frame = 2;
		}
		else if (c.down.isDown){
			player.body.velocity.y += player.runSpeed;
			player.dir = 'down';
			player.frame = 0;
		}
		else if (c.left.isDown){
			player.body.velocity.x += -player.runSpeed;
			player.dir = 'left';
			player.frame = 3;
		}
		else if (c.right.isDown){
			player.body.velocity.x += player.runSpeed;
			player.dir = 'right';
			player.frame = 1;
		}

		var frameJSON = {
			type:"move",
			player:session.id,
			frame:player.frame
		}

		if(c.up.isDown || c.down.isDown || c.left.isDown || c.right.isDown){
			socket.emit('game', frameJSON )
		}

		if(player.debug.isDown){
			player.body.allowGravity = true;
			player.controlling = false;
			player.body.gravity.y = 20000;	
			player.body.collideWorldBounds = false;
		}

		if (player.atk.isDown){player.slash()}
		if(!c.up.isDown && !c.down.isDown && !c.left.isDown && !c.right.isDown){player.body.velocity.set(0)}
	}

	
	/*
		Player.update is a generic update callback
		to be called each frame per player entity
	*/
	player.update = function(){
		player.dmgText.x += (Math.floor(player.x) - (player.dmgText.x))*0.2;
		player.dmgText.y += (Math.floor(player.y) - (player.dmgText.y+(player.width*0.5)))*0.2;
		player.dmgText.text = "DMG: "+player.dmg
		player.controls();

		game.physics.arcade.collide(player.slashes,ring.players,player.hit);

	}

	return player;
}