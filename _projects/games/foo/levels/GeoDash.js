class GeoDashRunner {
    constructor(data, gameEnv) {
        this.gameEnv = gameEnv;
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'geoDashCanvas';
        this.canvas.width = gameEnv.innerWidth;
        this.canvas.height = gameEnv.innerHeight;
        Object.assign(this.canvas.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '10000',
            imageRendering: 'pixelated'
        });
        gameEnv.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.steve = new Image();
        this.steve.src = `${gameEnv.path}/images/projects/gamify/end_steve.png`;
        this.keys = new Set();
        this.player = { x: 120, y: 0, width: 58, height: 58, velocityY: 0 };
        this.groundY = this.canvas.height - 100;
        this.gravity = 0.85;
        this.jumpVelocity = -16;
        this.speed = 6;
        this.distance = 0;
        this.frame = 0;
        this.gameOver = false;
        this.obstacles = [
            { x: 620, width: 42, height: 58 },
            { x: 980, width: 52, height: 82 },
            { x: 1400, width: 42, height: 110 },
            { x: 1770, width: 60, height: 64 }
        ];

        this.handleKeyDown = (event) => {
            this.keys.add(event.code);
            if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) {
                event.preventDefault();
            }
        };
        this.handleKeyUp = (event) => this.keys.delete(event.code);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        this.player.y = this.groundY - this.player.height;
        this.showStartScreen();
    }

    showStartScreen() {
        this.message = 'STEVE DASH  |  SPACE / W / UP TO JUMP';
        this.messageUntil = performance.now() + 2500;
    }

    update() {
        if (this.gameOver) {
            this.draw();
            return;
        }

        const jumpPressed = this.keys.has('Space') || this.keys.has('ArrowUp') || this.keys.has('KeyW');
        const onGround = this.player.y >= this.groundY - this.player.height - 1;
        if (jumpPressed && onGround && !this.jumpWasPressed) {
            this.player.velocityY = this.jumpVelocity;
        }
        this.jumpWasPressed = jumpPressed;
        this.player.velocityY += this.gravity;
        this.player.y += this.player.velocityY;
        if (this.player.y >= this.groundY - this.player.height) {
            this.player.y = this.groundY - this.player.height;
            this.player.velocityY = 0;
        }

        for (const obstacle of this.obstacles) obstacle.x -= this.speed;
        const lastObstacle = this.obstacles[this.obstacles.length - 1];
        if (lastObstacle.x < this.canvas.width - 180) {
            this.obstacles.push({
                x: lastObstacle.x + 300 + Math.random() * 180,
                width: 40 + Math.random() * 28,
                height: 45 + Math.random() * 75
            });
        }
        this.obstacles = this.obstacles.filter(obstacle => obstacle.x + obstacle.width > -40);
        this.distance += this.speed;
        this.frame = (this.frame + 1) % 4;

        if (this.obstacles.some(obstacle => this.intersects(obstacle))) {
            this.endGame();
        }
        this.draw();
    }

    intersects(obstacle) {
        const obstacleY = this.groundY - obstacle.height;
        return this.player.x < obstacle.x + obstacle.width &&
            this.player.x + this.player.width > obstacle.x &&
            this.player.y < obstacleY + obstacle.height &&
            this.player.y + this.player.height > obstacleY;
    }

    draw() {
        const { ctx, canvas } = this;
        const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
        sky.addColorStop(0, '#18204b');
        sky.addColorStop(1, '#34234f');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#f6c945';
        for (let x = 40 - (this.distance % 120); x < canvas.width; x += 120) {
            ctx.fillRect(x, 90 + ((x / 120) % 3) * 45, 3, 3);
        }
        ctx.fillStyle = '#11142e';
        ctx.fillRect(0, this.groundY, canvas.width, canvas.height - this.groundY);
        ctx.fillStyle = '#44e0c1';
        ctx.fillRect(0, this.groundY, canvas.width, 8);

        for (const obstacle of this.obstacles) {
            const y = this.groundY - obstacle.height;
            ctx.fillStyle = '#ff5d73';
            ctx.fillRect(obstacle.x, y, obstacle.width, obstacle.height);
            ctx.fillStyle = '#ffd166';
            ctx.fillRect(obstacle.x + 7, y + 7, obstacle.width - 14, 7);
        }

        if (this.steve.complete && this.steve.naturalWidth) {
            ctx.drawImage(this.steve, this.frame * 32, 32, 32, 32, this.player.x, this.player.y, this.player.width, this.player.height);
        } else {
            ctx.fillStyle = '#55a7ff';
            ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`STEVE DASH   ${Math.floor(this.distance / 10)}m`, 24, 34);
        if (!this.gameOver && this.message && performance.now() < this.messageUntil) {
            ctx.textAlign = 'center';
            ctx.fillText(this.message, canvas.width / 2, 70);
            ctx.textAlign = 'left';
        }
        if (this.gameOver) {
            ctx.textAlign = 'center';
            ctx.font = 'bold 28px monospace';
            ctx.fillText(this.message, canvas.width / 2, canvas.height / 2 - 40);
            ctx.textAlign = 'left';
        }
    }

    endGame() {
        this.gameOver = true;
        this.message = 'STEVE HIT AN OBSTACLE';
        this.showReturnButton();
    }

    showReturnButton() {
        this.returnButton = document.createElement('button');
        this.returnButton.textContent = 'Return to Desert';
        Object.assign(this.returnButton.style, {
            position: 'fixed',
            left: '50%',
            top: '58%',
            transform: 'translate(-50%, -50%)',
            zIndex: '10002',
            padding: '12px 20px',
            background: '#44e0c1',
            color: '#11142e',
            border: '0',
            cursor: 'pointer',
            font: 'bold 16px monospace'
        });
        this.returnButton.addEventListener('click', () => this.gameEnv.gameControl.endLevel());
        document.body.appendChild(this.returnButton);
    }

    destroy() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        this.returnButton?.remove();
        this.canvas?.remove();
    }
}

class GeoDash {
    constructor(gameEnv) {
        this.classes = [{ class: GeoDashRunner, data: {} }];
    }
}

export default GeoDash;