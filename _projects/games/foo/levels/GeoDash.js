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

        // Assets
        this.steveImage = new Image();
        this.steveImage.src = `${gameEnv.path || ''}/images/projects/gamify/end_steve.png`;

        this.alexImage = new Image();
        this.alexImage.src = `${gameEnv.path || ''}/images/projects/gamify/Alex.png`;

        // Inputs & Physics Config (Slower, floaty physics for ultra-easy reaction time)
        this.keys = new Set();
        this.mouseHeld = false;
        this.groundY = this.canvas.height - 100;
        
        this.gravity = 0.3;          // Reduced gravity for a gentle descent
        this.jumpVelocity = -8.5;    // Balanced low jump force matching gravity
        this.speed = 2;              // Extremely slow speed (virtually unlosable reaction windows)
        
        this.distance = 0;
        this.levelLength = 3000;     // Shorter level length to match slower pace
        this.frame = 0;
        this.gameOver = false;

        // Player 1: Steve
        this.steve = {
            name: 'Steve',
            x: 80,
            y: 0,
            width: 58,
            height: 58,
            velocityY: 0,
            rotation: 0,
            color: '#55a7ff',
            image: this.steveImage,
            isDead: false,
            onGround: false
        };

        // Player 2: Alex
        this.alex = {
            name: 'Alex',
            x: 160,
            y: 0,
            width: 58,
            height: 58,
            velocityY: 0,
            rotation: 0,
            color: '#ff7f50',
            image: this.alexImage,
            isDead: false,
            onGround: false
        };

        this.players = [this.steve, this.alex];

        // Hand-calibrated level layout with massive spacing
        this.levelMap = [
            { pos: 600, width: 32, height: 40, type: 'spike', deadly: true },
            { pos: 1100, width: 80, height: 60, type: 'block', deadly: false },
            { pos: 1600, width: 32, height: 40, type: 'spike', deadly: true },
            { pos: 2100, width: 90, height: 60, type: 'block', deadly: false },
            { pos: 2600, width: 32, height: 40, type: 'spike', deadly: true }
        ];

        this.obstacles = this.levelMap.map(obs => ({ ...obs, x: obs.pos }));
        this.nextObstaclePosition = 3100;
        this.dynamicPatternIndex = 0;

        // Controls
        this.handleKeyDown = (event) => {
            this.keys.add(event.code);
            if (['Space', 'ArrowUp', 'KeyW', 'KeyI'].includes(event.code)) {
                event.preventDefault();
            }
        };
        this.handleKeyUp = (event) => this.keys.delete(event.code);

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

        this.message = 'P1: SPACE/W/CLICK | P2: UP/I KEY (ULTRA SLOW MODE)';
        this.messageUntil = performance.now() + 5000;

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
            [{ width: 32, height: 40, type: 'spike', deadly: true }],
            [{ width: 80, height: 60, type: 'block', deadly: false }]
        ];

        const pattern = patterns[this.dynamicPatternIndex % patterns.length];
        const gap = 500;

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
                          this.keys.has('KeyW') || 
                          this.mouseHeld;

        const alexJump = this.keys.has('ArrowUp') || 
                         this.keys.has('KeyI');

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

            // Block Platform Landing Check
            for (const obstacle of this.obstacles) {
                if (!obstacle.deadly) {
                    const blockTop = this.groundY - obstacle.height;
                    const blockLeft = obstacle.x;
                    const blockRight = obstacle.x + obstacle.width;

                    const playerRight = player.x + player.width;
                    const playerLeft = player.x;

                    // Check horizontal overlap
                    if (playerRight > blockLeft + 6 && playerLeft < blockRight - 6) {
                        // Check vertical top boundary landing
                        if (player.y + player.height <= blockTop + 16 && nextY + player.height >= blockTop) {
                            nextY = blockTop - player.height;
                            player.velocityY = 0;
                            player.rotation = 0;
                            player.onGround = true;
                        }
                    }
                }
            }

            player.y = nextY;

            // Jump handling
            if (isJumpPressed && player.onGround) {
                player.velocityY = this.jumpVelocity;
                player.onGround = false;
            }

            // Gentle air rotation
            if (!player.onGround) {
                player.rotation += 0.05;
            }
        });

        // Fixed ultra-slow movement speed (no acceleration)
        for (const obstacle of this.obstacles) {
            obstacle.x -= this.speed;
        }

        this.ensureUpcomingObstacles();
        this.obstacles = this.obstacles.filter(obs => obs.x + obs.width > -50);
        this.distance += this.speed;
        this.frame = (this.frame + 1) % 4;

        // Collision detection with forgiving hitboxes
        for (const player of this.players) {
            if (player.isDead) continue;

            for (const obstacle of this.obstacles) {
                // Spike collision
                if (obstacle.deadly && this.intersects(player, obstacle)) {
                    player.isDead = true;
                }
                // Wall side-impact collision into blocks
                else if (!obstacle.deadly) {
                    const blockTop = this.groundY - obstacle.height;
                    const blockLeft = obstacle.x;
                    
                    if (player.x + player.width > blockLeft + 4 && 
                        player.x < blockLeft + 12 && 
                        player.y + player.height > blockTop + 12) {
                        player.isDead = true;
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
        const padding = 12; // Extra padding makes hazards forgiving

        return (
            player.x + padding < obstacle.x + obstacle.width &&
            player.x + player.width - padding > obstacle.x &&
            player.y + padding < obstacleY + obstacle.height &&
            player.y + player.height - padding > obstacleY
        );
    }

    draw() {
        const { ctx, canvas } = this;

        // Gradient Background
        const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
        sky.addColorStop(0, '#18204b');
        sky.addColorStop(1, '#34234f');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ground Floor
        ctx.fillStyle = '#11142e';
        ctx.fillRect(0, this.groundY, canvas.width, canvas.height - this.groundY);
        ctx.fillStyle = '#44e0c1';
        ctx.fillRect(0, this.groundY, canvas.width, 8);

        // Progress Bar
        const progress = Math.min(100, Math.floor((this.distance / this.levelLength) * 100));
        ctx.fillStyle = '#44e0c1';
        ctx.fillRect(24, canvas.height - 30, (canvas.width - 48) * (progress / 100), 10);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(24, canvas.height - 30, canvas.width - 48, 10);

        // Draw Spikes and Blocks
        for (const obstacle of this.obstacles) {
            const y = this.groundY - obstacle.height;
            if (obstacle.deadly) {
                ctx.fillStyle = '#ff4f78';
                const spikeCount = 1;
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
                ctx.fillStyle = '#5d5d9f';
                ctx.fillRect(obstacle.x, y, obstacle.width, obstacle.height);
                ctx.fillStyle = '#7d7daf';
                ctx.fillRect(obstacle.x + 4, y + 4, obstacle.width - 8, obstacle.height - 8);
            }
        }

        // Render Players
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

        // Interface Elements
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`PROGRESS: ${progress}%`, 24, 34);

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
            background: '#44e0c1',
            color: '#11142e',
            border: 'none',
            borderRadius: '4px',
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