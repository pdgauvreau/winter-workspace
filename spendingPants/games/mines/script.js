class MinesGame {
    constructor() {
        this.gameActive = false;
        this.minePositions = [];
        this.revealedPositions = [];
        this.betAmount = 100;
        this.minesCount = 3;
        this.currentMultiplier = 1.0;
        this.totalProfit = 0;
        this.balance = 0;

        // Cache DOM elements
        this.elements = {
            betAmount: document.getElementById('betAmount'),
            minesCount: document.getElementById('minesCount'),
            startGame: document.getElementById('startGame'),
            cashout: document.getElementById('cashout'),
            nextProfit: document.getElementById('nextProfit'),
            totalProfit: document.getElementById('totalProfit'),
            cashoutAmount: document.getElementById('cashoutAmount'),
            balance: document.getElementById('balance'),
            tiles: Array.from(document.querySelectorAll('.tile'))
        };

        // Get initial balance and listen for updates
        window.addEventListener('message', (event) => {
            if (event.data.type === 'balance') {
                this.balance = event.data.balance;
                this.updateUI();
                // Enable start button if we have balance
                this.elements.startGame.disabled = !this.balance;
            }
        });
        
        // Request initial balance
        window.parent.postMessage({ type: 'getBalance' }, '*');

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.elements.startGame.addEventListener('click', () => this.startGame());
        this.elements.cashout.addEventListener('click', () => this.cashout());
        
        this.elements.tiles.forEach(tile => {
            tile.addEventListener('click', () => {
                if (this.gameActive) {
                    const index = parseInt(tile.dataset.index);
                    this.revealTile(index);
                }
            });
        });

        // Bet adjustment buttons
        document.querySelectorAll('.bet-button').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                const currentBet = parseInt(this.elements.betAmount.value);
                
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
            });
        });

        // Mines count buttons
        document.querySelectorAll('.mines-button').forEach(button => {
            button.addEventListener('click', () => {
                const mines = parseInt(button.dataset.mines);
                this.elements.minesCount.value = mines;
                
                // Update active state
                document.querySelectorAll('.mines-button').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
            });
        });

        // Input validation
        this.elements.betAmount.addEventListener('change', () => {
            const value = parseInt(this.elements.betAmount.value);
            if (value < 1) this.elements.betAmount.value = 1;
            if (value > this.balance) this.elements.betAmount.value = this.balance;
        });

        this.elements.minesCount.addEventListener('change', () => {
            const value = parseInt(this.elements.minesCount.value);
            if (value < 1) this.elements.minesCount.value = 1;
            if (value > 24) this.elements.minesCount.value = 24;
            
            // Update active state of mines buttons
            document.querySelectorAll('.mines-button').forEach(button => {
                button.classList.toggle('active', parseInt(button.dataset.mines) === value);
            });
        });
    }

    updateUI() {
        // Update balance display and bet input max value
        this.elements.balance.textContent = this.balance;
        
        // Update bet amount if it exceeds balance
        const currentBet = parseInt(this.elements.betAmount.value);
        if (currentBet > this.balance) {
            this.elements.betAmount.value = this.balance;
        }
        this.elements.betAmount.max = this.balance;
        
        // Disable start button if bet exceeds balance or no balance
        this.elements.startGame.disabled = currentBet > this.balance || !this.balance;
    }

    updateParentBalance() {
        window.parent.postMessage({ 
            type: 'updateBalance', 
            balance: this.balance 
        }, '*');
    }

    startGame() {
        this.betAmount = parseInt(this.elements.betAmount.value);
        this.minesCount = parseInt(this.elements.minesCount.value);

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
        this.revealedPositions = [];
        this.currentMultiplier = 1.0;
        this.placeMines();
        
        // Update UI
        this.elements.startGame.disabled = true;
        this.elements.betAmount.disabled = true;
        this.elements.minesCount.disabled = true;
        this.elements.cashout.disabled = false;
        
        // Reset tiles
        this.elements.tiles.forEach(tile => {
            tile.className = 'tile';
            tile.textContent = '';
        });
        
        this.updateProfitDisplay();
    }

    placeMines() {
        this.minePositions = [];
        const positions = Array.from({length: 25}, (_, i) => i);
        
        // Randomly select mine positions
        for (let i = 0; i < this.minesCount; i++) {
            const randomIndex = Math.floor(Math.random() * positions.length);
            this.minePositions.push(positions[randomIndex]);
            positions.splice(randomIndex, 1);
        }
    }

    revealTile(index) {
        if (this.revealedPositions.includes(index)) return;
        
        const tile = this.elements.tiles[index];
        
        if (this.minePositions.includes(index)) {
            // Hit a mine
            this.gameOver(false);
            tile.classList.add('mine');
            tile.textContent = '💣';
        } else {
            // Found a gem
            this.revealedPositions.push(index);
            tile.classList.add('gem', 'revealed');
            tile.textContent = '💎';
            
            // Update multiplier and display
            this.updateMultiplier();
            this.updateProfitDisplay();
            
            // Check if all safe tiles are revealed
            if (this.revealedPositions.length === 25 - this.minesCount) {
                this.gameOver(true);
            }
        }
    }

    updateMultiplier() {
        // Calculate new multiplier based on revealed tiles and mines
        const safeSpots = 25 - this.minesCount;
        const revealed = this.revealedPositions.length;
        
        // This is a simplified multiplier calculation
        // In a real game, you'd want to use proper odds calculations
        this.currentMultiplier = 1 + (revealed * (this.minesCount / safeSpots));
    }

    updateProfitDisplay() {
        const profit = (this.betAmount * this.currentMultiplier) - this.betAmount;
        this.elements.nextProfit.textContent = this.currentMultiplier.toFixed(2) + '×';
        this.elements.cashoutAmount.textContent = this.currentMultiplier.toFixed(2) + '×';
    }

    cashout() {
        if (!this.gameActive) return;
        
        const winAmount = Math.floor(this.betAmount * this.currentMultiplier);
        this.balance += winAmount;
        this.updateParentBalance();
        
        this.totalProfit += winAmount - this.betAmount;
        this.elements.totalProfit.textContent = this.totalProfit;
        
        // Reveal all mines
        this.minePositions.forEach(index => {
            const tile = this.elements.tiles[index];
            tile.classList.add('mine');
            tile.textContent = '💣';
        });
        
        this.gameOver(true);
    }

    gameOver(won) {
        this.gameActive = false;
        this.elements.startGame.disabled = false;
        this.elements.betAmount.disabled = false;
        this.elements.minesCount.disabled = false;
        this.elements.cashout.disabled = true;
        
        if (!won) {
            this.totalProfit -= this.betAmount;
            this.elements.totalProfit.textContent = this.totalProfit;
            
            // Reveal all mines
            this.minePositions.forEach(index => {
                const tile = this.elements.tiles[index];
                tile.classList.add('mine');
                tile.textContent = '💣';
            });
        }
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MinesGame();
});
