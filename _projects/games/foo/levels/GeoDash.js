import GameEnvBackground from '@assets/js/GameEnginev1.1/essentials/GameEnvBackground.js';

export class GeoDashRunner {
    constructor(data, gameEnv) {
        this.gameEnv = gameEnv;
        this.parentControl = gameEnv && gameEnv.gameControl ? gameEnv.gameControl : null;
        this.container = (gameEnv && gameEnv.container) || document.body;
        
        if (this.container) {
            this.container.style.position = this.container.style.position || 'relative';
        }

        // Setup primary rendering canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'geoDashCanvas';
        this.canvas.width = gameEnv.innerWidth || window.innerWidth;
        this.canvas.height = gameEnv.innerHeight || window.innerHeight;
        
        Object.assign(this.canvas.style, {
            position: 'absolute',
            left: '0px',
            top: '0px',
            width: `${this.canvas.width}px`,
            height: `${this.canvas.height}px`,
            zIndex: '5',
            display: 'block',
            imageRendering: 'pixelated'
        });
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Asset Initialization
        this.steveImage = new Image();
        this.steveImage.src = `${gameEnv.path || ''}/images/projects/gamify/end_steve.png`;

        this.alexImage = new Image();
        this.alexImage.src = `${gameEnv.path || ''}/images/projects/gamify/Alex.png`;

        // Input & Physics Config
        this.keys = new Set();
        this.mouseHeld = false;
        this.groundY = this.canvas.height - 100;
        this.gravity = 0.8;
        this.jumpVelocity = -14;
        
        // Classic Original Speed
        this.baseSpeed = 6;
        this.speed = this.baseSpeed;
        this.distance = 0;
        this.levelLength = 9000;
        this.frame = 0;
        this.gameOver = false;

        // Player 1: Steve
        this.steve = {
            name: 'Steve',
            x: 120,
            y: 0,
            width: 58,
            height: 58,
            velocityY: 0,
            rotation: 0,
            color: '#ffc000',
            image: this.steveImage,
            isDead: false,
            onGround: false
        };

        // Player 2: Alex
        this.alex = {
            name: 'Alex',
            x: 180,
            y: 0,
            width: 58,
            height: 58,
            velocityY: 0,
            rotation: 0,
            color: '#00ffcc',
            image: this.alexImage,
            isDead: false,
            onGround: false
        };

        this.players = [this.steve, this.alex];

        // Structured Map Obstacles & Platforms
        this.levelMap = [
            { pos: 400, width: 36, height: 60, type: 'spike', deadly: true },
            { pos: 650, width: 80, height: 80, type: 'block', deadly: false },
            { pos: 900, width: 36, height: 60, type: 'spike', deadly: true },
            { pos: 1150, width: 72, height: 60, type: 'double-spike', deadly: true },
            { pos: 1450, width: 90, height: 90, type: 'block', deadly: false },
            { pos: 1700, width: 36, height: 60, type: 'spike', deadly: true },
            { pos: 1950, width: 108, height: 60, type: 'triple-spike', deadly: true },
            { pos: 2300, width: 100, height: 110, type: 'block', deadly: false },
            { pos: 2600, width: 72, height: 60, type: 'double-spike', deadly: true },
            { pos: 2900, width: 108, height: 60, type: 'triple-spike', deadly: true },
            { pos: 3250, width: 80, height: 100, type: 'block', deadly: false },
            { pos: 3550, width: 108, height: 60, type: 'triple-spike', deadly: true }
        ];

        this.obstacles = this.levelMap.map(obs => ({ ...obs, x: obs.pos }));
        this.nextObstaclePosition = 3900;
        this.dynamicPatternIndex = 0;

        // Key Listeners
        this.handleKeyDown = (event) => {
            this.keys.add(event.code);
            if (['Space', 'ArrowUp', 'KeyW', 'KeyI'].includes(event.code)) {
                event.preventDefault();
            }
        };
        this.handleKeyUp = (event) => this.keys.delete(event.code);

        // Pointer / Touch Listeners
        this.handleMouseDown = () => { this.mouseHeld = true; };
        this.handleMouseUp = () => { this.mouseHeld = false; };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.mouseHeld = true; });
        this.canvas.addEventListener('touchend', (e) => { e.preventDefault(); this.mouseHeld = false; });

        this.players.forEach(p => {
            p.y = this.groundY - p.height;
        });

        this.message = 'P1 (STEVE): SPACE/W/CLICK | P2 (ALEX): I KEY';
        this.messageUntil = performance.now() + 4000;

        this.loop = () => {
            this.update();
            if (!this.gameOver) {
                this.animationFrameId = requestAnimationFrame(this.loop);
            }
        };
        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    spawnUpcomingObstacles() {
        const patterns = [
            [{ width: 36, height: 60, type: 'spike', deadly: true }],
            [{ width: 80, height: 80, type: 'block', deadly: false }, { width: 36, height: 60, type: 'spike', deadly: true }],
            [{ width: 72, height: 60, type: 'double-spike', deadly: true }],
            [{ width: 90, height: 100, type: 'block', deadly: false }, { width: 72, height: 60, type: 'double-spike', deadly: true }],
            [{ width: 108, height: 60, type: 'triple-spike', deadly: true }]
        ];

        const pattern = patterns[this.dynamicPatternIndex % patterns.length];
        const gap = 360;

        pattern.forEach((obstacle, index) => {
            this.obstacles.push({
                ...obstacle,
                pos: this.nextObstaclePosition + index * 100,
                x: this.nextObstaclePosition + index * 100
            });
        });

        this.nextObstaclePosition += gap;
        this.dynamicPatternIndex += 1;
    }

    ensureUpcomingObstacles() {
        while (this.nextObstaclePosition < this.distance + this.canvas.width + 600 && this.nextObstaclePosition < this.levelLength) {
            this.spawnUpcomingObstacles();
        }
    }

    update() {
        if (this.gameOver) {
            this.draw();
            return;
        }

        const steveJump = this.keys.has('Space') || 
                          this.keys.has('ArrowUp') || 
                          this.keys.has('KeyW') || 
                          this.mouseHeld;

        const alexJump = this.keys.has('KeyI');

        this.players.forEach(player => {
            if (player.isDead) return;

            const isSteve = player === this.steve;
            const isJumpPressed = isSteve ? steveJump : alexJump;

            // Apply gravity
            player.velocityY += this.gravity;
            let nextY = player.y + player.velocityY;

            player.onGround = false;

            // Floor collision
            if (nextY >= this.groundY - player.height) {
                nextY = this.groundY - player.height;
                player.velocityY = 0;
                player.rotation = 0;
                player.onGround = true;
            }

            // Platform block collisions (landing on top)
            for (const obstacle of this.obstacles) {
                if (!obstacle.deadly) {
                    const blockTop = this.groundY - obstacle.height;
                    const blockLeft = obstacle.x;
                    const blockRight = obstacle.x + obstacle.width;

                    const playerRight = player.x + player.width;
                    const playerLeft = player.x;

                    // Check horizontal overlap
                    if (playerRight > blockLeft + 4 && playerLeft < blockRight - 4) {
                        // Landing on top of block
                        if (player.y + player.height <= blockTop + 12 && nextY + player.height >= blockTop) {
                            nextY = blockTop - player.height;
                            player.velocityY = 0;
                            player.rotation = 0;
                            player.onGround = true;
                        }
                    }
                }
            }

            player.y = nextY;

            // Execute Jump
            if (isJumpPressed && player.onGround) {
                player.velocityY = this.jumpVelocity;
                player.onGround = false;
            }

            // Air rotation
            if (!player.onGround) {
                player.rotation += 0.12;
            }
        });

        // Move world obstacles
        for (const obstacle of this.obstacles) {
            obstacle.x -= this.speed;
        }

        this.ensureUpcomingObstacles();
        this.obstacles = this.obstacles.filter(obs => obs.x + obs.width > -50);
        this.distance += this.speed;
        this.frame = (this.frame + 1) % 4;

        // Collision Checks
        for (const player of this.players) {
            if (player.isDead) continue;

            for (const obstacle of this.obstacles) {
                // Deadly spikes
                if (obstacle.deadly && this.intersects(player, obstacle)) {
                    player.isDead = true;
                }
                // Running directly into the side of a block
                else if (!obstacle.deadly) {
                    const blockTop = this.groundY - obstacle.height;
                    const blockLeft = obstacle.x;
                    
                    if (player.x + player.width > blockLeft && 
                        player.x < blockLeft + 10 && 
                        player.y + player.height > blockTop + 8) {
                        player.isDead = true; // Side impact destroys the player
                    }
                }
            }
        }

        if (this.players.every(p => p.isDead)) {
            this.endGame();
        }

        if (this.distance >= this.levelLength) {
            this.levelComplete();
        }

        this.draw();
    }

    intersects(player, obstacle) {
        const obstacleY = this.groundY - obstacle.height;
        const padding = 8;

        return (
            player.x + padding < obstacle.x + obstacle.width &&
            player.x + player.width - padding > obstacle.x &&
            player.y + padding < obstacleY + obstacle.height &&
            player.y + player.height - padding > obstacleY
        );
    }

    draw() {
        const { ctx, canvas } = this;

        // Background
        const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
        sky.addColorStop(0, '#0d1117');
        sky.addColorStop(1, '#161b22');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ground
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, this.groundY, canvas.width, canvas.height - this.groundY);
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(0, this.groundY, canvas.width, 6);

        // Progress Bar
        const progress = Math.min(100, Math.floor((this.distance / this.levelLength) * 100));
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(24, canvas.height - 25, (canvas.width - 48) * (progress / 100), 8);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(24, canvas.height - 25, canvas.width - 48, 8);

        // Draw Obstacles & Blocks
        for (const obstacle of this.obstacles) {
            const y = this.groundY - obstacle.height;
            if (obstacle.deadly) {
                ctx.fillStyle = '#ff2a6d';
                const spikeCount = obstacle.type === 'triple-spike' ? 3 : obstacle.type === 'double-spike' ? 2 : 1;
                const spikeWidth = obstacle.width / spikeCount;

                for (let spike = 0; spike < spikeCount; spike++) {
                    ctx.beginPath();
                    ctx.moveTo(obstacle.x + spike * spikeWidth, this.groundY);
                    ctx.lineTo(obstacle.x + (spike + 0.5) * spikeWidth, y);
                    ctx.lineTo(obstacle.x + (spike + 1) * spikeWidth, this.groundY);
                    ctx.closePath();
                    ctx.fill();
                }
            } else {
                // Landing Blocks
                ctx.fillStyle = '#05d9e8';
                ctx.fillRect(obstacle.x, y, obstacle.width, obstacle.height);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(obstacle.x + 2, y + 2, obstacle.width - 4, obstacle.height - 4);
            }
        }

        // Draw Players
        this.players.forEach(player => {
            if (player.isDead) return;

            ctx.save();
            ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
            ctx.rotate(player.rotation);

            if (player.image.complete && player.image.naturalWidth) {
                ctx.drawImage(
                    player.image,
                    this.frame * 32, 32, 32, 32,
                    -player.width / 2, -player.height / 2,
                    player.width, player.height
                );
            } else {
                ctx.fillStyle = player.color;
                ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
            }
            ctx.restore();
        });

        // UI Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(`PROGRESS: ${progress}%`, 24, 34);

        if (!this.gameOver && this.message && performance.now() < this.messageUntil) {
            ctx.textAlign = 'center';
            ctx.fillText(this.message, canvas.width / 2, 70);
            ctx.textAlign = 'left';
        }

        if (this.gameOver) {
            ctx.textAlign = 'center';
            ctx.font = 'bold 28px sans-serif';
            ctx.fillText(this.message, canvas.width / 2, canvas.height / 2 - 40);
            ctx.textAlign = 'left';
        }
    }

    endGame() {
        this.gameOver = true;
        this.message = 'GAME OVER - BOTH PLAYERS ELIMINATED!';
        cancelAnimationFrame(this.animationFrameId);
        this.showReturnButton();
    }

    levelComplete() {
        this.gameOver = true;
        this.message = 'LEVEL COMPLETE!';
        cancelAnimationFrame(this.animationFrameId);
        this.showReturnButton();
    }

    showReturnButton() {
        if (this.returnButton) return;

        this.returnButton = document.createElement('button');
        this.returnButton.textContent = 'Continue';
        Object.assign(this.returnButton.style, {
            position: 'absolute',
            left: '50%',
            top: '58%',
            transform: 'translate(-50%, -50%)',
            zIndex: '10',
            padding: '12px 24px',
            background: '#00f0ff',
            color: '#090d16',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            font: 'bold 16px sans-serif'
        });

        this.returnButton.addEventListener('click', () => {
            if (this.parentControl && this.parentControl.isNested) {
                this.parentControl.endLevel();
            } else if (this.gameEnv && this.gameEnv.gameControl) {
                this.gameEnv.gameControl.endLevel();
            }
        });

        this.container.appendChild(this.returnButton);
    }

    destroy() {
        cancelAnimationFrame(this.animationFrameId);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        this.canvas?.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas?.removeEventListener('mouseup', this.handleMouseUp);
        this.returnButton?.remove();
        this.canvas?.remove();
    }
}

class GameLevelGeoDash {
    constructor(gameEnv) {
        const path = gameEnv.path || '';
        
        const image_src_background = `${path}/images/projects/gamify/atat_background.png`;
        const image_data_background = {
            id: 'GeoDash-Background',
            src: image_src_background,
            pixels: { height: 570, width: 1025 }
        };

        this.classes = [
            { class: GameEnvBackground, data: image_data_background },
            { class: GeoDashRunner, data: {} }
        ];
    }
}

export default GameLevelGeoDash;