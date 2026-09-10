class GeoDashRunner {
    constructor(data, gameEnv) {
        this.gameEnv = gameEnv;
        this.parentControl = gameEnv && gameEnv.gameControl ? gameEnv.gameControl : null;
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
        this.gravity = 0.95;
        this.jumpVelocity = -15.5;
        this.speed = 8;
        this.distance = 0;
        this.levelLength = 9000;
        this.frame = 0;
        this.gameOver = false;

        this.levelMap = [
            { pos: 300, width: 32, height: 60, type: 'spike', deadly: true },
            { pos: 500, width: 48, height: 80, type: 'block', deadly: false },
            { pos: 700, width: 32, height: 60, type: 'spike', deadly: true },
            { pos: 900, width: 48, height: 70, type: 'spike', deadly: true },
            { pos: 1100, width: 60, height: 90, type: 'block', deadly: false },
            { pos: 1300, width: 32, height: 60, type: 'spike', deadly: true },
            { pos: 1500, width: 64, height: 60, type: 'double-spike', deadly: true },
            { pos: 1750, width: 72, height: 110, type: 'block', deadly: false },
            { pos: 1950, width: 32, height: 60, type: 'spike', deadly: true },
            { pos: 2150, width: 48, height: 100, type: 'block', deadly: false },
            { pos: 2350, width: 96, height: 60, type: 'triple-spike', deadly: true },
            { pos: 2600, width: 60, height: 95, type: 'block', deadly: false },
            { pos: 2800, width: 32, height: 60, type: 'spike', deadly: true },
            { pos: 3000, width: 64, height: 60, type: 'double-spike', deadly: true },
            { pos: 3250, width: 80, height: 105, type: 'block', deadly: false },
            { pos: 3450, width: 96, height: 60, type: 'triple-spike', deadly: true },
            { pos: 3700, width: 48, height: 110, type: 'block', deadly: false },
            { pos: 3900, width: 128, height: 60, type: 'triple-spike', deadly: true }
        ];
        this.obstacles = this.levelMap.map(obs => ({ ...obs, x: obs.pos }));
        this.nextObstaclePosition = 4200;
        this.dynamicPatternIndex = 0;

        this.handleKeyDown = (event) => {
            this.keys.add(event.code);
            if (['Space', 'ArrowUp', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(event.code)) {
                event.preventDefault();
            }
        };
        this.handleKeyUp = (event) => this.keys.delete(event.code);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        this.player.y = this.groundY - this.player.height;
        this.message = 'STEVE DASH  |  SPACE / W / UP TO JUMP';
        this.messageUntil = performance.now() + 2500;
    }

    spawnUpcomingObstacles() {
        const patterns = [
            [{ width: 32, height: 60, type: 'spike', deadly: true }],
            [{ width: 48, height: 70, type: 'block', deadly: false }, { width: 64, height: 90, type: 'block', deadly: false }],
            [{ width: 32, height: 60, type: 'spike', deadly: true }],
            [{ width: 64, height: 60, type: 'double-spike', deadly: true }],
            [{ width: 60, height: 80, type: 'block', deadly: false }, { width: 32, height: 60, type: 'spike', deadly: true }]
        ];
        const pattern = patterns[this.dynamicPatternIndex % patterns.length];
        const gap = pattern.length === 2 ? 270 : 300;
        pattern.forEach((obstacle, index) => {
            this.obstacles.push({
                ...obstacle,
                pos: this.nextObstaclePosition + index * 80,
                x: this.nextObstaclePosition + index * 80
            });
        });
        this.nextObstaclePosition += gap;
        this.dynamicPatternIndex += 1;
    }

    ensureUpcomingObstacles() {
        while (this.nextObstaclePosition < this.distance + this.canvas.width + 500 && this.nextObstaclePosition < this.levelLength) {
            this.spawnUpcomingObstacles();
        }
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
        this.ensureUpcomingObstacles();
        this.speed = Math.min(11, 8 + Math.floor(this.distance / 1800));
        this.obstacles = this.obstacles.filter(obstacle => obstacle.x + obstacle.width > -40);
        this.distance += this.speed;
        this.frame = (this.frame + 1) % 4;

        if (this.obstacles.some(obstacle => obstacle.deadly && this.intersects(obstacle))) {
            this.endGame();
        }
        if (this.distance >= this.levelLength) {
            this.levelComplete();
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

        const progress = Math.min(100, Math.floor((this.distance / this.levelLength) * 100));
        ctx.fillStyle = '#44e0c1';
        ctx.fillRect(24, canvas.height - 30, (canvas.width - 48) * (progress / 100), 10);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(24, canvas.height - 30, canvas.width - 48, 10);

        for (const obstacle of this.obstacles) {
            const y = this.groundY - obstacle.height;
            if (obstacle.deadly) {
                ctx.fillStyle = '#ff4f78';
                const spikeCount = obstacle.type === 'triple-spike' ? 3 : obstacle.type === 'double-spike' ? 2 : 1;
                const spikeWidth = obstacle.width / spikeCount;
                for (let spike = 0; spike < spikeCount; spike++) {
                    ctx.beginPath();
                    ctx.moveTo(obstacle.x + spike * spikeWidth, this.groundY);
                    ctx.lineTo(obstacle.x + (spike + 0.5) * spikeWidth, y);
                    ctx.lineTo(obstacle.x + (spike + 1) * spikeWidth, this.groundY);
                    ctx.fill();
                }
            } else {
                ctx.fillStyle = '#5d5d9f';
                ctx.fillRect(obstacle.x, y, obstacle.width, obstacle.height);
                ctx.fillStyle = '#7d7daf';
                ctx.fillRect(obstacle.x + 4, y + 4, obstacle.width - 8, obstacle.height - 8);
            }
        }

        if (this.steve.complete && this.steve.naturalWidth) {
            ctx.drawImage(this.steve, this.frame * 32, 32, 32, 32, this.player.x, this.player.y, this.player.width, this.player.height);
        } else {
            ctx.fillStyle = '#55a7ff';
            ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`STEVE DASH   ${progress}%`, 24, 34);

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
        this.message = 'STEVE HIT A SPIKE!';
        this.showReturnButton();
    }

    levelComplete() {
        this.gameOver = true;
        this.message = 'LEVEL COMPLETE!';
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
        this.returnButton.addEventListener('click', () => {
            if (this.parentControl && this.parentControl.isNested) {
                this.parentControl.endLevel();
            } else if (this.gameEnv && this.gameEnv.gameControl) {
                this.gameEnv.gameControl.endLevel();
            }
        });
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
