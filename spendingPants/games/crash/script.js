class CrashGame {
    constructor() {
        this.gameActive = false;
        this.currentMultiplier = 1.0;
        this.betAmount = 100;
        this.autoCashout = 2.0;
        this.totalProfit = 0;
        this.gameHistory = [];
        this.animationId = null;
        this.lastTimestamp = 0;
        this.gameStartTime = 0;
        this.balance = 0;
        this.balanceRequested = false;

        document.addEventListener('DOMContentLoaded', () => {
            // Canvas setup
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());

            // Cache DOM elements
            this.elements = {
                balance: document.getElementById('balance'),
                betAmount: document.getElementById('betAmount'),
                autoCashout: document.getElementById('autoCashout'),
                startGame: document.getElementById('startGame'),
                cashout: document.getElementById('cashout'),
                currentMultiplier: document.getElementById('currentMultiplier'),
                totalProfit: document.getElementById('totalProfit'),
                cashoutAmount: document.getElementById('cashoutAmount'),
                crashPoint: document.getElementById('crashPoint'),
                historyList: document.getElementById('historyList')
            };

            this.setupEventListeners();
            this.requestBalance();
        });
        
        // Listen for balance updates
        window.addEventListener('message', (event) => {
            if (event.data.type === 'balance') {
                this.balance = event.data.balance;
                this.updateUI();
            }
        });
    }

    setupEventListeners() {
        this.elements.startGame.addEventListener('click', () => this.startGame());
        this.elements.cashout.addEventListener('click', () => this.cashout());

        // Bet adjustment buttons
        document.querySelectorAll('.bet-button').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                const currentBet = parseInt(this.elements.betAmount.value) || 100;
                
                switch (action) {
                    case 'half':
                        this.elements.betAmount.value = Math.max(1, Math.floor(currentBet / 2));
                        break;
                    case 'double':
                        this.elements.betAmount.value = Math.min(this.balance, currentBet * 2);
                        break;
                    case 'max':
                        this.elements.betAmount.value = this.balance;
                        break;
                }
                this.betAmount = parseInt(this.elements.betAmount.value);
                this.updateUI();
            });
        });

        // Input validation
        this.elements.betAmount.addEventListener('change', () => {
            let value = parseInt(this.elements.betAmount.value);
            if (isNaN(value) || value < 1) value = 1;
            if (value > this.balance) value = this.balance;
            this.elements.betAmount.value = value;
            this.betAmount = value;
        });

        this.elements.autoCashout.addEventListener('change', () => {
            const value = parseFloat(this.elements.autoCashout.value);
            if (value < 1) this.elements.autoCashout.value = 1;
            this.autoCashout = parseFloat(this.elements.autoCashout.value);
        });
    }

    updateUI() {
        // Update balance display
        if (this.elements.balance) {
            this.elements.balance.textContent = this.balance.toLocaleString();
        }

        // Update bet input max value
        if (this.elements.betAmount) {
            if (this.elements.betAmount.value > this.balance) {
                this.elements.betAmount.value = this.balance;
            }
            this.elements.betAmount.max = this.balance;
        }
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

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    startGame() {
        this.betAmount = parseInt(this.elements.betAmount.value);
        this.autoCashout = parseFloat(this.elements.autoCashout.value);

        // Check if bet amount is valid
        if (this.betAmount > this.balance) {
            alert('Insufficient balance!');
            return;
        }

        // Deduct bet amount from balance
        this.balance -= this.betAmount;
        this.updateParentBalance();
        
        // Reset game state
        this.gameActive = true;
        this.currentMultiplier = 1.0;
        this.gameStartTime = performance.now();
        this.lastTimestamp = this.gameStartTime;
        
        // Update UI
        this.elements.startGame.disabled = true;
        this.elements.betAmount.disabled = true;
        this.elements.autoCashout.disabled = true;
        this.elements.cashout.disabled = false;
        this.elements.crashPoint.classList.remove('visible');
        
        // Start animation
        this.animate(this.gameStartTime);
    }

    animate(timestamp) {
        if (!this.gameActive) return;

        const elapsed = timestamp - this.gameStartTime;
        const deltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;

        // Update multiplier (exponential growth)
        this.currentMultiplier = Math.pow(1.0017, elapsed);
        
        // Check for auto cashout
        if (this.currentMultiplier >= this.autoCashout) {
            this.cashout();
            return;
        }

        // Random crash check (higher chance as multiplier increases)
        if (Math.random() * 100 < (this.currentMultiplier * 0.1)) {
            this.crash();
            return;
        }

        // Update UI
        this.updateDisplay();
        this.drawGraph();

        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }

    drawGraph() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;

        // Vertical grid lines
        for (let x = 0; x < width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal grid lines
        for (let y = 0; y < height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw crash curve
        const points = this.calculateCurvePoints();
        
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#00DC82');
        gradient.addColorStop(1, '#36E5FF');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        
        points.forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        
        ctx.stroke();
    }

    calculateCurvePoints() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const points = [];
        
        for (let x = 0; x < width; x += 2) {
            const progress = x / width;
            const multiplier = 1 + (this.currentMultiplier - 1) * progress;
            const y = height - (Math.log(multiplier) * height / 3);
            points.push({x, y});
        }
        
        return points;
    }

    updateDisplay() {
        this.elements.currentMultiplier.textContent = 
            this.currentMultiplier.toFixed(2) + '×';
        this.elements.cashoutAmount.textContent = 
            this.currentMultiplier.toFixed(2) + '×';
    }

    crash() {
        this.gameActive = false;
        
        // Update UI
        this.elements.crashPoint.querySelector('.crash-value').textContent = 
            this.currentMultiplier.toFixed(2) + '×';
        this.elements.crashPoint.classList.add('visible');
        
        this.addToHistory(this.currentMultiplier);
        this.resetGame();
    }

    cashout() {
        if (!this.gameActive) return;
        
        this.gameActive = false;
        const winAmount = Math.floor(this.betAmount * this.currentMultiplier);
        if (winAmount > 0) {
            this.balance += winAmount;
            this.updateParentBalance();
            
            this.totalProfit += winAmount - this.betAmount;
            this.elements.totalProfit.textContent = this.totalProfit;
        }
        
        this.addToHistory(this.currentMultiplier);
        this.resetGame();
    }

    resetGame() {
        cancelAnimationFrame(this.animationId);
        this.elements.startGame.disabled = false;
        this.elements.betAmount.disabled = false;
        this.elements.autoCashout.disabled = false;
        this.elements.cashout.disabled = true;
    }

    addToHistory(multiplier) {
        this.gameHistory.unshift(multiplier);
        if (this.gameHistory.length > 10) this.gameHistory.pop();
        
        // Update history display
        this.elements.historyList.innerHTML = this.gameHistory
            .map(mult => {
                const className = mult >= 2 ? 'crash-high' : 'crash-low';
                return `<div class="history-item ${className}">${mult.toFixed(2)}×</div>`;
            })
            .join('');
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CrashGame();
});
