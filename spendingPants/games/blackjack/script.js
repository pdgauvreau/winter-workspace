class BlackjackGame {
    constructor() {
        this.deck = [];
        this.dealerHand = [];
        this.playerHand = [];
        this.splitHand = [];
        this.secondHand = [];
        this.thirdHand = [];
        this.balance = 0;
        this.currentBet = 10;
        this.gameInProgress = false;
        this.hasSplit = false;
        this.hasSecondHand = false;
        this.hasThirdHand = false;
        this.numHands = 1;
        this.activeHand = 'player';

        // Cache DOM elements
        this.dealerHandEl = document.getElementById('dealerHand');
        this.playerHandEl = document.getElementById('playerHand');
        this.splitHandEl = document.getElementById('splitHand');
        this.secondHandEl = document.getElementById('secondHand');
        this.thirdHandEl = document.getElementById('thirdHand');
        this.balanceEl = document.getElementById('balance');
        this.currentBetEl = document.getElementById('currentBet');
        this.dealerScoreEl = document.getElementById('dealerScore');
        this.playerScoreEl = document.getElementById('playerScore');
        this.splitScoreEl = document.getElementById('splitScore');
        this.secondHandScoreEl = document.getElementById('secondHandScore');
        this.thirdHandScoreEl = document.getElementById('thirdHandScore');
        this.messageEl = document.getElementById('message');
        this.gameHistoryEl = document.getElementById('gameHistory');
        this.secondHandContainer = document.getElementById('secondHandContainer');
        this.thirdHandContainer = document.getElementById('thirdHandContainer');

        // Buttons
        this.dealButton = document.getElementById('dealButton');
        this.hitButton = document.getElementById('hitButton');
        this.standButton = document.getElementById('standButton');
        this.splitButton = document.getElementById('splitButton');
        this.increaseBetButton = document.getElementById('increaseBet');
        this.decreaseBetButton = document.getElementById('decreaseBet');
        this.increaseBetLargeButton = document.getElementById('increaseBetLarge');
        this.decreaseBetLargeButton = document.getElementById('decreaseBetLarge');
        this.addHandButton = document.getElementById('addHandButton');
        this.removeHandButton = document.getElementById('removeHandButton');

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
        this.initializeDeck();
        this.updateControls(false);
    }

    setupEventListeners() {
        this.dealButton.addEventListener('click', () => this.startNewGame());
        this.hitButton.addEventListener('click', () => this.hit());
        this.standButton.addEventListener('click', () => this.stand());
        this.splitButton.addEventListener('click', () => this.split());
        
        // Bet adjustment buttons
        document.querySelectorAll('.bet-button').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                const currentBet = parseInt(this.currentBetEl.value) || 10;
                
                switch (action) {
                    case 'half':
                        this.currentBetEl.value = Math.max(1, Math.floor(currentBet / 2));
                        break;
                    case 'double':
                        this.currentBetEl.value = Math.min(this.balance, currentBet * 2);
                        break;
                    case 'max':
                        this.currentBetEl.value = this.balance;
                        break;
                }
                this.currentBet = parseInt(this.currentBetEl.value);
                this.updateUI();
            });
        });

        // Quick bet adjustment buttons
        this.increaseBetButton.addEventListener('click', () => this.adjustBet(1));
        this.decreaseBetButton.addEventListener('click', () => this.adjustBet(-1));
        this.increaseBetLargeButton.addEventListener('click', () => this.adjustBet(10));
        this.decreaseBetLargeButton.addEventListener('click', () => this.adjustBet(-10));
        
        this.addHandButton.addEventListener('click', () => this.addHand());
        this.removeHandButton.addEventListener('click', () => this.removeHand());

        this.currentBetEl.addEventListener('change', () => {
            let value = parseInt(this.currentBetEl.value);
            if (isNaN(value) || value < 1) value = 1;
            if (value > this.balance) value = this.balance;
            this.currentBet = value;
            this.currentBetEl.value = value;
        });
    }

    updateParentBalance() {
        window.parent.postMessage({ 
            type: 'updateBalance', 
            balance: this.balance 
        }, '*');
    }

    initializeDeck() {
        const suits = ['♠', '♥', '♣', '♦'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        this.deck = [];
        for (let suit of suits) {
            for (let value of values) {
                this.deck.push({ suit, value });
            }
        }
        
        // Shuffle deck
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    startNewGame() {
        if (this.currentBet > this.balance) {
            alert('Insufficient balance!');
            return;
        }

        // Deduct bet amount
        this.balance -= this.currentBet * this.numHands;
        this.updateParentBalance();

        this.gameInProgress = true;
        this.dealerHand = [this.drawCard(), this.drawCard()];
        this.playerHand = [this.drawCard(), this.drawCard()];
        this.splitHand = [];
        this.secondHand = this.hasSecondHand ? [this.drawCard(), this.drawCard()] : [];
        this.thirdHand = this.hasThirdHand ? [this.drawCard(), this.drawCard()] : [];
        
        this.activeHand = 'player';
        this.hasSplit = false;
        
        this.updateControls(true);
        this.updateUI();
        this.checkBlackjack();
    }

    drawCard() {
        if (this.deck.length === 0) {
            this.initializeDeck();
        }
        return this.deck.pop();
    }

    hit() {
        const newCard = this.drawCard();
        let hand;
        let newIndex;
        
        switch (this.activeHand) {
            case 'player':
                this.playerHand.push(newCard);
                hand = this.playerHand;
                newIndex = this.playerHand.length - 1;
                break;
            case 'split':
                this.splitHand.push(newCard);
                hand = this.splitHand;
                newIndex = this.splitHand.length - 1;
                break;
            case 'second':
                this.secondHand.push(newCard);
                hand = this.secondHand;
                newIndex = this.secondHand.length - 1;
                break;
            case 'third':
                this.thirdHand.push(newCard);
                hand = this.thirdHand;
                newIndex = this.thirdHand.length - 1;
                break;
        }
        
        this.updateUI(false, newIndex);
        
        if (this.calculateHand(hand).sum > 21) {
            this.nextHand();
        }
    }

    stand() {
        this.nextHand();
    }

    nextHand() {
        if (this.activeHand === 'player' && this.hasSplit) {
            this.activeHand = 'split';
        } else if (this.activeHand === 'player' && this.hasSecondHand) {
            this.activeHand = 'second';
        } else if (this.activeHand === 'split' && this.hasSecondHand) {
            this.activeHand = 'second';
        } else if (this.activeHand === 'second' && this.hasThirdHand) {
            this.activeHand = 'third';
        } else {
            this.dealerPlay();
        }
        this.updateUI();
    }

    dealerPlay() {
        let dealerScore = this.calculateHand(this.dealerHand);
        while (dealerScore.sum < 17) {
            this.dealerHand.push(this.drawCard());
            dealerScore = this.calculateHand(this.dealerHand);
        }
        this.determineWinner();
    }

    calculateHand(hand) {
        let sum = 0;
        let aces = 0;
        
        for (let card of hand) {
            if (card.value === 'A') {
                aces++;
                sum += 11;
            } else if (['K', 'Q', 'J'].includes(card.value)) {
                sum += 10;
            } else {
                sum += parseInt(card.value);
            }
        }
        
        while (sum > 21 && aces > 0) {
            sum -= 10;
            aces--;
        }
        
        return { sum, soft: aces > 0 };
    }

    checkBlackjack() {
        const dealerScore = this.calculateHand(this.dealerHand);
        const playerScore = this.calculateHand(this.playerHand);
        
        if (playerScore.sum === 21) {
            this.endGame('blackjack');
        }
    }

    split() {
        if (this.playerHand.length !== 2 || 
            this.playerHand[0].value !== this.playerHand[1].value ||
            this.currentBet > this.balance) {
            return;
        }

        this.balance -= this.currentBet;
        this.updateParentBalance();
        
        this.hasSplit = true;
        this.splitHand = [this.playerHand.pop(), this.drawCard()];
        this.playerHand.push(this.drawCard());
        
        this.updateUI();
        this.checkSplitPossible();
    }

    checkSplitPossible() {
        const canSplit = this.playerHand.length === 2 && 
                        this.playerHand[0].value === this.playerHand[1].value &&
                        !this.hasSplit &&
                        this.currentBet <= this.balance;
        this.splitButton.disabled = !canSplit;
    }

    adjustBet(amount) {
        const newBet = this.currentBet + amount;
        if (newBet >= 1 && newBet <= this.balance) {
            this.currentBet = newBet;
            this.currentBetEl.value = newBet;
        }
    }

    addHand() {
        if (this.numHands < 3) {
            this.numHands++;
            if (this.numHands === 2) {
                this.hasSecondHand = true;
                this.secondHandContainer.classList.remove('hidden');
            } else if (this.numHands === 3) {
                this.hasThirdHand = true;
                this.thirdHandContainer.classList.remove('hidden');
            }
            this.updateControls(false);
        }
    }

    removeHand() {
        if (this.numHands > 1) {
            if (this.numHands === 3) {
                this.hasThirdHand = false;
                this.thirdHandContainer.classList.add('hidden');
            } else if (this.numHands === 2) {
                this.hasSecondHand = false;
                this.secondHandContainer.classList.add('hidden');
            }
            this.numHands--;
            this.updateControls(false);
        }
    }

    updateScores(showDealerCards = false) {
        const dealerScore = this.calculateHand(this.dealerHand);
        const playerScore = this.calculateHand(this.playerHand);
        const splitScore = this.hasSplit ? this.calculateHand(this.splitHand) : null;
        const secondHandScore = this.hasSecondHand ? this.calculateHand(this.secondHand) : null;
        const thirdHandScore = this.hasThirdHand ? this.calculateHand(this.thirdHand) : null;

        this.dealerScoreEl.textContent = showDealerCards ? dealerScore.sum : '?';
        this.playerScoreEl.textContent = playerScore.sum;
        if (splitScore) this.splitScoreEl.textContent = splitScore.sum;
        if (secondHandScore) this.secondHandScoreEl.textContent = secondHandScore.sum;
        if (thirdHandScore) this.thirdHandScoreEl.textContent = thirdHandScore.sum;
    }

    determineWinner() {
        const dealerScore = this.calculateHand(this.dealerHand);
        const playerScore = this.calculateHand(this.playerHand);
        const splitScore = this.hasSplit ? this.calculateHand(this.splitHand) : null;
        const secondHandScore = this.hasSecondHand ? this.calculateHand(this.secondHand) : null;
        const thirdHandScore = this.hasThirdHand ? this.calculateHand(this.thirdHand) : null;
        
        let winningHands = 0;
        let pushHands = 0;
        const totalHands = this.numHands + (this.hasSplit ? 1 : 0);

        // Check main hand
        const mainResult = this.getHandResult(playerScore, dealerScore);
        if (mainResult === 'win' || mainResult === 'dealer_bust') winningHands++;
        else if (mainResult === 'push') pushHands++;

        // Check split hand
        if (this.hasSplit) {
            const splitResult = this.getHandResult(splitScore, dealerScore);
            if (splitResult === 'win' || splitResult === 'dealer_bust') winningHands++;
            else if (splitResult === 'push') pushHands++;
        }

        // Check second hand
        if (this.hasSecondHand) {
            const secondResult = this.getHandResult(secondHandScore, dealerScore);
            if (secondResult === 'win' || secondResult === 'dealer_bust') winningHands++;
            else if (secondResult === 'push') pushHands++;
        }

        // Check third hand
        if (this.hasThirdHand) {
            const thirdResult = this.getHandResult(thirdHandScore, dealerScore);
            if (thirdResult === 'win' || thirdResult === 'dealer_bust') winningHands++;
            else if (thirdResult === 'push') pushHands++;
        }

        // Determine overall result
        if (winningHands === totalHands) {
            this.endGame('win');
        } else if (winningHands === 0 && pushHands === 0) {
            this.endGame('lose');
        } else if (pushHands === totalHands) {
            this.endGame('push');
        } else if (winningHands > 0) {
            this.endGame('partial_win');
        } else {
            this.endGame('partial_push');
        }
    }

    getHandResult(playerScore, dealerScore) {
        if (playerScore.sum > 21) return 'bust';
        if (dealerScore.sum > 21) return 'dealer_bust';
        if (playerScore.sum === dealerScore.sum) return 'push';
        if (playerScore.sum > dealerScore.sum) return 'win';
        return 'lose';
    }

    endGame(result) {
        let message;
        let winnings = 0;
        const betAmount = this.currentBet * (this.numHands + (this.hasSplit ? 1 : 0));
        const dealerScore = this.calculateHand(this.dealerHand);
        const playerScore = this.calculateHand(this.playerHand);
        const splitScore = this.hasSplit ? this.calculateHand(this.splitHand) : null;
        const secondHandScore = this.hasSecondHand ? this.calculateHand(this.secondHand) : null;
        const thirdHandScore = this.hasThirdHand ? this.calculateHand(this.thirdHand) : null;

        switch (result) {
            case 'blackjack':
                winnings = betAmount * 2.5;
                message = 'Blackjack! You win ' + winnings + ' tokens!';
                break;
            case 'win':
                winnings = betAmount * 2;
                message = 'You win ' + winnings + ' tokens!';
                break;
            case 'dealer_bust':
                winnings = betAmount * 2;
                message = 'Dealer busts! You win ' + winnings + ' tokens!';
                break;
            case 'push':
                winnings = betAmount;
                message = 'Push! Bet returned.';
                break;
            case 'bust':
                message = 'Bust! You lose ' + betAmount + ' tokens.';
                break;
            case 'lose':
                message = 'Dealer wins! You lose ' + betAmount + ' tokens.';
                break;
            case 'partial_win':
                winnings = betAmount;
                message = 'Won some hands! ' + winnings + ' tokens!';
                break;
            case 'partial_push':
                winnings = betAmount / 2;
                message = 'Push on some hands! ' + winnings + ' tokens returned.';
                break;
        }

        this.balance += winnings;
        this.updateParentBalance();
        
        this.gameInProgress = false;
        this.updateControls(false);
        this.showMessage(message);
        this.addToHistory(result, winnings, dealerScore, playerScore, splitScore, secondHandScore, thirdHandScore);
        this.updateUI(true);

        // Reset split hand
        if (this.hasSplit) {
            this.splitHandEl.classList.add('hidden');
            this.playerHandEl.classList.remove('active');
            this.splitHandEl.classList.remove('active');
            this.hasSplit = false;
        }

        // Reset hand highlighting
        this.playerHandEl.classList.remove('active');
        this.secondHandContainer.classList.remove('active');
        this.thirdHandContainer.classList.remove('active');

        if (this.deck.length < 10) {
            this.initializeDeck();
        }
    }

    addToHistory(result, winnings, dealerScore, playerScore, splitScore, secondHandScore, thirdHandScore) {
        const historyItem = document.createElement('div');
        historyItem.className = 'win-item';
        
        const resultText = document.createElement('div');
        resultText.textContent = result === 'push' ? 'Push' : 
            winnings > 0 ? 'Won ' + winnings : 'Lost ' + this.currentBet;
        resultText.className = 'amount ' + (winnings > 0 ? 'win' : 'loss');
        
        const scoresText = document.createElement('div');
        scoresText.className = 'scores';
        
        let scoresStr = `Dealer: ${dealerScore.sum} | Hand 1: ${playerScore.sum}`;
        if (this.hasSplit) {
            scoresStr += ` | Split: ${splitScore.sum}`;
        }
        if (this.hasSecondHand) {
            scoresStr += ` | Hand 2: ${secondHandScore.sum}`;
        }
        if (this.hasThirdHand) {
            scoresStr += ` | Hand 3: ${thirdHandScore.sum}`;
        }
        scoresText.textContent = scoresStr;
        
        historyItem.appendChild(resultText);
        historyItem.appendChild(scoresText);
        this.gameHistoryEl.insertBefore(historyItem, this.gameHistoryEl.firstChild);
    }

    updateControls(gameActive) {
        this.dealButton.disabled = gameActive;
        this.hitButton.disabled = !gameActive;
        this.standButton.disabled = !gameActive;
        this.increaseBetButton.disabled = gameActive;
        this.decreaseBetButton.disabled = gameActive;
        this.addHandButton.disabled = gameActive || this.numHands >= 3;
        this.removeHandButton.disabled = gameActive || this.numHands <= 1;
        if (gameActive) this.checkSplitPossible();
    }

    showMessage(msg, type = 'info') {
        this.messageEl.textContent = msg;
        this.messageEl.className = 'message ' + type;
    }

    createCardElement(card, hidden = false, isNew = false) {
        const cardEl = document.createElement('div');
        let className = 'card';
        if (hidden) className += ' hidden';
        if (isNew) className += ' new-card';
        if (!hidden && ['♥', '♦'].includes(card.suit)) className += ' hearts';
        cardEl.className = className;
        
        cardEl.textContent = hidden ? '?' : card.value + card.suit;
        return cardEl;
    }

    updateUI(showDealerCards = false, newCardIndex = -1) {
        this.updateScores(showDealerCards);
        this.balanceEl.textContent = this.balance;
        this.currentBetEl.value = this.currentBet;

        // Update dealer's hand first
        if (this.dealerHandEl.children.length !== this.dealerHand.length) {
            this.dealerHandEl.innerHTML = '';
            this.dealerHand.forEach((card, index) => {
                const isHidden = !showDealerCards && index === 1;
                const isNew = index >= this.dealerHand.length - 1;
                const cardEl = this.createCardElement(card, isHidden, isNew);
                this.dealerHandEl.appendChild(cardEl);
            });
        } else if (showDealerCards) {
            // Reveal dealer's hidden card
            const hiddenCard = this.dealerHandEl.children[1];
            if (hiddenCard && hiddenCard.classList.contains('hidden')) {
                const card = this.dealerHand[1];
                hiddenCard.classList.add('reveal');
                setTimeout(() => {
                    hiddenCard.textContent = card.value + card.suit;
                    hiddenCard.classList.remove('hidden');
                    if (['♥', '♦'].includes(card.suit)) hiddenCard.classList.add('hearts');
                }, 300);
            }
        }

        // Only update the active hand if a new card was added
        if (newCardIndex >= 0) {
            if (this.activeHand === 'player') {
                const card = this.playerHand[newCardIndex];
                this.playerHandEl.appendChild(this.createCardElement(card, false, true));
            } else if (this.activeHand === 'split') {
                const card = this.splitHand[newCardIndex];
                this.splitHandEl.appendChild(this.createCardElement(card, false, true));
            } else if (this.activeHand === 'second') {
                const card = this.secondHand[newCardIndex];
                this.secondHandEl.appendChild(this.createCardElement(card, false, true));
            } else if (this.activeHand === 'third') {
                const card = this.thirdHand[newCardIndex];
                this.thirdHandEl.appendChild(this.createCardElement(card, false, true));
            }
        } else {
            // Update all hands if no new card was added
            // Update player's main hand
            if (this.playerHandEl.children.length !== this.playerHand.length) {
                this.playerHandEl.innerHTML = '';
                this.playerHand.forEach((card, index) => {
                    const isNew = !this.hasSplit && index >= this.playerHand.length - 2;
                    this.playerHandEl.appendChild(this.createCardElement(card, false, isNew));
                });
            }

            // Update split hand if it exists
            if (this.hasSplit) {
                this.splitHandEl.classList.remove('hidden');
                if (this.splitHandEl.children.length !== this.splitHand.length) {
                    this.splitHandEl.innerHTML = '';
                    this.splitHand.forEach((card, index) => {
                        this.splitHandEl.appendChild(this.createCardElement(card, false, index === 1));
                    });
                }
            }

            // Update second hand if it exists
            if (this.hasSecondHand) {
                if (this.secondHandEl.children.length !== this.secondHand.length) {
                    this.secondHandEl.innerHTML = '';
                    this.secondHand.forEach((card, index) => {
                        const isNew = index >= this.secondHand.length - 2;
                        this.secondHandEl.appendChild(this.createCardElement(card, false, isNew));
                    });
                }
            }

            // Update third hand if it exists
            if (this.hasThirdHand) {
                if (this.thirdHandEl.children.length !== this.thirdHand.length) {
                    this.thirdHandEl.innerHTML = '';
                    this.thirdHand.forEach((card, index) => {
                        const isNew = index >= this.thirdHand.length - 2;
                        this.thirdHandEl.appendChild(this.createCardElement(card, false, isNew));
                    });
                }
            }
        }

        // Update active hand highlighting
        this.playerHandEl.classList.toggle('active', this.activeHand === 'player');
        this.splitHandEl.classList.toggle('active', this.activeHand === 'split');
        this.secondHandContainer.classList.toggle('active', this.activeHand === 'second');
        this.thirdHandContainer.classList.toggle('active', this.activeHand === 'third');
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BlackjackGame();
});
