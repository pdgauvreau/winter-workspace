// Matter.js module aliases
const { Engine, Render, World, Bodies, Body, Events, Runner } = Matter;

// Game configuration
const config = {
    easy: { pinSpacing: 60, rows: 8, multipliers: [0.5, 1, 2, 3, 5, 3, 2, 1, 0.5] },
    medium: { pinSpacing: 50, rows: 10, multipliers: [0.5, 1, 2, 3, 5, 8, 5, 3, 2, 1, 0.5] },
    hard: { pinSpacing: 40, rows: 12, multipliers: [0.5, 1, 2, 3, 5, 8, 10, 8, 5, 3, 2, 1, 0.5] }
};

class NeonPlinko {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.engine = Engine.create();
        this.engine.world.gravity.y = 0.5;
        this.balls = [];
        this.pins = [];
        this.walls = [];
        this.multiplierZones = [];
        this.currentDifficulty = 'medium';
        this.activeBalls = 1;
        this.betAmount = 10;
        this.balance = 1000;

        this.setupCanvas();
        this.createBoundaries();
        this.createPinField();
        this.setupEventListeners();
        this.setupPhysics();
        this.updateUI();
    }

    setupCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        
        // Setup renderer
        this.render = Render.create({
            canvas: this.canvas,
            engine: this.engine,
            options: {
                width: this.canvas.width,
                height: this.canvas.height,
                wireframes: false,
                background: 'transparent'
            }
        });
    }

    createBoundaries() {
        const wallThickness = 0; 
        const walls = [
            // Left wall
            Bodies.rectangle(wallThickness/2, this.canvas.height/2, wallThickness, this.canvas.height, { 
                isStatic: true,
                render: { fillStyle: '#00ffff33' }
            }),
            // Right wall
            Bodies.rectangle(this.canvas.width - wallThickness/2, this.canvas.height/2, wallThickness, this.canvas.height, { 
                isStatic: true,
                render: { fillStyle: '#00ffff33' }
            })
        ];
        
        World.add(this.engine.world, walls);
        this.walls = walls;
        this.wallThickness = wallThickness;
    }

    createPinField() {
        const conf = config[this.currentDifficulty];
        
        // Calculate board dimensions with extra padding
        const boardHeight = this.canvas.height - 80;
        const verticalSpacing = boardHeight / (conf.rows + 2);
        const horizontalSpacing = verticalSpacing * 1.2;
        
        // Scale pin and ball sizes based on spacing
        const pinRadius = Math.min(4, verticalSpacing * 0.08);
        this.ballRadius = pinRadius * 2;
        
        const startY = 60;
        
        // Clear existing pins and multiplier zones
        this.pins.forEach(pin => World.remove(this.engine.world, pin));
        this.multiplierZones.forEach(zone => World.remove(this.engine.world, zone));
        this.pins = [];
        this.multiplierZones = [];

        // Calculate total width needed for bottom row with padding
        const maxPinsInRow = conf.rows + 1;
        const maxWidth = (maxPinsInRow - 1) * horizontalSpacing;
        const sidePadding = this.wallThickness + 20; // Extra space from walls
        
        // Create pyramid pin layout
        for(let row = 0; row < conf.rows; row++) {
            const pinsInRow = row + 2;
            const rowWidth = (pinsInRow - 1) * horizontalSpacing;
            const startX = sidePadding + (this.canvas.width - 2 * sidePadding - rowWidth) / 2;
            
            for(let pin = 0; pin < pinsInRow; pin++) {
                const x = startX + pin * horizontalSpacing;
                const y = startY + row * verticalSpacing;
                
                const pinBody = Bodies.circle(x, y, pinRadius, {
                    isStatic: true,
                    render: {
                        fillStyle: '#00ff9d',
                        strokeStyle: '#00ff9d44',
                        lineWidth: 3
                    }
                });
                
                this.pins.push(pinBody);
            }
        }
        
        World.add(this.engine.world, this.pins);
        
        // Get positions of pins in last row for bucket placement
        const lastRowY = startY + (conf.rows - 1) * verticalSpacing;
        const lastRowPins = this.pins.filter(pin => Math.abs(pin.position.y - lastRowY) < 1);
        this.createMultiplierZones(conf.multipliers, lastRowPins, verticalSpacing);
    }

    createMultiplierZones(multipliers, lastRowPins, verticalSpacing) {
        const zoneHeight = 40;
        const y = lastRowPins[0].position.y + verticalSpacing;

        // Create buckets between pins (one less bucket than pins)
        this.multiplierZones = [];
        for(let i = 0; i < lastRowPins.length - 1; i++) {
            const leftPin = lastRowPins[i];
            const rightPin = lastRowPins[i + 1];
            const x = (leftPin.position.x + rightPin.position.x) / 2;
            const width = rightPin.position.x - leftPin.position.x - 4;
            
            const zone = Bodies.rectangle(x, y, width, zoneHeight, {
                isStatic: true,
                isSensor: true,
                multiplier: multipliers[i],
                render: {
                    fillStyle: '#ff00ff33',
                    strokeStyle: '#ff00ff',
                    lineWidth: 3
                },
                bucketStyle: true // Custom flag to identify buckets
            });
            this.multiplierZones.push(zone);
        }
        
        World.add(this.engine.world, this.multiplierZones);
    }

    launchBall() {
        if(this.balance < this.betAmount) return;
        
        const ballCount = parseInt(document.querySelector('.ball-btn.active').dataset.balls);
        const totalBet = this.betAmount * ballCount;
        
        if(this.balance < totalBet) return;
        
        this.balance -= totalBet;
        this.updateUI();
        
        let ballsLaunched = 0;
        const launchInterval = setInterval(() => {
            if(ballsLaunched >= ballCount) {
                clearInterval(launchInterval);
                return;
            }
            
            const ball = Bodies.circle(
                this.canvas.width/2 + (Math.random() - 0.5) * 10,
                20,
                this.ballRadius,
                {
                    restitution: 0.5,
                    friction: 0.1,
                    density: 0.1,
                    render: {
                        fillStyle: '#00ffff',
                        strokeStyle: '#00ffff44',
                        lineWidth: 2
                    }
                }
            );
            
            this.balls.push(ball);
            World.add(this.engine.world, ball);
            ballsLaunched++;
        }, 200);
    }

    handleCollision(ball, multiplierZone) {
        if(this.balls.includes(ball) && !ball.processed) {
            ball.processed = true;
            const win = this.betAmount * multiplierZone.multiplier;
            this.balance += win;
            this.updateUI();
            this.showWinPopup(multiplierZone.multiplier);
            this.addToHistory(multiplierZone.multiplier);
            
            setTimeout(() => {
                World.remove(this.engine.world, ball);
                this.balls = this.balls.filter(b => b !== ball);
                
                if(this.balls.every(b => b.processed)) {
                    this.balls = this.balls.filter(b => !b.processed);
                }
            }, 500);
        }
    }

    showWinPopup(multiplier) {
        const popup = document.getElementById('winPopup');
        popup.querySelector('.win-amount').textContent = multiplier + '×';
        popup.classList.remove('hidden');
        popup.style.opacity = 1;
        
        setTimeout(() => {
            popup.style.opacity = 0;
            setTimeout(() => popup.classList.add('hidden'), 300);
        }, 1500);
    }

    addToHistory(multiplier) {
        const historyList = document.getElementById('historyList');
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <span>Bet: ${this.betAmount}</span>
            <span style="color: var(--neon-primary)">${multiplier}×</span>
            <span>Win: ${this.betAmount * multiplier}</span>
        `;
        
        historyList.insertBefore(historyItem, historyList.firstChild);
        if(historyList.children.length > 10) {
            historyList.removeChild(historyList.lastChild);
        }
    }

    updateUI() {
        document.getElementById('balance').textContent = this.balance;
        document.getElementById('betAmount').value = this.betAmount;
        const maxWin = this.betAmount * Math.max(...config[this.currentDifficulty].multipliers);
        document.getElementById('maxWin').textContent = maxWin;
    }

    setupEventListeners() {
        document.getElementById('betAmount').addEventListener('change', (e) => {
            this.betAmount = Math.max(1, parseInt(e.target.value) || 1);
            this.updateUI();
        });

        document.querySelectorAll('.bet-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if(action === 'min') this.betAmount = 1;
                if(action === 'max') this.betAmount = Math.min(1000, this.balance);
                this.updateUI();
            });
        });

        document.querySelectorAll('.ball-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.ball-btn.active').classList.remove('active');
                btn.classList.add('active');
                this.activeBalls = parseInt(btn.dataset.balls);
            });
        });

        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.diff-btn.active').classList.remove('active');
                btn.classList.add('active');
                this.currentDifficulty = btn.dataset.diff;
                this.createPinField();
            });
        });

        document.getElementById('launchBtn').addEventListener('click', () => this.launchBall());

        Events.on(this.engine, 'collisionStart', (event) => {
            event.pairs.forEach(pair => {
                const ball = this.balls.find(b => b === pair.bodyA || b === pair.bodyB);
                const zone = this.multiplierZones.find(z => z === pair.bodyA || z === pair.bodyB);
                if(ball && zone) {
                    this.handleCollision(ball, zone);
                }
            });
        });

        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.createPinField();
        });
    }

    setupPhysics() {
        Runner.run(this.engine);
        Render.run(this.render);

        Events.on(this.render, 'afterRender', () => {
            this.ctx.save();
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#00ff9d';
            this.pins.forEach(pin => {
                this.ctx.beginPath();
                this.ctx.arc(pin.position.x, pin.position.y, this.pinRadius || 4, 0, Math.PI * 2);
                this.ctx.fillStyle = '#00ff9d';
                this.ctx.fill();
            });
            this.ctx.restore();

            this.ctx.save();
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#00ffff';
            this.balls.forEach(ball => {
                this.ctx.beginPath();
                this.ctx.arc(ball.position.x, ball.position.y, this.ballRadius || 8, 0, Math.PI * 2);
                this.ctx.fillStyle = '#00ffff';
                this.ctx.fill();
            });
            this.ctx.restore();

            // Render buckets with stronger visual effect
            this.ctx.save();
            this.multiplierZones.forEach(zone => {
                // Draw bucket background
                this.ctx.beginPath();
                const width = zone.bounds.max.x - zone.bounds.min.x;
                const height = zone.bounds.max.y - zone.bounds.min.y;
                this.ctx.rect(zone.bounds.min.x, zone.bounds.min.y, width, height);
                this.ctx.fillStyle = '#ff00ff22';
                this.ctx.strokeStyle = '#ff00ff';
                this.ctx.lineWidth = 3;
                this.ctx.fill();
                this.ctx.stroke();

                // Add inner glow
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = '#ff00ff';
                this.ctx.stroke();

                // Draw multiplier text
                this.ctx.font = 'bold 16px Orbitron';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillStyle = '#ff00ff';
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#ff00ff';
                const text = zone.multiplier + 'x';
                this.ctx.fillText(text, zone.position.x, zone.position.y);
            });
            this.ctx.restore();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new NeonPlinko();
});
