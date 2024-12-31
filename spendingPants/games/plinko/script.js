class PlinkoGame {
    constructor() {
        // Game state
        this.balance = 0;
        this.currentBet = 10;
        this.rows = 10;
        this.riskLevel = 'low';
        this.balls = [];
        this.pins = [];
        this.multipliers = [];
        this.gameActive = false;
        this.balanceRequested = false;

        // Physics constants
        this.pinRadius = 4;
        this.ballRadius = 6;
        this.gravity = 0.2;
        this.bounce = 0.7;
        this.friction = 0.99;

        document.addEventListener('DOMContentLoaded', () => {
            this.canvas = document.getElementById('plinkoCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.resizeCanvas();

            // Cache DOM elements
            this.elements = {
                balance: document.getElementById('balance'),
                betInput: document.getElementById('currentBet'),
                dropButton: document.getElementById('dropButton'),
                possibleWin: document.getElementById('possibleWin'),
                winMessage: document.getElementById('winMessage'),
                winAmount: document.querySelector('.win-amount'),
                gameHistory: document.getElementById('gameHistory'),
                multiplierRow: document.querySelector('.multipliers-row')
            };

            // Initialize game
            this.setupEventListeners();
            this.initializeGame();
            window.requestAnimationFrame(() => this.gameLoop());

            // Request balance after a short delay to ensure parent is ready
            setTimeout(() => {
                this.requestBalance();
            }, 100);
        });
        
        // Listen for balance updates
        window.addEventListener('message', (event) => {
            if (event.data.type === 'balance') {
                this.balance = event.data.balance;
                this.updateUI();
            }
        });
    }

    requestBalance() {
        // Request initial balance
        window.parent.postMessage({ type: 'getBalance' }, '*');
        
        // Retry if no response after 1 second
        if (!this.balanceRequested) {
            this.balanceRequested = true;
            setTimeout(() => {
                if (this.balance === 0) {
                    this.balanceRequested = false;
                    this.requestBalance();
                }
            }, 1000);
        }
    }

    updateParentBalance() {
        window.parent.postMessage({ 
            type: 'updateBalance', 
            balance: this.balance 
        }, '*');
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());

        this.elements.dropButton.addEventListener('click', () => this.dropBall());

        this.elements.betInput.addEventListener('change', () => {
            let value = parseInt(this.elements.betInput.value);
            if (isNaN(value) || value < 1) value = 1;
            if (value > this.balance) value = this.balance;
            this.currentBet = value;
            this.elements.betInput.value = value;
            this.updatePossibleWin();
        });

        // Risk level buttons
        document.querySelectorAll('.risk-button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.risk-button').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                this.riskLevel = button.dataset.risk;
                this.updateMultipliers();
                this.updatePossibleWin();
            });
        });

        // Row buttons
        document.querySelectorAll('.row-button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.row-button').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                this.rows = parseInt(button.dataset.rows);
                this.initializeGame();
            });
        });

        // Bet adjustment buttons
        document.querySelectorAll('.bet-button').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                switch (action) {
                    case 'half':
                        this.currentBet = Math.max(1, Math.floor(this.currentBet / 2));
                        break;
                    case 'double':
                        this.currentBet = Math.min(this.balance, this.currentBet * 2);
                        break;
                    case 'max':
                        this.currentBet = this.balance;
                        break;
                }
                this.elements.betInput.value = this.currentBet;
                this.updatePossibleWin();
            });
        });
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.initializeGame();
    }

    initializeGame() {
        this.pins = [];
        this.multipliers = this.generateMultipliers();
        
        const spacing = this.canvas.width / (this.rows + 1);
        const verticalSpacing = this.canvas.height / (this.rows + 2);
        
        // Generate pins
        for (let row = 0; row < this.rows; row++) {
            const pins_in_row = row + 1;
            const row_width = pins_in_row * spacing;
            const offset = (this.canvas.width - row_width) / 2 + spacing / 2;
            
            for (let pin = 0; pin < pins_in_row; pin++) {
                this.pins.push({
                    x: offset + pin * spacing,
                    y: verticalSpacing * (row + 1),
                    radius: this.pinRadius
                });
            }
        }

        this.updateMultipliersUI();
    }

    generateMultipliers() {
        let multipliers;
        const rows = this.rows + 1;
        
        switch (this.riskLevel) {
            case 'low':
                multipliers = Array(rows).fill(1);
                multipliers[0] = 1.5;
                multipliers[rows - 1] = 1.5;
                break;
            case 'medium':
                multipliers = Array(rows).fill(0.5);
                multipliers[0] = 2;
                multipliers[rows - 1] = 2;
                multipliers[Math.floor(rows/2)] = 3;
                break;
            case 'high':
                multipliers = Array(rows).fill(0.2);
                multipliers[0] = 4;
                multipliers[rows - 1] = 4;
                multipliers[Math.floor(rows/2)] = 8;
                break;
        }
        
        return multipliers;
    }

    updateMultipliersUI() {
        this.elements.multiplierRow.innerHTML = '';
        this.multipliers.forEach(mult => {
            const div = document.createElement('div');
            div.className = 'multiplier';
            div.textContent = mult + '×';
            this.elements.multiplierRow.appendChild(div);
        });
    }

    updatePossibleWin() {
        const maxMultiplier = Math.max(...this.multipliers);
        this.elements.possibleWin.textContent = (maxMultiplier).toFixed(2);
    }

    dropBall() {
        if (this.currentBet > this.balance) {
            alert('Insufficient balance!');
            return;
        }

        // Deduct bet amount
        this.balance -= this.currentBet;
        this.updateParentBalance();
        this.updateUI();

        const ball = {
            x: this.canvas.width / 2,
            y: this.ballRadius,
            vx: 0,
            vy: 0,
            radius: this.ballRadius
        };

        this.balls.push(ball);
        this.elements.dropButton.disabled = true;
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw pins
        this.ctx.fillStyle = '#A0A0B0';
        this.pins.forEach(pin => {
            this.ctx.beginPath();
            this.ctx.arc(pin.x, pin.y, pin.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Update and draw balls
        this.ctx.fillStyle = '#00DC82';
        this.balls = this.balls.filter(ball => {
            // Apply gravity
            ball.vy += this.gravity;
            
            // Apply velocity
            ball.x += ball.vx;
            ball.y += ball.vy;
            
            // Apply friction
            ball.vx *= this.friction;
            
            // Check pin collisions
            this.pins.forEach(pin => {
                const dx = ball.x - pin.x;
                const dy = ball.y - pin.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < ball.radius + pin.radius) {
                    // Calculate collision response
                    const angle = Math.atan2(dy, dx);
                    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                    
                    ball.vx = Math.cos(angle) * speed * this.bounce;
                    ball.vy = Math.sin(angle) * speed * this.bounce;
                    
                    // Add some randomness
                    ball.vx += (Math.random() - 0.5) * 0.5;
                }
            });
            
            // Check wall collisions
            if (ball.x - ball.radius < 0 || ball.x + ball.radius > this.canvas.width) {
                ball.vx *= -this.bounce;
                ball.x = ball.x - ball.radius < 0 ? ball.radius : this.canvas.width - ball.radius;
            }
            
            // Check if ball reached bottom
            if (ball.y + ball.radius > this.canvas.height) {
                // Calculate multiplier based on position
                const position = Math.floor((ball.x / this.canvas.width) * this.multipliers.length);
                const multiplier = this.multipliers[Math.min(position, this.multipliers.length - 1)];
                
                // Calculate and show win amount
                const winAmount = Math.floor(this.currentBet * multiplier);
                if (winAmount > 0) {
                    this.balance += winAmount;
                    this.updateParentBalance();
                }
                
                // Update UI
                this.showWinMessage(multiplier);
                this.addToHistory(multiplier, winAmount);
                this.updateUI();
                
                // Re-enable drop button
                this.elements.dropButton.disabled = false;
                
                return false;
            }
            
            // Draw ball
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            return true;
        });
        
        window.requestAnimationFrame(() => this.gameLoop());
    }

    showWinMessage(multiplier) {
        this.elements.winAmount.textContent = multiplier.toFixed(2) + '×';
        this.elements.winMessage.classList.remove('hidden');
        this.elements.winMessage.classList.add('visible');
        
        setTimeout(() => {
            this.elements.winMessage.classList.remove('visible');
            this.elements.winMessage.classList.add('hidden');
        }, 2000);
    }

    addToHistory(multiplier, winAmount) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item ' + (winAmount > this.currentBet ? 'win' : 'loss');
        
        const betText = document.createElement('span');
        betText.textContent = `Bet: ${this.currentBet}`;
        
        const multiplierText = document.createElement('span');
        multiplierText.textContent = `${multiplier.toFixed(2)}×`;
        
        historyItem.appendChild(betText);
        historyItem.appendChild(multiplierText);
        
        this.elements.gameHistory.insertBefore(historyItem, this.elements.gameHistory.firstChild);
        
        // Keep only last 10 items
        while (this.elements.gameHistory.children.length > 10) {
            this.elements.gameHistory.removeChild(this.elements.gameHistory.lastChild);
        }
    }

    updateUI() {
        // Update balance display
        if (this.elements.balance) {
            this.elements.balance.textContent = this.balance.toLocaleString();
            this.elements.balance.setAttribute('title', this.balance.toLocaleString() + ' Tokens');
        }
        
        // Update bet input constraints
        if (this.elements.betInput) {
            this.elements.betInput.max = this.balance;
            if (this.currentBet > this.balance) {
                this.currentBet = this.balance;
                this.elements.betInput.value = this.balance;
            }
            this.elements.betInput.setAttribute('max', this.balance);
        }

        // Update drop button state
        if (this.elements.dropButton) {
            this.elements.dropButton.disabled = this.balance < this.currentBet;
        }
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PlinkoGame();
});
