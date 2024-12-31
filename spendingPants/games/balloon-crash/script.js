class BalloonCrashGame {
    constructor() {
        this.init();
    }

    init() {
        // Game state
        this.gameActive = false;
        this.currentMultiplier = 1.0;
        this.betAmount = 100;
        this.autoCashout = 2.0;
        this.totalProfit = 0;
        this.gameHistory = [];
        this.animationId = null;
        this.lastTimestamp = 0;
        this.gameStartTime = 0;
        this.balloonSize = 50;
        this.balloonColor = '#FF6B6B';
        this.balance = 1000;

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
            popPoint: document.getElementById('popPoint'),
            historyList: document.getElementById('historyList')
        };

        this.setupEventListeners();
        this.updateUI();
        this.drawIdleBalloon();
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
        if (this.elements.balance) {
            this.elements.balance.textContent = this.balance.toLocaleString();
        }

        if (this.elements.betAmount) {
            if (this.elements.betAmount.value > this.balance) {
                this.elements.betAmount.value = this.balance;
            }
            this.elements.betAmount.max = this.balance;
        }
    }

    requestBalance() {
        window.parent.postMessage({ type: 'getBalance' }, '*');
        
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
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        console.log('Canvas resized:', this.canvas.width, this.canvas.height);
        if (!this.gameActive) {
            this.drawIdleBalloon();
        }
    }

    drawIdleBalloon() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        console.log('Drawing idle balloon:', width, height);
        
        // Clear canvas with background
        ctx.fillStyle = '#1E1E2D';
        ctx.fillRect(0, 0, width, height);
        
        // Draw balloon
        this.drawBalloon(width / 2, height - 100, 50);
    }

    drawBalloon(x, y, size) {
        const ctx = this.ctx;
        
        // Save context
        ctx.save();
        
        // Draw string
        ctx.beginPath();
        ctx.moveTo(x, y + size);
        ctx.lineTo(x, y + size + 50);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw balloon
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = this.balloonColor;
        ctx.fill();
        
        // Draw balloon highlight
        const gradient = ctx.createRadialGradient(
            x - size/3, y - size/3, size/10,
            x, y, size
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw balloon tie
        ctx.beginPath();
        ctx.moveTo(x - 5, y + size);
        ctx.quadraticCurveTo(x, y + size + 10, x + 5, y + size);
        ctx.fillStyle = '#FF5252';
        ctx.fill();
        
        // Restore context
        ctx.restore();
    }

    startGame() {
        this.betAmount = parseInt(this.elements.betAmount.value);
        this.autoCashout = parseFloat(this.elements.autoCashout.value);

        if (this.betAmount > this.balance) {
            alert('Insufficient balance!');
            return;
        }

        this.balance -= this.betAmount;
        this.updateParentBalance();
        
        this.elements.startGame.disabled = true;
        this.elements.betAmount.disabled = true;
        this.elements.autoCashout.disabled = true;
        this.elements.cashout.disabled = true;
        this.elements.popPoint.classList.remove('visible');

        // Add 3 second delay before starting
        setTimeout(() => {
            this.gameActive = true;
            this.currentMultiplier = 1.0;
            this.gameStartTime = performance.now();
            this.lastTimestamp = this.gameStartTime;
            this.balloonSize = 50;
            this.elements.cashout.disabled = false;
            
            this.animate(this.gameStartTime);
        }, 3000);
    }

    animate(timestamp) {
        if (!this.gameActive) return;

        const elapsed = timestamp - this.gameStartTime;
        const deltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;

        // Update multiplier (much slower growth)
        this.currentMultiplier = Math.pow(1.0008, elapsed);
        
        // Update balloon size based on multiplier (slower growth)
        this.balloonSize = 50 + (this.currentMultiplier - 1) * 60;
        
        // Check for auto cashout
        if (this.currentMultiplier >= this.autoCashout) {
            this.cashout();
            return;
        }

        // Random pop check (higher chance as balloon gets bigger)
        if (Math.random() * 100 < (this.currentMultiplier * 0.15)) {
            this.pop();
            return;
        }

        // Update UI
        this.updateDisplay();
        this.drawGameFrame();

        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }

    drawGameFrame() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas with background
        ctx.fillStyle = '#1E1E2D';
        ctx.fillRect(0, 0, width, height);

        // Calculate balloon position (rises as multiplier increases)
        const maxRise = height * 0.7;
        const rise = Math.min(maxRise, (this.currentMultiplier - 1) * 200);
        const y = height - 100 - rise;

        // Draw balloon
        this.drawBalloon(width / 2, y, this.balloonSize);
        
        console.log('Drawing game frame:', this.currentMultiplier, this.balloonSize, y);
    }

    updateDisplay() {
        this.elements.currentMultiplier.textContent = 
            this.currentMultiplier.toFixed(2) + '×';
        this.elements.cashoutAmount.textContent = 
            this.currentMultiplier.toFixed(2) + '×';
    }

    pop() {
        this.gameActive = false;
        
        // Show pop animation
        this.elements.popPoint.querySelector('.pop-value').textContent = 
            this.currentMultiplier.toFixed(2) + '×';
        this.elements.popPoint.classList.add('visible');
        
        // Draw pop effect
        this.drawPopEffect();
        
        this.addToHistory(this.currentMultiplier);
        this.resetGame();
    }

    drawPopEffect() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Calculate balloon position
        const maxRise = height * 0.7;
        const rise = Math.min(maxRise, (this.currentMultiplier - 1) * 200);
        const y = height - 100 - rise;
        
        // Draw burst particles
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const distance = this.balloonSize * 1.5;
            
            ctx.beginPath();
            ctx.moveTo(width / 2, y);
            ctx.lineTo(
                width / 2 + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance
            );
            ctx.strokeStyle = this.balloonColor;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
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
        
        // Reset balloon after a short delay
        setTimeout(() => {
            if (!this.gameActive) {
                this.drawIdleBalloon();
            }
        }, 2000);
    }

    addToHistory(multiplier) {
        this.gameHistory.unshift(multiplier);
        if (this.gameHistory.length > 10) this.gameHistory.pop();
        
        this.elements.historyList.innerHTML = this.gameHistory
            .map(mult => {
                const className = mult >= 2 ? 'crash-high' : 'crash-low';
                return `<div class="history-item ${className}">${mult.toFixed(2)}×</div>`;
            })
            .join('');
    }
}

// Initialize game when DOM is loaded
window.onload = () => {
    new BalloonCrashGame();
};
