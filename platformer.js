if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback, element) {
            window.setTimeout(callback, 1000 / 60);
        }
}

function timestamp() {
    return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}

function bound(x, min, max) {
    return Math.max(min, Math.min(max, x));
}

function get(url, onsuccess) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if ((request.readyState == 4) && (request.status == 200))
            onsuccess(request);
    }
    request.open("GET", url, true);
    request.send();
}

function post(nick, scr, time){
    var xhr = new XMLHttpRequest();
	
	var params = "nick=" + encodeURIComponent(nick) + "&score=" + scr.toString() + "&time=" + time.toString();

    xhr.onreadystatechange = function (){
        if((xhr.readyState) == 4 && (xhr.status == 200)){;
            get("dbtool.php", function(req){
				document.getElementById("records").innerHTML = req.responseText;
			});
        }
    }
	
	xhr.open("POST", "dbtool.php", true)
	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    xhr.send(params);
}

function overlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return !(((x1 + w1 - 1) < x2) ||
        ((x2 + w2 - 1) < x1) ||
        ((y1 + h1 - 1) < y2) ||
        ((y2 + h2 - 1) < y1))
}

//-------------------------------------------------------------------------
// Переменные игры
//-------------------------------------------------------------------------

var NICK = "",
    MAP = {tw: 64, th: 48},
    MAP_JSON,
    CURR_LEVEL = 3,
    MAX_LEVEL = 3,
    TILE = 32,
    METER = TILE,
    GRAVITY = 9.8 * 6,
    MAXDX = 15,
    MAXDY = 60,
    ACCEL = 1 / 2,
    FRICTION = 1 / 6,
    IMPULSE = 1500,
    COLOR = {
        BLACK: '#000000',
        YELLOW: '#ECD078',
        BRICK: '#D95B43',
        PINK: '#C02942',
        PURPLE: '#542437',
        GREY: '#333',
        SLATE: '#53777A',
        GOLD: 'gold'
    },
    COLORS = [COLOR.YELLOW, COLOR.BRICK, COLOR.PINK, COLOR.PURPLE, COLOR.GREY],
	PLAYER_SPRITE = new Image(),
    KEY = {
        SPACE: 32,
        LEFT: 65,
        RIGHT: 68,
        DOWN: 17
    },
	ANIM,
	MUSIC = new Audio();
	AUDIO = new Audio();

var fps = 60,
    step = 1 / fps,
    timer,
    canvas = document.getElementById('canvas'),
    ctx = canvas.getContext('2d'),
    width = canvas.width = MAP.tw * TILE,
    height = canvas.height = MAP.th * TILE,
    player = {},
    monsters = [],
    treasure = [],
    cells = [];
	score = 0;

var t2p = function(t) {
        return t * TILE;
    },
    p2t = function(p) {
        return Math.floor(p / TILE);
    },
    cell = function(x, y) {
        return tcell(p2t(x), p2t(y));
    },
    tcell = function(tx, ty) {
        return cells[tx + (ty * MAP.tw)];
    };


//-------------------------------------------------------------------------
// Цикл обновлений
//-------------------------------------------------------------------------

function onkey(ev, key, down) {
    switch (key) {
        case KEY.LEFT:
            player.left = down;
            ev.preventDefault();
            return false;
        case KEY.RIGHT:
            player.right = down;
            ev.preventDefault();
            return false;
        case KEY.SPACE:
            player.jump = down;
            ev.preventDefault();
            return false;
        case KEY.DOWN:
            player.down = down;
            ev.preventDefault();
            return false;
    }
}

function update(dt) {
    updatePlayer(dt);
    updateMonsters(dt);
    checkTreasure();
}

function updatePlayer(dt) {
    updateEntity(player, dt);
}

function updateMonsters(dt) {
    var n, max;
    for (n = 0, max = monsters.length; n < max; n++)
        updateMonster(monsters[n], dt);
}

function updateMonster(monster, dt) {
    if (!monster.dead) {
        updateEntity(monster, dt);
        if (overlap(player.x, player.y, TILE, TILE, monster.x, monster.y, TILE, TILE)) {
            if ((player.dy > 0) && (monster.y - player.y > TILE / 2))
                killMonster(monster);
            else
                killPlayer(player);
        }
    }
}

function checkTreasure() {
    var n, max, t;
    for (n = 0, max = treasure.length; n < max; n++) {
        t = treasure[n];
        if (!t.collected && overlap(player.x, player.y, TILE, TILE, t.x, t.y, TILE, TILE))
            collectTreasure(t);
    }
}

function killMonster(monster) {
    player.killed++;
	score++;
	document.getElementById("score").innerHTML = score;
    monster.dead = true;

    AUDIO.src = '03.wav';
    AUDIO.play();
}

function monstersRenew(){
	var n;
	for(n = 0; n < monsters.length; n++)
		monsters[n].dead = false;
}

function killPlayer(player) {
    player.x = player.start.x;
    player.y = player.start.y;
    player.dx = player.dy = 0;
	
	monstersRenew();

    AUDIO.src = '02.wav';
    AUDIO.play();
}

function collectTreasure(t) {
    player.collected++;
    t.collected = true;

    AUDIO.src = '01.wav';
    AUDIO.play();
}

function GameEnd(score, time) {
    MUSIC.src = 'end.wav';
    MUSIC.play();
	
	post(NICK, score, time);
	
	CURR_LEVEL = 1;
	
	player.x = player.y = -1000;
	player.dx = player.dy = 0;
	
	canvas.style.opacity = "0.6";
	document.getElementById("platformer").style.background = "none";
	document.getElementById("nick").style.display = "block";
	document.getElementById("nick").style.width = "715px";
	document.getElementById("start").style.display = "inline-block";
	document.getElementById("start").innerHTML = "Restart";
	
	setTimeout(function() { alert("Time: " + time + " | Killed: " + score); }, 500);
	
}

function updateEntity(entity, dt) {
    var wasleft = entity.dx < 0,
        wasright = entity.dx > 0,
        falling = entity.falling,
        friction = entity.friction * (falling ? 0.5 : 1),
        accel = entity.accel * (falling ? 0.5 : 1);

    entity.ddx = 0;
    entity.ddy = entity.gravity;

    if (entity.left)
        entity.ddx = entity.ddx - accel;
    else if (wasleft)
        entity.ddx = entity.ddx + friction;

    if (entity.right)
        entity.ddx = entity.ddx + accel;
    else if (wasright)
        entity.ddx = entity.ddx - friction;

    if (entity.jump && !entity.jumping && !falling) {
        entity.ddy = entity.ddy - entity.impulse;
        entity.jumping = true;
        entity.ducking = false;
    }

    if (entity.down && !entity.ducking) {
        entity.ddy = entity.ddy + entity.impulse;
		entity.jumping = false;
        entity.ducking = true;
    }

    entity.x = entity.x + (dt * entity.dx);
    entity.y = entity.y + (dt * entity.dy);
    entity.dx = bound(entity.dx + (dt * entity.ddx), -entity.maxdx, entity.maxdx);
    entity.dy = bound(entity.dy + (dt * entity.ddy), -entity.maxdy, entity.maxdy);

    if ((wasleft && (entity.dx > 0)) ||
        (wasright && (entity.dx < 0))) {
        entity.dx = 0;
    }

    var tx = p2t(entity.x),
        ty = p2t(entity.y),
        nx = entity.x % TILE,
        ny = entity.y % TILE,
        cell = tcell(tx, ty),
        cellright = tcell(tx + 1, ty),
        celldown = tcell(tx, ty + 1),
        celldiag = tcell(tx + 1, ty + 1);

    if (entity.dy > 0) {
        if ((celldown && !cell) || (celldiag && !cellright && nx)) {
            entity.y = t2p(ty);
            entity.dy = 0;
            entity.falling = false;
            entity.jumping = false;
            entity.ducking = false;
            ny = 0;
        }
    } else if (entity.dy < 0) {
        if ((cell && !celldown) ||
            (cellright && !celldiag && nx)) {
            entity.y = t2p(ty + 1);
            entity.dy = 0;
            cell = celldown;
            cellright = celldiag;
            ny = 0;
        }
    }

    if (entity.dx > 0) {
        if ((cellright && !cell) ||
            (celldiag && !celldown && ny)) {
            entity.x = t2p(tx);
            entity.dx = 0;
        }
    } else if (entity.dx < 0) {
        if ((cell && !cellright) ||
            (celldown && !celldiag && ny)) {
            entity.x = t2p(tx + 1);
            entity.dx = 0;
        }
    }

    if (entity.monster) {
        if (entity.left && (cell || !celldown)) {
            entity.left = false;
            entity.right = true;
        } else if (entity.right && (cellright || !celldiag)) {
            entity.right = false;
            entity.left = true;
        }
    }

    entity.falling = !(celldown || (nx && celldiag));

}

//-------------------------------------------------------------------------
// Прорисовка
//-------------------------------------------------------------------------

function render(ctx, frame, dt) {
    ctx.clearRect(0, 0, width, height);
    renderMap(ctx);
    renderTreasure(ctx, frame);
    renderPlayer(ctx, dt);
    renderMonsters(ctx, dt);
}

function renderMap(ctx) {
    var x, y, cell;
    for (y = 0; y < MAP.th; y++) {
        for (x = 0; x < MAP.tw; x++) {
            cell = tcell(x, y);
            if (cell) {
                ctx.fillStyle = COLORS[cell - 1];
                ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
            }
        }
    }
}

function renderPlayer(ctx, dt) {
	var start = 0;
	
	if(player.left){
		start = 4 * TILE;
	}else if(player.right){
		start = 3 * TILE;
	}else if(player.jumping){
		start = 2 * TILE;
	}else if(player.ducking){
		start = 1 * TILE;
	}
	
	ctx.drawImage(player.sprite, start, 0, TILE, TILE, player.x + (player.dx * dt), player.y + (player.dy * dt), TILE, TILE);
	//ctx.fillRect(player.x + (player.dx * dt), player.y + (player.dy * dt), TILE, TILE);
}

function renderMonsters(ctx, dt) {
    ctx.fillStyle = COLOR.SLATE;
    var n, max, monster;
    for (n = 0, max = monsters.length; n < max; n++) {
        monster = monsters[n];
        if (!monster.dead)
            ctx.fillRect(monster.x + (monster.dx * dt), monster.y + (monster.dy * dt), TILE, TILE);
    }
}

function renderTreasure(ctx, frame) {
    ctx.fillStyle = COLOR.GOLD;
    ctx.globalAlpha = 0.25 + tweenTreasure(frame, 60);
    var n, max, t;
    for (n = 0, max = treasure.length; n < max; n++) {
        t = treasure[n];
        if (!t.collected)
            ctx.fillRect(t.x, t.y + TILE / 3, TILE, TILE * 2 / 3);
    }
    ctx.globalAlpha = 1;
}

function tweenTreasure(frame, duration) {
    var half = duration / 2
    pulse = frame % duration;
    return pulse < half ? (pulse / half) : 1 - (pulse - half) / half;
}

//-------------------------------------------------------------------------
// Карта (уровни)
//-------------------------------------------------------------------------

function setup(map) {
    var data = map.layers[0].data,
        objects = map.layers[1].objects,
        n, obj, entity;
	
	//Объекты
    for (n = 0; n < objects.length; n++) {
        obj = objects[n];
        entity = setupEntity(obj);
        switch (obj.type) {
            case "player":
                player = entity;
                break;
            case "monster":
                monsters.push(entity);
                break;
            case "treasure":
                treasure.push(entity);
                break;
        }
    }
	
	//Карта
    cells = data;
	
	document.getElementById("score").innerHTML = score;
	document.getElementById("lvl").innerHTML = CURR_LEVEL;
    if(!timer)
		timer = timestamp();
	
    frame();
}

function setupEntity(obj) {
	var entity = {};
	entity.sprite = obj.type == "player" ? PLAYER_SPRITE : undefined;
    entity.x = obj.x;
    entity.y = obj.y;
    entity.dx = 0;
    entity.dy = 0;
    entity.gravity = METER * (obj.properties.gravity || GRAVITY);
    entity.maxdx = METER * (obj.properties.maxdx || MAXDX);
    entity.maxdy = METER * (obj.properties.maxdy || MAXDY);
    entity.impulse = METER * (obj.properties.impulse || IMPULSE);
    entity.accel = entity.maxdx / (obj.properties.accel || ACCEL);
    entity.friction = entity.maxdx / (obj.properties.friction || FRICTION);
    entity.monster = obj.type == "monster";
    entity.player = obj.type == "player";
    entity.treasure = obj.type == "treasure";
    entity.left = obj.properties.left;
    entity.right = obj.properties.right;
    entity.start = {
        x: obj.x,
        y: obj.y
    }
    entity.killed = entity.collected = 0;
    return entity;
}

//-------------------------------------------------------------------------
// Игровой цикл
//-------------------------------------------------------------------------

var counter = 0, dt = 0, now, last = timestamp();

function frame() {
	if(timer)
		document.getElementById("time").innerHTML = Math.floor((timestamp() - timer) / 1000);
	
	now = timestamp();
    dt = dt + Math.min(1, (now - last) / 1000);
    while (dt > step) {
        dt = dt - step;
        update(step);
    }
    render(ctx, counter, dt);
    last = now;
    counter++;
	ANIM = requestAnimationFrame(frame, canvas);
	
    if (player.collected == treasure.length) {
        monsters = [];
        treasure = [];

        if (CURR_LEVEL < MAX_LEVEL) {
            CURR_LEVEL++;
			
			AUDIO.src = '04.wav';
			AUDIO.play();
			
            get("level" + CURR_LEVEL + ".json", function(req) {
                MAP_JSON = JSON.parse(req.responseText)
                setup(MAP_JSON);
            });
        } else if (CURR_LEVEL == MAX_LEVEL) {
				GameEnd(score, (timestamp() - timer) / 1000);
				timer = null;
        }
    } 
}

//Спрайт
PLAYER_SPRITE.src = "sprites/player.png";
PLAYER_SPRITE.onload = function(){PLAYER_SPRITE.done = true};

//Подгрузка таблицы рекордов
get("dbtool.php", function(req){
	document.getElementById("records").innerHTML = req.responseText;
});

//Запуск игры
function Start() {
    NICK = document.getElementById("nick").value;

    if (NICK.length > 0 && PLAYER_SPRITE.done) {
		document.getElementById("nick").style.display = "none";
		document.getElementById("start").style.display = "none";
		canvas.style.opacity = "1";
        canvas.style.display = "inline-block";
		
		//Хук клавиш
		document.addEventListener('keydown', function(ev) {return onkey(ev, ev.keyCode, true);}, false);
		document.addEventListener('keyup', function(ev) {return onkey(ev, ev.keyCode, false);}, false);

        MUSIC.preload = 'auto';
        MUSIC.src = 'sound.wav';
		MUSIC.loop = true;
        MUSIC.play();
		
        get("level" + CURR_LEVEL + ".json", function(req) {
            MAP_JSON = JSON.parse(req.responseText);
            setup(MAP_JSON);
        });
    }
}