class BlackjackGame {
    constructor() {
        console.log('Initializing BlackjackGame...');
        this.deck = [];
        this.playerHand = [];
        this.splitHand = [];
        this.secondHand = [];
        this.thirdHand = [];
        this.dealerHand = [];
        this.balance = 1000;
        this.currentBet = 10;
        this.gameInProgress = false;
        this.activeHand = 'player'; // 'player', 'split', 'second', or 'third'
        this.hasSplit = false;
        this.hasSecondHand = false;
        this.hasThirdHand = false;
        this.numHands = 1;

        // DOM elements
        this.balanceEl = document.getElementById('balance');
        this.currentBetEl = document.getElementById('currentBet');
        this.messageEl = document.getElementById('message');
        this.playerHandEl = document.getElementById('playerHand');
        this.splitHandEl = document.getElementById('splitHand');
        this.dealerHandEl = document.getElementById('dealerHand');
        this.gameHistoryEl = document.getElementById('gameHistory');
        this.playerScoreEl = document.getElementById('playerScore');
        this.splitScoreEl = document.getElementById('splitScore');
        this.dealerScoreEl = document.getElementById('dealerScore');
        this.secondHandEl = document.getElementById('secondHand');
        this.secondHandScoreEl = document.getElementById('secondHandScore');
        this.secondHandContainer = document.getElementById('secondHandContainer');
        this.thirdHandEl = document.getElementById('thirdHand');
        this.thirdHandScoreEl = document.getElementById('thirdHandScore');
        this.thirdHandContainer = document.getElementById('thirdHandContainer');

        // Buttons
        this.dealButton = document.getElementById('dealButton');
        this.hitButton = document.getElementById('hitButton');
        this.standButton = document.getElementById('standButton');
        this.splitButton = document.getElementById('splitButton');
        this.increaseBetButton = document.getElementById('increaseBet');
        this.decreaseBetButton = document.getElementById('decreaseBet');
        this.addHandButton = document.getElementById('addHandButton');
        this.removeHandButton = document.getElementById('removeHandButton');

        // Initialize
        this.initializeDeck();
        this.setupEventListeners();
        this.updateUI();
        this.updateHandControls();
    }

    initializeDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        this.deck = [];
        for (let suit of suits) {
            for (let value of values) {
                this.deck.push({ suit, value });
            }
        }
        this.shuffleDeck();
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    setupEventListeners() {
        this.dealButton.addEventListener('click', () => this.startNewGame());
        this.hitButton.addEventListener('click', () => this.hit());
        this.standButton.addEventListener('click', () => this.stand());
        this.splitButton.addEventListener('click', () => this.split());
        this.increaseBetButton.addEventListener('click', () => this.adjustBet(10));
        this.decreaseBetButton.addEventListener('click', () => this.adjustBet(-10));
        this.addHandButton.addEventListener('click', () => this.addHand());
        this.removeHandButton.addEventListener('click', () => this.removeHand());
    }

    adjustBet(amount) {
        if (this.gameInProgress) return;
        
        const newBet = this.currentBet + amount;
        if (newBet >= 10 && newBet <= this.balance) {
            this.currentBet = newBet;
            this.updateUI();
        }
    }

    addHand() {
        if (this.gameInProgress || this.numHands >= 3 || this.balance < this.currentBet) {
            this.showMessage('Cannot add hand!', 'error');
            return;
        }

        this.numHands++;
        if (this.numHands === 2) {
            this.hasSecondHand = true;
            this.secondHandContainer.classList.remove('hidden');
        } else if (this.numHands === 3) {
            this.hasThirdHand = true;
            this.thirdHandContainer.classList.remove('hidden');
        }

        this.updateHandControls();
    }

    removeHand() {
        if (this.gameInProgress || this.numHands <= 1) {
            this.showMessage('Cannot remove hand!', 'error');
            return;
        }

        this.numHands--;
        if (this.hasThirdHand) {
            this.hasThirdHand = false;
            this.thirdHandContainer.classList.add('hidden');
        } else if (this.hasSecondHand) {
            this.hasSecondHand = false;
            this.secondHandContainer.classList.add('hidden');
        }

        this.updateHandControls();
    }

    updateHandControls() {
        this.addHandButton.disabled = this.gameInProgress || this.numHands >= 3;
        this.removeHandButton.disabled = this.gameInProgress || this.numHands <= 1;
    }

    startNewGame() {
        console.log('Starting new game...');
        const totalBet = this.currentBet * this.numHands;
        if (this.balance < totalBet) {
            this.showMessage('Not enough tokens!', 'error');
            return;
        }

        // Clear all hands and reset UI
        this.gameInProgress = true;
        this.balance -= totalBet;
        this.playerHand = [];
        this.splitHand = [];
        this.secondHand = [];
        this.thirdHand = [];
        this.dealerHand = [];
        this.hasSplit = false;
        this.activeHand = 'player';
        
        // Reset UI elements
        this.playerHandEl.innerHTML = '';
        this.splitHandEl.innerHTML = '';
        this.secondHandEl.innerHTML = '';
        this.thirdHandEl.innerHTML = '';
        this.dealerHandEl.innerHTML = '';
        this.splitHandEl.classList.add('hidden');
        this.playerHandEl.classList.remove('active');
        this.splitHandEl.classList.remove('active');
        this.dealerScoreEl.innerHTML = '';
        this.playerScoreEl.innerHTML = '';
        this.splitScoreEl.innerHTML = '';
        this.secondHandScoreEl.innerHTML = '';
        this.thirdHandScoreEl.innerHTML = '';

        // Deal initial cards
        this.playerHand.push(this.drawCard());
        this.dealerHand.push(this.drawCard());
        this.playerHand.push(this.drawCard());
        if (this.hasSecondHand) {
            this.secondHand.push(this.drawCard());
            this.secondHand.push(this.drawCard());
        }
        if (this.hasThirdHand) {
            this.thirdHand.push(this.drawCard());
            this.thirdHand.push(this.drawCard());
        }
        this.dealerHand.push(this.drawCard());

        this.updateControls(true);
        this.updateUI();
        this.checkSplitPossible();

        // Check for natural blackjack
        const playerScore = this.calculateHand(this.playerHand);
        const secondHandScore = this.hasSecondHand ? this.calculateHand(this.secondHand) : null;
        const thirdHandScore = this.hasThirdHand ? this.calculateHand(this.thirdHand) : null;
        
        if (playerScore.sum === 21 && 
            (!this.hasSecondHand || secondHandScore.sum === 21) &&
            (!this.hasThirdHand || thirdHandScore.sum === 21)) {
            this.endGame('blackjack');
        }
    }

    checkSplitPossible() {
        const canSplit = this.playerHand.length === 2 && 
                        this.playerHand[0].value === this.playerHand[1].value &&
                        this.balance >= this.currentBet &&
                        !this.hasSplit;
        this.splitButton.disabled = !canSplit || !this.gameInProgress;
    }

    split() {
        if (this.balance < this.currentBet) {
            this.showMessage('Not enough tokens for split!', 'error');
            return;
        }

        this.balance -= this.currentBet;
        this.hasSplit = true;
        this.splitHand = [this.playerHand.pop()];
        
        // Deal one card to each hand
        this.playerHand.push(this.drawCard());
        this.splitHand.push(this.drawCard());
        
        this.splitHandEl.classList.remove('hidden');
        this.playerHandEl.classList.add('active');
        this.activeHand = 'player';
        
        this.updateUI();
        this.splitButton.disabled = true;
    }

    drawCard() {
        if (this.deck.length === 0) {
            this.initializeDeck();
        }
        return this.deck.pop();
    }

    async hit() {
        let currentHand;
        if (this.activeHand === 'player') currentHand = this.playerHand;
        else if (this.activeHand === 'split') currentHand = this.splitHand;
        else if (this.activeHand === 'second') currentHand = this.secondHand;
        else currentHand = this.thirdHand;

        currentHand.push(this.drawCard());
        const score = this.calculateHand(currentHand);
        
        // Pass the index of the new card to updateUI
        this.updateUI(false, currentHand.length - 1);
        
        if (score.sum > 21) {
            if (this.hasSplit && this.activeHand === 'player') {
                // Move to split hand
                this.playerHandEl.classList.remove('active');
                this.splitHandEl.classList.add('active');
                this.activeHand = 'split';
            } else if (this.hasSecondHand && (this.activeHand === 'player' || this.activeHand === 'split')) {
                // Move to second hand
                this.playerHandEl.classList.remove('active');
                this.splitHandEl.classList.remove('active');
                this.secondHandContainer.classList.add('active');
                this.activeHand = 'second';
            } else if (this.hasThirdHand && this.activeHand === 'second') {
                // Move to third hand
                this.secondHandContainer.classList.remove('active');
                this.thirdHandContainer.classList.add('active');
                this.activeHand = 'third';
            } else {
                // All hands are done, reveal dealer's cards
                this.hitButton.disabled = true;
                this.updateUI(true);
                
                await new Promise(resolve => setTimeout(resolve, 600));
                
                let dealerScore = this.calculateHand(this.dealerHand);
                while (dealerScore.sum < 17) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    this.dealerHand.push(this.drawCard());
                    this.updateUI(true);
                    dealerScore = this.calculateHand(this.dealerHand);
                }
                
                this.determineWinner();
            }
        } else if (score.sum === 21) {
            await this.stand();
        }
    }

    async stand() {
        // Check if this is the last hand
        const isLastHand = (this.hasThirdHand && this.activeHand === 'third') ||
                          (this.hasSecondHand && !this.hasThirdHand && this.activeHand === 'second') ||
                          (!this.hasSecondHand && !this.hasThirdHand && this.activeHand === 'player');
        const isLastSplitHand = this.hasSplit && this.activeHand === 'split' && !this.hasSecondHand && !this.hasThirdHand;
        
        if (!isLastHand && !isLastSplitHand) {
            if (this.hasSplit && this.activeHand === 'player') {
                // Move to split hand
                this.playerHandEl.classList.remove('active');
                this.splitHandEl.classList.add('active');
                this.activeHand = 'split';
                return;
            } else if (this.hasSecondHand && (this.activeHand === 'player' || this.activeHand === 'split')) {
                // Move to second hand
                this.playerHandEl.classList.remove('active');
                this.splitHandEl.classList.remove('active');
                this.secondHandContainer.classList.add('active');
                this.activeHand = 'second';
                return;
            } else if (this.hasThirdHand && this.activeHand === 'second') {
                // Move to third hand
                this.secondHandContainer.classList.remove('active');
                this.thirdHandContainer.classList.add('active');
                this.activeHand = 'third';
                return;
            }
        }

        // This is the last hand, complete dealer's play
        this.hitButton.disabled = true;
        this.standButton.disabled = true;

        // Reveal dealer's hidden card with flip animation
        this.updateUI(true);
        
        // Wait for card flip animation to complete
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Dealer must hit on 16 and below
        let dealerScore = this.calculateHand(this.dealerHand);
        while (dealerScore.sum < 17) {
            await new Promise(resolve => setTimeout(resolve, 500));
            this.dealerHand.push(this.drawCard());
            this.updateUI(true);
            dealerScore = this.calculateHand(this.dealerHand);
        }

        this.determineWinner();
    }

    calculateHand(hand) {
        let sum = 0;
        let aces = 0;
        let altSum = null;

        // First pass: count non-aces
        for (let card of hand) {
            if (card.value === 'A') {
                aces += 1;
            } else if (['K', 'Q', 'J'].includes(card.value)) {
                sum += 10;
            } else {
                sum += parseInt(card.value);
            }
        }

        // Handle aces
        if (aces > 0) {
            // Calculate primary sum (use 11 for first ace if possible)
            let primarySum = sum + 11 + (aces - 1);
            if (primarySum <= 21) {
                sum = primarySum;
                // Calculate alternate sum if it would be different
                altSum = sum - 10;
            } else {
                // All aces count as 1
                sum = sum + aces;
            }
        }

        return { sum, altSum };
    }

    formatScore(score) {
        if (score.altSum !== null && score.altSum < score.sum) {
            return `${score.sum} <span class="alt">(${score.altSum})</span>`;
        }
        return score.sum.toString();
    }

    updateScores(showDealerScore = false) {
        // Update player score
        const playerScore = this.calculateHand(this.playerHand);
        this.playerScoreEl.innerHTML = this.formatScore(playerScore);

        // Update split score if exists
        if (this.hasSplit) {
            const splitScore = this.calculateHand(this.splitHand);
            this.splitScoreEl.innerHTML = this.formatScore(splitScore);
            this.splitScoreEl.classList.remove('hidden');
        } else {
            this.splitScoreEl.classList.add('hidden');
        }

        // Update second hand score if exists
        if (this.hasSecondHand) {
            const secondHandScore = this.calculateHand(this.secondHand);
            this.secondHandScoreEl.innerHTML = this.formatScore(secondHandScore);
        }

        // Update third hand score if exists
        if (this.hasThirdHand) {
            const thirdHandScore = this.calculateHand(this.thirdHand);
            this.thirdHandScoreEl.innerHTML = this.formatScore(thirdHandScore);
        }

        // Update dealer score
        if (showDealerScore) {
            // Only calculate score for visible cards
            const visibleCards = [...this.dealerHand];
            // Remove any cards that haven't been revealed yet
            const hiddenCardElements = Array.from(this.dealerHandEl.getElementsByClassName('hidden'));
            hiddenCardElements.forEach(() => {
                visibleCards.pop();
            });
            const dealerScore = this.calculateHand(visibleCards);
            this.dealerScoreEl.innerHTML = this.formatScore(dealerScore);
        } else if (this.dealerHand.length > 0) {
            // Show score of first card only
            const firstCardScore = this.calculateHand([this.dealerHand[0]]);
            this.dealerScoreEl.innerHTML = firstCardScore.sum + ' + ?';
        } else {
            this.dealerScoreEl.innerHTML = '';
        }
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
        if (!hidden && ['♥', '♦'].includes(card.suit)) className += ' red';
        cardEl.className = className;
        
        cardEl.textContent = hidden ? '?' : card.value + card.suit;
        return cardEl;
    }

    updateUI(showDealerCards = false, newCardIndex = -1) {
        this.updateScores(showDealerCards);
        this.balanceEl.textContent = this.balance;
        this.currentBetEl.textContent = this.currentBet;

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
                    if (['♥', '♦'].includes(card.suit)) hiddenCard.classList.add('red');
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

// Start the game when the page loads
window.addEventListener('load', () => {
    console.log('Page loaded, starting game...');
    new BlackjackGame();
});

// Add error handling for missing elements
window.addEventListener('error', (e) => {
    console.error('Error:', e.message);
});
