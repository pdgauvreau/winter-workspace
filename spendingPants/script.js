// Game state
let balance = 0;

// DOM Elements
const balanceEl = document.getElementById('balance');
const gameFrame = document.getElementById('gameFrame');
const depositModal = document.getElementById('depositModal');
const depositButton = document.getElementById('depositButton');
const closeModalButton = document.querySelector('.close-modal');
const customAmountInput = document.getElementById('customAmount');
const customDepositButton = document.getElementById('customDepositButton');

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    // Load saved balance from localStorage
    const savedBalance = localStorage.getItem('arcadeBalance');
    if (savedBalance) {
        balance = parseInt(savedBalance);
        updateBalance(balance);
    }

    // Setup game switching
    document.querySelectorAll('.game-button').forEach(button => {
        button.addEventListener('click', () => {
            const game = button.dataset.game;
            switchGame(game);
            
            // Update active button
            document.querySelectorAll('.game-button').forEach(btn => 
                btn.classList.remove('active')
            );
            button.classList.add('active');
        });
    });

    // Setup deposit modal
    depositButton.addEventListener('click', () => {
        depositModal.classList.remove('hidden');
    });

    closeModalButton.addEventListener('click', () => {
        depositModal.classList.add('hidden');
    });

    // Handle deposit options
    document.querySelectorAll('.deposit-option').forEach(button => {
        button.addEventListener('click', () => {
            const amount = parseInt(button.dataset.amount);
            deposit(amount);
            depositModal.classList.add('hidden');
        });
    });

    // Handle custom deposit
    customDepositButton.addEventListener('click', () => {
        const amount = parseInt(customAmountInput.value);
        if (amount > 0) {
            deposit(amount);
            depositModal.classList.add('hidden');
        }
    });

    // Close modal when clicking outside
    depositModal.addEventListener('click', (e) => {
        if (e.target === depositModal) {
            depositModal.classList.add('hidden');
        }
    });

    // Handle messages from games
    window.addEventListener('message', (event) => {
        // Ensure we're only handling messages from our games
        if (!event.source || !event.source.frameElement || event.source.frameElement.id !== 'gameFrame') {
            return;
        }
        
        if (event.data.type === 'getBalance') {
            event.source.postMessage({ 
                type: 'balance', 
                balance: balance 
            }, '*');
        } else if (event.data.type === 'updateBalance') {
            updateBalance(event.data.balance);
        }
    });
});

function switchGame(game) {
    gameFrame.src = `games/${game}/index.html`;
    
    // Wait for frame to load then sync balance
    gameFrame.onload = () => {
        setTimeout(() => {
            if (gameFrame.contentWindow) {
                gameFrame.contentWindow.postMessage({
                    type: 'balance',
                    balance: balance
                }, '*');
            }
        }, 100); // Small delay to ensure game has set up message listener
    };
}

function deposit(amount) {
    const newBalance = balance + amount;
    updateBalance(newBalance);
    
    // Notify current game of balance update
    if (gameFrame.contentWindow) {
        gameFrame.contentWindow.postMessage({
            type: 'balance',
            balance: newBalance
        }, '*');
    }
}

function updateBalance(newBalance) {
    balance = newBalance;
    balanceEl.textContent = balance;
    localStorage.setItem('arcadeBalance', balance.toString());
    
    // Notify current game if frame is ready
    if (gameFrame.contentWindow) {
        gameFrame.contentWindow.postMessage({ 
            type: 'balance', 
            balance: balance 
        }, '*');
    }
}
