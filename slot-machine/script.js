const symbols = {
    blank: { symbol: '❌', weight: 40, value: 0 },
    cherry: { symbol: '🍒', weight: 30, value: 2 },
    lemon: { symbol: '🍋', weight: 25, value: 3 },
    orange: { symbol: '🍊', weight: 20, value: 4 },
    apple: { symbol: '🍎', weight: 15, value: 5 },
    banana: { symbol: '🍌', weight: 12, value: 6 },
    lime: { symbol: '🫐', weight: 8, value: 8 },
    raspberry: { symbol: '🍇', weight: 6, value: 10 },
    bar: { symbol: '💎', weight: 4, value: 15 },
    wild: { symbol: '⭐', weight: 30, value: 0 }// Wild card can count as any symbol

};

let balance = 25;
let currentBet = 1;
let isSpinning = false;
let spinHistory = [];

// DOM Elements
const winHistoryEl = document.getElementById('winHistory');
const balanceEl = document.getElementById('balance');
const currentBetEl = document.getElementById('currentBet');
const spinButton = document.getElementById('spinButton');
const messageEl = document.getElementById('message');
const slots = Array.from({ length: 5 }, (_, i) => document.getElementById(`slot${i + 1}`));

// Initialize the weighted random selection
function getRandomSymbol() {
    const totalWeight = Object.values(symbols).reduce((sum, symbol) => sum + symbol.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const [key, symbol] of Object.entries(symbols)) {
        random -= symbol.weight;
        if (random <= 0) {
            return { key, ...symbol };
        }
    }
    return { key: 'cherry', ...symbols.cherry }; // Fallback
}

// Spin animation
function animateSpin(slot, finalSymbol, delay) {
    return new Promise(resolve => {
        const duration = 2000 + delay; // Total animation duration
        const fps = 30;
        const frames = duration / (1000 / fps);
        let frame = 0;
        
        const animate = () => {
            const progress = frame / frames;
            const speed = Math.max(0.1, 1 - Math.pow(progress, 2)); // Easing function
            
            if (frame % Math.max(1, Math.floor(1 / speed)) === 0) {
                const randomSymbol = getRandomSymbol();
                slot.textContent = randomSymbol.symbol;
            }
            
            frame++;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                slot.textContent = finalSymbol;
                resolve();
            }
        };
        
        setTimeout(() => {
            animate();
        }, delay);
    });
}

// Calculate winnings
function calculateWinnings(results) {
    const symbolCounts = {};
    const wildCount = results.filter(result => result.key === 'wild').length;
    
    // Count non-wild symbols
    results.forEach(result => {
        if (result.key !== 'wild') {
            symbolCounts[result.key] = (symbolCounts[result.key] || 0) + 1;
        }
    });

    let winMultiplier = 0;
    // Check each symbol type with wild cards
    for (const [symbol, count] of Object.entries(symbolCounts)) {
        if (symbol !== 'blank') {  // Don't count blanks for wins
            const totalCount = count + wildCount;  // Add wild cards to the count
            if (totalCount >= 3) {
                const symbolData = symbols[symbol];
                // Base multiplier is the symbol's value
                let multiplier = symbolData.value;
                // Add bonus for additional matches beyond 3
                if (totalCount > 3) {
                    multiplier *= (totalCount - 2);  // Scale up for 4 or 5 matches
                }
                winMultiplier = Math.max(winMultiplier, multiplier);
            }
        }
    }

    // Special case: all wild cards
    if (wildCount >= 3) {
        // Use the highest value symbol (bar) for all wilds
        let multiplier = symbols.bar.value;
        if (wildCount > 3) {
            multiplier *= (wildCount - 2);  // Scale up for 4 or 5 wild cards
        }
        winMultiplier = Math.max(winMultiplier, multiplier);
    }

    return currentBet * winMultiplier;
}

// Spin handler
async function spin() {
    if (isSpinning || balance < currentBet) return;
    
    isSpinning = true;
    spinButton.disabled = true;
    balance -= currentBet;
    balanceEl.textContent = balance;
    messageEl.textContent = 'Spinning...';

    // Generate final results
    const results = Array.from({ length: 5 }, () => getRandomSymbol());
    
    // Animate each slot with delays
    const spinPromises = slots.map((slot, index) => 
        animateSpin(slot, results[index].symbol, index * 100)
    );
    
    await Promise.all(spinPromises);

    // Calculate and apply winnings
    const winnings = calculateWinnings(results);
    if (winnings > 0) {
        balance += winnings;
        balanceEl.textContent = balance;
        messageEl.textContent = `You won ${winnings} tokens!`;
        
        // Record the win
        const spinData = {
            symbols: results.map(r => r.symbol).join(' '),
            amount: winnings,
            bet: currentBet,
            timestamp: new Date(),
            isWin: true
        };
        spinHistory.unshift(spinData);
    } else {
        messageEl.textContent = 'Try again!';
        // Record the loss
        const spinData = {
            symbols: results.map(r => r.symbol).join(' '),
            amount: -currentBet,
            bet: currentBet,
            timestamp: new Date(),
            isWin: false
        };
        spinHistory.unshift(spinData);
    }
    
    if (spinHistory.length > 10) spinHistory.pop(); // Keep last 10 spins
    updateSpinHistory();

    isSpinning = false;
    spinButton.disabled = false;
}

// Bet control functions
function updateBet(newBet) {
    if (isSpinning) return;
    newBet = Math.max(1, Math.min(balance, Math.floor(newBet)));
    currentBet = newBet;
    currentBetEl.value = newBet;
}

function adjustBet(amount) {
    if (isSpinning) return;
    updateBet(currentBet + amount);
}

// Bet control event listeners
document.getElementById('increaseBetLarge').addEventListener('click', () => adjustBet(10));
document.getElementById('increaseBet').addEventListener('click', () => adjustBet(1));
document.getElementById('decreaseBet').addEventListener('click', () => adjustBet(-1));
document.getElementById('decreaseBetLarge').addEventListener('click', () => adjustBet(-10));

// Handle direct bet input
currentBetEl.addEventListener('input', (e) => {
    let value = parseInt(e.target.value) || 0;
    updateBet(value);
});

currentBetEl.addEventListener('blur', () => {
    // Ensure the display shows the actual bet amount when focus is lost
    currentBetEl.value = currentBet;
});

// Prevent form submission on enter key
currentBetEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        currentBetEl.blur();
    }
});

// Spin button handler
spinButton.addEventListener('click', spin);

// Update spin history display
function updateSpinHistory() {
    winHistoryEl.innerHTML = spinHistory.map(spin => `
        <div class="win-item">
            <div class="symbols">${spin.symbols}</div>
            <div class="amount ${spin.isWin ? 'win' : 'loss'}">
                ${spin.isWin ? '+' : ''}${spin.amount} tokens (${spin.bet}x bet)
            </div>
        </div>
    `).join('');
}

// Initialize display
balanceEl.textContent = balance;
