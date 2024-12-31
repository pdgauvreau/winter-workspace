class SlotsGame {
    constructor() {
        this.balance = 0;
        this.currentBet = 10;
        this.spinning = false;
        this.symbols = ['💎', '🍇', '🫐', '🍌', '🍎', '🍊', '🍋', '🍒', '❌', '⭐'];
        this.values = {
            '💎': 15,
            '🍇': 10,
            '🫐': 8,
            '🍌': 6,
            '🍎': 5,
            '🍊': 4,
            '🍋': 3,
            '🍒': 2,
            '❌': 0,
            '⭐': 0
        };

        // Cache DOM elements
        this.elements = {
            slots: Array.from(document.querySelectorAll('.slot')),
            spinButton: document.getElementById('spinButton'),
            balance: document.getElementById('balance'),
            betInput: document.getElementById('currentBet'),
            maxWin: document.getElementById('maxWin'),
            winMessage: document.getElementById('winMessage'),
            winAmount: document.querySelector('.win-amount'),
            winHistory: document.getElementById('winHistory'),
            winLineContainer: document.querySelector('.win-line-container')
        };

        // Get initial balance
        window.parent.postMessage({ type: 'getBalance' }, '*');
        
        // Listen for balance updates
        window.addEventListener('message', (event) => {
            if (event.data.type === 'balance') {
                this.balance = event.data.balance;
                this.updateUI();
            }
        });

        this.setupEventListeners();
        this.updateMaxWin();
    }

    updateParentBalance() {
        window.parent.postMessage({ 
            type: 'updateBalance', 
            balance: this.balance 
        }, '*');
    }

    setupEventListeners() {
        this.elements.spinButton.addEventListener('click', () => this.spin());

        this.elements.betInput.addEventListener('change', () => {
            let value = parseInt(this.elements.betInput.value);
            if (isNaN(value) || value < 1) value = 1;
            if (value > this.balance) value = this.balance;
            this.currentBet = value;
            this.elements.betInput.value = value;
            this.updateMaxWin();
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
                this.updateMaxWin();
            });
        });

        // Quick bet buttons
        document.getElementById('decreaseBetLarge').addEventListener('click', () => this.adjustBet(-10));
        document.getElementById('decreaseBet').addEventListener('click', () => this.adjustBet(-1));
        document.getElementById('increaseBet').addEventListener('click', () => this.adjustBet(1));
        document.getElementById('increaseBetLarge').addEventListener('click', () => this.adjustBet(10));
    }

    adjustBet(amount) {
        const newBet = this.currentBet + amount;
        if (newBet >= 1 && newBet <= this.balance) {
            this.currentBet = newBet;
            this.elements.betInput.value = newBet;
            this.updateMaxWin();
        }
    }

    updateMaxWin() {
        const maxWin = this.currentBet * this.values['💎'] * 3; // 5 matching diamonds
        this.elements.maxWin.textContent = maxWin;
    }

    async spin() {
        if (this.spinning || this.currentBet > this.balance) return;
        
        // Deduct bet amount
        this.balance -= this.currentBet;
        this.updateParentBalance();
        this.updateUI();

        this.spinning = true;
        this.elements.spinButton.disabled = true;
        this.clearWinLines();

        // Add spinning class to start animation
        this.elements.slots.forEach(slot => slot.classList.add('spinning'));

        // Generate final symbols with adjusted wild card probability
        const finalSymbols = this.elements.slots.map(() => {
            const roll = Math.random();
            // 10% chance for star (wild card)
            if (roll < 0.1) {
                return '⭐';
            }
            // Otherwise random non-special symbol (excluding star and X)
            const regularSymbols = this.symbols.filter(s => s !== '⭐' && s !== '❌');
            const regularRoll = Math.random();
            // 15% chance for X
            if (regularRoll < 0.15) {
                return '❌';
            }
            return regularSymbols[Math.floor(Math.random() * regularSymbols.length)];
        });

        // Stop slots one by one
        for (let i = 0; i < this.elements.slots.length; i++) {
            await this.delay(200 + i * 200);
            this.elements.slots[i].classList.remove('spinning');
            this.elements.slots[i].textContent = finalSymbols[i];
        }

        await this.delay(500);
        this.checkWin(finalSymbols);
    }

    checkWin(symbols) {
        let bestWin = {
            amount: 0,
            positions: [],
            symbol: null
        };

        // Count occurrences of each symbol and stars
        const starCount = symbols.filter(s => s === '⭐').length;
        const symbolCounts = {};
        symbols.forEach(symbol => {
            if (symbol !== '⭐' && symbol !== '❌') {
                symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
            }
        });

        // Check each symbol for potential wins
        for (const [symbol, count] of Object.entries(symbolCounts)) {
            const totalCount = count + starCount;
            if (totalCount >= 3) {
                const baseValue = this.values[symbol];
                const multiplier = totalCount === 5 ? 3 : totalCount === 4 ? 2 : 1;
                const winAmount = Math.floor(this.currentBet * baseValue * multiplier);

                // If this win is better than our current best, update it
                if (winAmount > bestWin.amount) {
                    const positions = [];
                    // First add all matching symbols
                    symbols.forEach((s, index) => {
                        if (s === symbol) {
                            positions.push(index);
                        }
                    });
                    // Then add stars until we reach our winning count
                    symbols.forEach((s, index) => {
                        if (positions.length < totalCount && s === '⭐') {
                            positions.push(index);
                        }
                    });

                    bestWin = {
                        amount: winAmount,
                        positions,
                        symbol
                    };
                }
            }
        }

        // Handle win/loss
        if (bestWin.amount > 0) {
            this.showWinLines([{ positions: bestWin.positions }]);
            this.showWinMessage(bestWin.amount);
            
            // Update balance with win amount
            const winAmount = Math.floor(bestWin.amount);
            this.balance += winAmount;
            this.updateParentBalance();
            
            // Add to history with proper win amount
            this.addToHistory(winAmount, symbols);
        } else {
            // Add to history with loss amount
            this.addToHistory(-this.currentBet, symbols);
        }

        this.spinning = false;
        this.elements.spinButton.disabled = false;
        this.updateUI();
    }

    showWinLines(lines) {
        lines.forEach(line => {
            line.positions.forEach(position => {
                const slot = this.elements.slots[position];
                slot.classList.add('highlight');
            });
        });
        
        // Remove highlight after animation
        setTimeout(() => {
            this.elements.slots.forEach(slot => {
                slot.classList.remove('highlight');
            });
        }, 2000);
    }

    clearWinLines() {
        this.elements.winLineContainer.innerHTML = '';
    }

    showWinMessage(amount) {
        this.elements.winAmount.textContent = amount;
        this.elements.winMessage.classList.remove('hidden');
        this.elements.winMessage.classList.add('visible');
        
        setTimeout(() => {
            this.elements.winMessage.classList.remove('visible');
            this.elements.winMessage.classList.add('hidden');
        }, 2000);
    }

    addToHistory(winAmount, symbols) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item ' + (winAmount > this.currentBet ? 'win' : 'loss');
        
        const symbolsText = document.createElement('span');
        symbolsText.textContent = symbols.join(' ');
        
        const amountText = document.createElement('span');
        amountText.textContent = winAmount > this.currentBet ? `+${winAmount}` : `-${this.currentBet}`;
        
        historyItem.appendChild(symbolsText);
        historyItem.appendChild(amountText);
        
        this.elements.winHistory.insertBefore(historyItem, this.elements.winHistory.firstChild);
        
        // Keep only last 7 items
        while (this.elements.winHistory.children.length > 7) {
            this.elements.winHistory.removeChild(this.elements.winHistory.lastChild);
        }
    }

    updateUI() {
        this.elements.balance.textContent = this.balance;
        this.elements.betInput.max = this.balance;
        if (this.currentBet > this.balance) {
            this.currentBet = this.balance;
            this.elements.betInput.value = this.balance;
        }
        this.elements.spinButton.disabled = this.spinning || this.currentBet > this.balance;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SlotsGame();
});
