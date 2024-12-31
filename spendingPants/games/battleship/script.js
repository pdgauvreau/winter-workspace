let balance = 0;
let gameActive = false;
let betAmount = 10;
let shotsLeft = 10;
let hits = 0;
let currentMultiplier = 1.0;
let consecutiveHits = 0;
let balanceRequested = false;

// Ship definitions
const ships = [
    { name: 'carrier', size: 5, color: '#4CAF50' },
    { name: 'battleship', size: 4, color: '#2196F3' },
    { name: 'cruiser', size: 3, color: '#FFC107' },
    { name: 'submarine', size: 3, color: '#9C27B0' },
    { name: 'destroyer', size: 2, color: '#FF5722' }
];

// Game state
const gridSize = 10;
let grid = [];
let shipLocations = new Map();
let shipHealth = new Map();
let elements = {};

// Listen for balance updates
window.addEventListener('message', (event) => {
    if (event.data.type === 'balance') {
        balance = event.data.balance;
        updateUI();
    }
});

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    elements = {
        balance: document.getElementById('balance'),
        startButton: document.getElementById('startGame'),
        betInput: document.getElementById('betAmount'),
        statusDiv: document.getElementById('status'),
        resultDiv: document.getElementById('result'),
        multiplierDisplay: document.getElementById('multiplier'),
        shotsLeftDisplay: document.getElementById('shotsLeft'),
        hitsDisplay: document.getElementById('hits'),
        gameGrid: document.getElementById('gameGrid')
    };

    // Set up event listeners
    setupEventListeners();
    
    // Initialize game
    createGrid();
    updateUI();
    
    // Request initial balance
    requestBalance();
});

function requestBalance() {
    // Request initial balance
    window.parent.postMessage({ type: 'getBalance' }, '*');
    
    // Retry if no response after 1 second
    if (!balanceRequested) {
        balanceRequested = true;
        setTimeout(() => {
            if (balance === 0) {
                balanceRequested = false;
                requestBalance();
            }
        }, 1000);
    }
}

function setupEventListeners() {
    elements.startButton.addEventListener('click', startGame);
    elements.betInput.addEventListener('change', () => {
        let value = parseInt(elements.betInput.value) || 10;
        if (value < 1) value = 1;
        if (value > balance) value = balance;
        elements.betInput.value = value;
        betAmount = value;
        updateUI();
    });

    // Bet adjustment buttons
    document.querySelectorAll('.bet-button').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            const currentBet = parseInt(elements.betInput.value) || 10;
            
            switch (action) {
                case 'half':
                    elements.betInput.value = Math.max(1, Math.floor(currentBet / 2));
                    break;
                case 'double':
                    elements.betInput.value = Math.min(balance, currentBet * 2);
                    break;
                case 'max':
                    elements.betInput.value = balance;
                    break;
            }
            betAmount = parseInt(elements.betInput.value);
            updateUI();
        });
    });
}

// Update UI elements
function updateUI() {
    // Update balance display
    if (elements.balance) {
        elements.balance.textContent = balance.toLocaleString();
    }

    // Update game state elements
    elements.startButton.disabled = gameActive || balance < betAmount;
    elements.betInput.disabled = gameActive;
    elements.statusDiv.textContent = gameActive ? 'Fire at the grid!' : 'Place your bet to start';
    elements.multiplierDisplay.textContent = currentMultiplier.toFixed(2) + 'x';
    elements.shotsLeftDisplay.textContent = shotsLeft;
    elements.hitsDisplay.textContent = hits;
}

// Create grid
function createGrid() {
    elements.gameGrid.innerHTML = '';
    grid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', () => handleCellClick(i, j));
            elements.gameGrid.appendChild(cell);
        }
    }
}

// Place ships randomly
function placeShips() {
    shipLocations.clear();
    shipHealth.clear();
    
    for (const ship of ships) {
        let placed = false;
        while (!placed) {
            const horizontal = Math.random() < 0.5;
            const row = Math.floor(Math.random() * gridSize);
            const col = Math.floor(Math.random() * gridSize);
            
            if (canPlaceShip(ship, row, col, horizontal)) {
                placeShip(ship, row, col, horizontal);
                placed = true;
            }
        }
        
        // Initialize ship health
        shipHealth.set(ship.name, ship.size);
        updateShipDisplay(ship.name);
    }
}

// Check if ship can be placed
function canPlaceShip(ship, row, col, horizontal) {
    if (horizontal) {
        if (col + ship.size > gridSize) return false;
        for (let i = 0; i < ship.size; i++) {
            if (grid[row][col + i] !== 0) return false;
        }
    } else {
        if (row + ship.size > gridSize) return false;
        for (let i = 0; i < ship.size; i++) {
            if (grid[row + i][col] !== 0) return false;
        }
    }
    return true;
}

// Place ship on grid
function placeShip(ship, row, col, horizontal) {
    const positions = [];
    
    if (horizontal) {
        for (let i = 0; i < ship.size; i++) {
            grid[row][col + i] = 1;
            positions.push([row, col + i]);
        }
    } else {
        for (let i = 0; i < ship.size; i++) {
            grid[row + i][col] = 1;
            positions.push([row + i, col]);
        }
    }
    
    shipLocations.set(ship.name, positions);
}

// Update ship health display
function updateShipDisplay(shipName) {
    const ship = ships.find(s => s.name === shipName);
    const health = shipHealth.get(shipName);
    const shipElement = document.querySelector(`.ship.${shipName} .ship-health`);
    
    if (shipElement) {
        shipElement.innerHTML = '';
        for (let i = 0; i < ship.size; i++) {
            const segment = document.createElement('div');
            segment.className = 'health-segment' + (i >= health ? ' hit' : '');
            shipElement.appendChild(segment);
        }
    }
}

// Handle cell click
function handleCellClick(row, col) {
    if (!gameActive || shotsLeft <= 0) return;
    
    const cell = elements.gameGrid.children[row * gridSize + col];
    if (cell.classList.contains('hit') || cell.classList.contains('miss')) return;
    
    shotsLeft--;
    
    if (grid[row][col] === 1) {
        // Hit
        cell.classList.add('hit');
        hits++;
        consecutiveHits++;
        currentMultiplier += 0.1 * consecutiveHits;
        
        // Check which ship was hit
        for (const [shipName, positions] of shipLocations) {
            if (positions.some(pos => pos[0] === row && pos[1] === col)) {
                const health = shipHealth.get(shipName) - 1;
                shipHealth.set(shipName, health);
                updateShipDisplay(shipName);
                break;
            }
        }
    } else {
        // Miss
        cell.classList.add('miss');
        consecutiveHits = 0;
    }
    
    updateUI();
    
    // Check if game should end
    if (shotsLeft <= 0 || hits === 17) {
        endGame();
    }
}

// Start game
function startGame() {
    if (balance < betAmount) return;

    // Reset game state
    gameActive = true;
    shotsLeft = 30;
    hits = 0;
    currentMultiplier = 1.0;
    consecutiveHits = 0;
    elements.resultDiv.classList.add('hidden');
    
    // Update balance
    balance -= betAmount;
    window.parent.postMessage({ 
        type: 'updateBalance', 
        balance: balance 
    }, '*');
    
    createGrid();
    placeShips();
    updateUI();
}

// End game
function endGame() {
    gameActive = false;
    
    const totalHits = Array.from(shipHealth.values()).reduce((a, b) => a + (b === 0 ? 1 : 0), 0);
    const winnings = Math.floor(betAmount * currentMultiplier * (hits / 17));
    
    if (winnings > 0) {
        balance += winnings;
        window.parent.postMessage({ 
            type: 'updateBalance', 
            balance: balance 
        }, '*');
    }
    
    elements.resultDiv.textContent = `Game Over! You hit ${hits} targets and won ${winnings} tokens!`;
    elements.resultDiv.className = winnings > betAmount ? 'win' : 'loss';
    elements.resultDiv.classList.remove('hidden');
    
    // Reveal all ships
    for (const [shipName, positions] of shipLocations) {
        for (const [row, col] of positions) {
            const cell = elements.gameGrid.children[row * gridSize + col];
            if (!cell.classList.contains('hit')) {
                cell.style.background = ships.find(s => s.name === shipName).color;
                cell.style.opacity = '0.5';
            }
        }
    }
    
    updateUI();
}

// Initial setup
createGrid();
updateUI();
