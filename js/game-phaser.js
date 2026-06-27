let phaserGameInstance = null;
let activeScene = null;
let wordPool = [];
let onItemCollideCallback = null;

function startPronunciationGame(words, onItemCollide) {
  wordPool = words;
  onItemCollideCallback = onItemCollide;

  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 500,
    parent: "phaserGame",
    backgroundColor: "#9ed98a",
    physics: { default: "arcade", arcade: { debug: false } },
    scene: { create: create, update: update }
  };

  phaserGameInstance = new Phaser.Game(config);
}

function create() {
  activeScene = this;
  this.popupOpen = false;

  drawBackground(this);
  buildPlayerTexture(this);

  this.player = this.physics.add.sprite(400, 250, "playerTex");
  this.player.setCollideWorldBounds(true);
  this.physics.world.setBounds(0, 0, 800, 500);

  this.cursors = this.input.keyboard.createCursorKeys();
  this.wasd = this.input.keyboard.addKeys("W,A,S,D");

  this.items = this.physics.add.group();
  const itemEmojis = ["⭐", "🎈", "🍎", "🎁", "🍭", "🌟"];
  const positions = [
    { x: 120, y: 100 }, { x: 680, y: 90 }, { x: 150, y: 400 },
    { x: 660, y: 410 }, { x: 60, y: 250 }, { x: 740, y: 250 }
  ];

  positions.forEach(function (pos, i) {
    const item = this.add.text(pos.x, pos.y, itemEmojis[i % itemEmojis.length], { fontSize: "36px" });
    item.setOrigin(0.5);
    this.physics.add.existing(item);
    item.body.setCircle(18);
    this.items.add(item);
  }, this);

  this.physics.add.overlap(this.player, this.items, function (player, item) {
    if (this.popupOpen) return;
    this.popupOpen = true;
    item.body.enable = false;
    item.setVisible(false);
    item.respawnTimer = this.time.delayedCall(600, function () {
      item.setPosition(40 + Math.random() * 720, 40 + Math.random() * 420);
    });
    const word = wordPool.length ? wordPool[Math.floor(Math.random() * wordPool.length)] : null;
    if (onItemCollideCallback) onItemCollideCallback(word, item);
  }, null, this);
}

function resumePronunciationGame(item) {
  if (!activeScene) return;
  activeScene.popupOpen = false;
  if (item) {
    item.body.enable = true;
    item.setVisible(true);
  }
}

function update() {
  if (this.popupOpen) {
    this.player.setVelocity(0, 0);
    return;
  }
  const speed = 200;
  let vx = 0;
  let vy = 0;
  if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= speed;
  if (this.cursors.right.isDown || this.wasd.D.isDown) vx += speed;
  if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= speed;
  if (this.cursors.down.isDown || this.wasd.S.isDown) vy += speed;
  this.player.setVelocity(vx, vy);
}

function drawBackground(scene) {
  const g = scene.add.graphics();

  g.fillStyle(0x9ed98a, 1);
  g.fillRect(0, 0, 800, 500);

  g.fillStyle(0x6fc3e0, 1);
  g.fillRect(0, 200, 800, 70);
  g.lineStyle(2, 0xffffff, 0.5);
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.moveTo(i * 140, 220 + (i % 2) * 8);
    g.lineTo(i * 140 + 60, 220 + (i % 2) * 8);
    g.strokePath();
  }

  g.fillStyle(0xd9c9a3, 1);
  g.fillRect(370, 0, 60, 500);

  g.fillStyle(0x9b6b43, 1);
  g.fillRect(370, 195, 60, 80);
  g.lineStyle(3, 0x6b4423, 1);
  g.strokeRect(370, 195, 60, 80);

  drawHouse(g, 130, 330);
  drawHouse(g, 600, 110);
  drawHouse(g, 660, 360);
}

function drawHouse(g, x, y) {
  g.fillStyle(0xf2e1c1, 1);
  g.fillRect(x, y, 70, 55);
  g.fillStyle(0xc0392b, 1);
  g.beginPath();
  g.moveTo(x - 10, y);
  g.lineTo(x + 35, y - 35);
  g.lineTo(x + 80, y);
  g.closePath();
  g.fillPath();
  g.fillStyle(0x6b4423, 1);
  g.fillRect(x + 28, y + 25, 16, 30);
}

function buildPlayerTexture(scene) {
  if (scene.textures.exists("playerTex")) return;
  const g = scene.add.graphics();
  g.fillStyle(0xff9f1c, 1);
  g.fillCircle(20, 24, 16);
  g.fillStyle(0xffd9b3, 1);
  g.fillCircle(20, 12, 11);
  g.fillStyle(0x2b2438, 1);
  g.fillCircle(16, 11, 2);
  g.fillCircle(24, 11, 2);
  g.generateTexture("playerTex", 40, 40);
  g.destroy();
}
