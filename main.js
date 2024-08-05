const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const tileSize = 40;
const mapWidth = 100; // 맵 크기 축소
const mapHeight = 100;

const regions = ['plain', 'grassland', 'highland', 'mountain', 'coast', 'snow', 'volcano'];
const regionColors = {
    plain: 'lightgreen',
    grassland: 'green',
    highland: 'lightblue',
    mountain: 'grey',
    coast: 'yellow',
    snow: 'white',
    volcano: 'darkred'
};

const map = Array.from({ length: mapHeight }, () => Array.from({ length: mapWidth }, () => Math.random() > 0.1 ? 0 : 1));

const generateRandomPosition = () => ({
    x: Math.floor(Math.random() * mapWidth) * tileSize,
    y: Math.floor(Math.random() * mapHeight) * tileSize
});

const checkpoints = Array.from({ length: 20 }, (_, i) => ({
    ...generateRandomPosition(),
    width: tileSize,
    height: tileSize,
    active: false
}));

const player = {
    x: tileSize,
    y: tileSize,
    width: tileSize - 2,
    height: tileSize - 2,
    speed: 5,
    dx: 0,
    dy: 0,
    health: 100,
    maxHealth: 100,
    isAttacking: false,
    attackCooldown: 0,
    checkpoint: { x: tileSize, y: tileSize },
    angle: 0,
    attackType: 'light',
    attackPower: 10,
    level: 1,
    leaves: 0
};

const maxEnemies = 50;
const maxBosses = 5;

let enemies = [];
let bosses = [];
let bossActive = false;

const items = [];

const spawnEnemy = () => {
    if (enemies.length < maxEnemies) {
        enemies.push({
            ...generateRandomPosition(),
            width: tileSize - 2,
            height: tileSize - 2,
            speed: 2,
            health: 100,
            maxHealth: 100,
            attackCooldown: 0,
            attackAngle: 0,
            attackPower: 5 // 적의 공격 대미지 조정
        });
    }
};

const spawnBoss = () => {
    if (bosses.length < maxBosses) {
        const boss = {
            ...generateRandomPosition(),
            width: tileSize * 2,
            height: tileSize * 2,
            speed: 3,
            health: 500,
            maxHealth: 500,
            attackCooldown: 0,
            patterns: ['slash', 'thrust', 'throw', 'ranged', 'homing', 'circle_ranged', 'circle_slash'],
            currentPattern: 'idle',
            name: 'Boss'
        };
        if (!bosses.some(b => checkCollision(b, boss, 5 * tileSize))) {
            bosses.push(boss);
        }
    }
};

const spawnLegendBoss = () => {
    regions.forEach(region => {
        const boss = {
            ...generateRandomPosition(),
            width: tileSize,
            height: tileSize,
            speed: 4,
            health: 2000,
            maxHealth: 2000,
            attackCooldown: 0,
            patterns: ['slash', 'thrust', 'throw', 'ranged', 'homing', 'circle_ranged', 'circle_slash'],
            currentPattern: 'idle',
            name: `Legendary ${region}`,
            color: 'rainbow'
        };
        if (!bosses.some(b => checkCollision(b, boss, 10 * tileSize))) {
            bosses.push(boss);
        }
    });
};

function drawHealthBar(obj, x, y) {
    ctx.fillStyle = 'red';
    ctx.fillRect(x, y, 50, 5);
    ctx.fillStyle = 'green';
    ctx.fillRect(x, y, 50 * (obj.health / obj.maxHealth), 5);
}

function drawPlayerHealthBar() {
    ctx.fillStyle = 'black';
    ctx.fillRect(19, 19, 202, 22); // 테두리
    ctx.fillStyle = 'red';
    ctx.fillRect(20, 20, 200, 20); // 배경
    ctx.fillStyle = 'green';
    ctx.fillRect(20, 20, 200 * (player.health / player.maxHealth), 20); // 체력바
}

function drawBossHealthBar() {
    if (bossActive) {
        ctx.fillStyle = 'red';
        ctx.fillRect(150, canvas.height - 30, canvas.width - 300, 20);
        ctx.fillStyle = 'green';
        ctx.fillRect(150, canvas.height - 30, (canvas.width - 300) * (bosses[0].health / bosses[0].maxHealth), 20);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(bosses[0].name, canvas.width / 2 - 30, canvas.height - 35);
    }
}

function drawMap(offsetX, offsetY) {
    for (let row = 0; row < map.length; row++) {
        for (let col = 0; col < map[row].length; col++) {
            if (map[row][col] === 1) {
                ctx.fillStyle = 'black';
                ctx.fillRect(col * tileSize - offsetX, row * tileSize - offsetY, tileSize, tileSize);
            } else {
                ctx.fillStyle = regionColors[regions[Math.floor((row / mapHeight) * regions.length)]];
                ctx.fillRect(col * tileSize - offsetX, row * tileSize - offsetY, tileSize, tileSize);
            }
        }
    }
    checkpoints.forEach(checkpoint => {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(checkpoint.x - offsetX, checkpoint.y - offsetY, checkpoint.width, checkpoint.height);
    });
}

function drawPlayer(offsetX, offsetY) {
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x - offsetX, player.y - offsetY, player.width, player.height);
    drawPlayerHealthBar();
    if (player.isAttacking) {
        drawAttack(offsetX, offsetY);
    }
}

function drawEnemies(offsetX, offsetY) {
    enemies.forEach(enemy => {
        ctx.fillStyle = 'red';
        ctx.fillRect(enemy.x - offsetX, enemy.y - offsetY, enemy.width, enemy.height);
        drawHealthBar(enemy, enemy.x - offsetX, enemy.y - 10 - offsetY);
        if (enemy.isAttacking) {
            drawEnemyAttack(enemy, offsetX, offsetY);
        }
    });
}

function drawBosses(offsetX, offsetY) {
    bosses.forEach(boss => {
        ctx.fillStyle = boss.color === 'rainbow' ? 'magenta' : 'purple';
        ctx.fillRect(boss.x - offsetX, boss.y - offsetY, boss.width, boss.height);
        drawHealthBar(boss, boss.x - offsetX, boss.y - 10 - offsetY);
    });
}

function drawItems(offsetX, offsetY) {
    ctx.fillStyle = 'green';
    items.forEach(item => {
        ctx.fillRect(item.x - offsetX, item.y - offsetY, item.width, item.height);
    });
}

function drawAttack(offsetX, offsetY) {
    ctx.save();
    ctx.translate(player.x + player.width / 2 - offsetX, player.y + player.height / 2 - offsetY);
    ctx.rotate(player.angle);
    ctx.fillStyle = 'white';
    if (player.attackType === 'light') {
        ctx.fillRect(0, -5, 60, 10); // larger sword for light attack
    } else {
        ctx.fillRect(-30, -5, 60, 10); // larger sword for heavy attack
    }
    ctx.restore();
}

function drawEnemyAttack(enemy, offsetX, offsetY) {
    ctx.save();
    ctx.translate(enemy.x + enemy.width / 2 - offsetX, enemy.y + enemy.height / 2 - offsetY);
    ctx.rotate(enemy.attackAngle);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, -5, 40, 10); // enemy sword
    ctx.restore();
}

function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function newPos() {
    player.x += player.dx;
    player.y += player.dy;
    detectWalls(player);
    moveEnemies();
    moveBosses();
    checkCheckpoints();
}

function detectWalls(obj) {
    if (obj.x < 0) {
        obj.x = 0;
    }

    if (obj.x + obj.width > mapWidth * tileSize) {
        obj.x = mapWidth * tileSize - obj.width;
    }

    if (obj.y < 0) {
        obj.y = 0;
    }

    if (obj.y + obj.height > mapHeight * tileSize) {
        obj.y = mapHeight * tileSize - obj.height;
    }
}

function moveEnemies() {
    enemies.forEach(enemy => {
        if (enemy.x < player.x) {
            enemy.x += enemy.speed;
        } else if (enemy.x > player.x) {
            enemy.x -= enemy.speed;
        }
        
        if (enemy.y < player.y) {
            enemy.y += enemy.speed;
        } else if (enemy.y > player.y) {
            enemy.y -= enemy.speed;
        }

        if (checkCollision(player, enemy)) {
            enemy.isAttacking = true;
            enemy.attackAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            if (enemy.attackCooldown === 0) {
                attack(enemy, player);
                enemy.attackCooldown = 120; // 공격 간격 2초로 조정
            }
        } else {
            enemy.isAttacking = false;
        }
        
        if (enemy.attackCooldown > 0) {
            enemy.attackCooldown--;
        }
    });
}

function moveBosses() {
    bosses.forEach(boss => {
        if (bossActive) {
            if (boss.x < player.x) {
                boss.x += boss.speed;
            } else if (boss.x > player.x) {
                boss.x -= boss.speed;
            }
            
            if (boss.y < player.y) {
                boss.y += boss.speed;
            } else if (boss.y > player.y) {
                boss.y -= boss.speed;
            }
            
            if (checkCollision(player, boss)) {
                boss.isAttacking = true;
                if (boss.attackCooldown === 0) {
                    boss.currentPattern = boss.patterns[Math.floor(Math.random() * boss.patterns.length)];
                    performBossAttack(boss);
                    boss.attackCooldown = 200; // 공격 빈도 조절
                }
            } else {
                boss.isAttacking = false;
            }
            
            if (boss.attackCooldown > 0) {
                boss.attackCooldown--;
            }
        }
    });
}

function performBossAttack(boss) {
    switch (boss.currentPattern) {
        case 'slash':
            // Boss slash attack
            attack(boss, player);
            break;
        case 'thrust':
            // Boss thrust attack
            attack(boss, player);
            break;
        case 'throw':
            // Boss throw attack (projectile)
            break;
        case 'ranged':
            // Boss ranged attack
            break;
        case 'homing':
            // Boss homing attack
            break;
        case 'circle_ranged':
            // Boss circle ranged attack
            break;
        case 'circle_slash':
            // Boss circle slash attack
            attack(boss, player);
            break;
    }
}

function checkCollision(obj1, obj2, buffer = 0) {
    return obj1.x < obj2.x + obj2.width + buffer &&
           obj1.x + obj1.width > obj2.x - buffer &&
           obj1.y < obj2.y + obj2.height + buffer &&
           obj1.y + obj1.height > obj2.y - buffer;
}

function attack(attacker, defender) {
    defender.health -= attacker.attackPower;
    if (defender.health <= 0) {
        defender.health = 0;
        if (defender === player) {
            ctx.fillStyle = 'red';
            ctx.font = '30px Arial';
            ctx.fillText('YOU DIE', canvas.width / 2 - 50, canvas.height / 2);
            player.leaves = 0;
            setTimeout(respawnPlayer, 2000);
        } else {
            if (bosses.includes(defender)) {
                ctx.fillStyle = defender.color === 'rainbow' ? 'yellow' : 'green';
                ctx.font = '30px Arial';
                ctx.fillText(defender.color === 'rainbow' ? 'LEGEND FAILED' : 'ENEMY FAILED', canvas.width / 2 - 50, canvas.height / 2);
                if (defender.color === 'rainbow') {
                    player.leaves += 1000; // 레전드 보스가 떨어뜨리는 나뭇잎의 양
                } else {
                    player.leaves += 100; // 일반 보스가 떨어뜨리는 나뭇잎의 양
                }
                setTimeout(() => bosses.splice(bosses.indexOf(defender), 1), 1000);
            } else {
                player.leaves += 10; // 일반 적이 떨어뜨리는 나뭇잎의 양
                enemies.splice(enemies.indexOf(defender), 1);
            }
        }
    }
}

function checkCheckpoints() {
    checkpoints.forEach(checkpoint => {
        if (checkCollision(player, checkpoint)) {
            checkpoint.active = true;
            player.checkpoint.x = checkpoint.x;
            player.checkpoint.y = checkpoint.y;
        }
    });
}

function respawnPlayer() {
    player.x = player.checkpoint.x;
    player.y = player.checkpoint.y;
    player.health = player.maxHealth;
}

function update() {
    clear();
    newPos();
    const offsetX = Math.max(0, Math.min(mapWidth * tileSize - canvas.width, player.x - canvas.width / 2));
    const offsetY = Math.max(0, Math.min(mapHeight * tileSize - canvas.height, player.y - canvas.height / 2));
    drawMap(offsetX, offsetY);
    drawPlayer(offsetX, offsetY);
    drawEnemies(offsetX, offsetY);
    drawItems(offsetX, offsetY);
    drawBosses(offsetX, offsetY);
    drawBossHealthBar();

    if (Math.random() < 0.01) spawnEnemy();
    if (Math.random() < 0.001) spawnBoss();

    if (player.isAttacking) {
        enemies.forEach(enemy => {
            if (player.attackType === 'light') {
                if (checkCollision({ x: player.x + player.width / 2, y: player.y - 10, width: 60, height: 10 }, enemy)) {
                    attack(player, enemy);
                }
            } else {
                if (checkCollision({ x: player.x - 30, y: player.y - 5, width: 60, height: 10 }, enemy)) {
                    attack(player, enemy);
                }
            }
        });
        bosses.forEach(boss => {
            if (player.attackType === 'light') {
                if (checkCollision({ x: player.x + player.width / 2, y: player.y - 10, width: 60, height: 10 }, boss)) {
                    attack(player, boss);
                    bossActive = true;
                }
            } else {
                if (checkCollision({ x: player.x - 30, y: player.y - 5, width: 60, height: 10 }, boss)) {
                    attack(player, boss);
                    bossActive = true;
                }
            }
        });
    }

    if (player.attackCooldown > 0) {
        player.attackCooldown--;
    }

    enemies.forEach(enemy => {
        if (enemy.isAttacking && checkCollision({ x: enemy.x, y: enemy.y, width: 40, height: 10 }, player)) {
            attack(enemy, player);
        }

        if (enemy.attackCooldown > 0) {
            enemy.attackCooldown--;
        }
    });

    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Leaves: ${player.leaves}`, canvas.width - 150, canvas.height - 50);
    ctx.fillText(`Level: ${player.level}`, canvas.width - 150, canvas.height - 80); // 레벨 표시

    requestAnimationFrame(update);
}

function moveUp() {
    player.dy = -player.speed;
}

function moveDown() {
    player.dy = player.speed;
}

function moveRight() {
    player.dx = player.speed;
}

function moveLeft() {
    player.dx = -player.speed;
}

function stopMovement() {
    player.dx = 0;
    player.dy = 0;
}

function keyDown(e) {
    if (e.key === 'ArrowRight' || e.key === 'd') {
        moveRight();
    } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        moveLeft();
    } else if (e.key === 'ArrowUp' || e.key === 'w') {
        moveUp();
    } else if (e.key === 'ArrowDown' || e.key === 's') {
        moveDown();
    } else if (e.key === 'u') {
        upgradePlayer();
    }
}

function keyUp(e) {
    if (
        e.key === 'ArrowRight' ||
        e.key === 'd' ||
        e.key === 'ArrowLeft' ||
        e.key === 'a' ||
        e.key === 'ArrowUp' ||
        e.key === 'w' ||
        e.key === 'ArrowDown' ||
        e.key === 's'
    ) {
        stopMovement();
    }
}

function mouseDown(e) {
    if (e.button === 0) { // left click for light attack
        player.isAttacking = true;
        player.attackType = 'light';
        player.attackCooldown = 20;
    } else if (e.button === 2) { // right click for heavy attack
        player.isAttacking = true;
        player.attackType = 'heavy';
        player.attackCooldown = 40;
    }
}

function mouseUp(e) {
    if (e.button === 0 || e.button === 2) {
        player.isAttacking = false;
    }
}

function mouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const angle = Math.atan2(mouseY - (player.y - player.dy + player.height / 2 - rect.top), mouseX - (player.x - player.dx + player.width / 2 - rect.left));
    player.angle = angle;
}

function upgradePlayer() {
    const upgradeCost = player.level * 100;
    if (player.leaves >= upgradeCost) {
        const upgrade = confirm(`${upgradeCost} leaves required to level up. Proceed?`);
        if (upgrade) {
            player.leaves -= upgradeCost;
            player.level++;
            player.attackPower += 5;
            player.maxHealth += 20;
            player.health = player.maxHealth;
        }
    } else {
        alert('Not enough leaves for upgrade.');
    }
}

document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);
canvas.addEventListener('mousedown', mouseDown);
canvas.addEventListener('mouseup', mouseUp);
canvas.addEventListener('mousemove', mouseMove);

spawnLegendBoss();
update();
