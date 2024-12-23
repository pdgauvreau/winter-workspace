// Function definitions
function updateSliderPosition(position) {
    // Ensure position is an integer
    position = Math.round(position);
    sliderPosition = position;
    slider.style.left = `${position}%`;
    dragButton.style.left = `${position}%`;
    sliderValue.textContent = position;
    
    // Update multiplier display
    const multiplier = calculateMultiplier(position);
    multiplierValue.textContent = multiplier;
}

function calculateMultiplier(position) {
    // Higher risk (higher position) = higher reward
    return (100 / (100 - position)).toFixed(2);
}

function getPositionFromEvent(e) {
    const rect = bar.getBoundingClientRect();
    const totalWidth = rect.width;
    const padding = totalWidth * 0.02; // 2% padding
    const effectiveWidth = totalWidth - (padding * 2);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    
    // Calculate relative position within the effective area (0 to 1)
    const relativeX = (clientX - (rect.left + padding)) / effectiveWidth;
    
    // Convert to percentage and clamp between 50-100
    const percentage = relativeX * 100;
    return Math.max(50, Math.min(100, Math.round(percentage)));
}

function startDragging(e) {
    isDragging = true;
    const target = e.target;
    target.style.cursor = 'grabbing';
    
    // Update position immediately on click/touch
    const position = getPositionFromEvent(e);
    updateSliderPosition(position);
    
    // Store initial positions for relative dragging
    dragStartX = e.touches ? e.touches[0].clientX : e.clientX;
    dragStartLeft = position;
    
    // Prevent text selection and scrolling while dragging
    e.preventDefault();
}

function drag(e) {
    if (!isDragging) return;
    
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const rect = bar.getBoundingClientRect();
    const totalWidth = rect.width;
    const padding = totalWidth * 0.02;
    const effectiveWidth = totalWidth - (padding * 2);
    
    // Calculate relative movement
    const deltaX = currentX - dragStartX;
    const deltaPercentage = (deltaX / effectiveWidth) * 100;
    
    // Update position based on initial position plus movement
    const newPosition = Math.max(50, Math.min(100, dragStartLeft + deltaPercentage));
    updateSliderPosition(newPosition);
}

function stopDragging(e) {
    if (!isDragging) return;
    isDragging = false;
    dragButton.style.cursor = 'grab';
    slider.style.cursor = 'grab';
    dragStartX = 0;
    dragStartLeft = 0;
}

function addToHistory(position, result, isWin, amount, multiplier) {
    const historyItem = document.createElement('div');
    historyItem.className = `history-item ${isWin ? 'win' : 'loss'}`;
    
    const amountText = isWin 
        ? `<span style="color: #4CAF50">+$${amount}</span>` 
        : `<span style="color: #f44336">-$${currentBet}</span>`;

    historyItem.innerHTML = `
        <div style="margin-bottom: 5px">
            <span>Position: ${position}</span>
            ${isWin ? `<span style="color: #aaa"> | ${multiplier}x</span>` : ''}
        </div>
        <div style="color: #aaa">Result: ${result}</div>
        <div style="margin-top: 5px">${amountText}</div>
    `;

    historyList.insertBefore(historyItem, historyList.firstChild);

    // Keep history list manageable
    if (historyList.children.length > 50) {
        historyList.removeChild(historyList.lastChild);
    }
}

// Initialize variables and elements
let balance = 1000;
let currentBet = 10;
let isDragging = false;
let sliderPosition = 50;
let dragStartX = 0;
let dragStartLeft = 0;

const slider = document.getElementById('slider');
const sliderValue = document.getElementById('sliderValue');
const resultMarker = document.getElementById('resultMarker');
const balanceElement = document.getElementById('balance');
const currentBetElement = document.getElementById('currentBet');
const playButton = document.getElementById('playButton');
const messageElement = document.getElementById('message');
const historyList = document.getElementById('historyList');
const bar = document.querySelector('.bar');
const multiplierValue = document.getElementById('multiplierValue');
const dragButton = document.getElementById('dragButton');

// Initialize slider position
updateSliderPosition(50);

// Add event listeners
document.getElementById('increaseBet').addEventListener('click', () => {
    if (currentBet + 10 <= balance) {
        currentBet += 10;
        currentBetElement.textContent = currentBet;
    }
});

document.getElementById('decreaseBet').addEventListener('click', () => {
    if (currentBet - 10 >= 10) {
        currentBet -= 10;
        currentBetElement.textContent = currentBet;
    }
});

// Handle bar clicks and touches
function handleBarInteraction(e) {
    if (isDragging) return; // Prevent updates during drag
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    const position = getPositionFromEvent(e);
    updateSliderPosition(position);
}

// Add bar interaction events
bar.addEventListener('click', handleBarInteraction);
bar.addEventListener('touchstart', handleBarInteraction);
bar.addEventListener('touchmove', (e) => e.preventDefault()); // Prevent scrolling on touch

// Add mouse and touch event listeners
dragButton.addEventListener('mousedown', startDragging);
dragButton.addEventListener('touchstart', startDragging);
slider.addEventListener('mousedown', startDragging);
slider.addEventListener('touchstart', startDragging);
document.addEventListener('mousemove', drag);
document.addEventListener('touchmove', drag);
document.addEventListener('mouseup', stopDragging);
document.addEventListener('touchend', stopDragging);
document.addEventListener('touchcancel', stopDragging);

// Add play button event listener
playButton.addEventListener('click', async () => {
    if (balance < currentBet) {
        messageElement.textContent = 'Insufficient balance!';
        messageElement.style.color = '#f44336';
        return;
    }

    // Disable controls
    playButton.disabled = true;
    dragButton.style.pointerEvents = 'none';
    slider.style.pointerEvents = 'none';

    // Deduct bet
    balance -= currentBet;
    balanceElement.textContent = balance;

    // Add playing animation
    slider.style.transition = 'opacity 0.3s';
    slider.style.opacity = '0.5';
    dragButton.style.opacity = '0.5';

    // Generate random number with animation delay
    await new Promise(resolve => setTimeout(resolve, 500));
    const randomNumber = Math.floor(Math.random() * 101);

    // Show result marker with animation
    resultMarker.style.transition = 'left 0.5s ease-out, opacity 0.5s ease-out';
    resultMarker.style.left = `${randomNumber}%`;
    resultMarker.style.opacity = '1';

    // Calculate win/loss
    const isWin = randomNumber >= sliderPosition;
    const multiplier = calculateMultiplier(sliderPosition);
    const winAmount = isWin ? Math.floor(currentBet * multiplier) : 0;

    // Update balance if won
    if (isWin) {
        await new Promise(resolve => setTimeout(resolve, 500));
        balance += winAmount;
        balanceElement.textContent = balance;
        balanceElement.style.color = '#4CAF50';
        setTimeout(() => {
            balanceElement.style.color = 'white';
        }, 1000);
    }

    // Display message
    messageElement.textContent = isWin 
        ? `You won $${winAmount}! (${multiplier}x)` 
        : 'You lost!';
    messageElement.style.color = isWin ? '#4CAF50' : '#f44336';

    // Add to history
    addToHistory(sliderPosition, randomNumber, isWin, winAmount, multiplier);

    // Reset after delay
    setTimeout(() => {
        resultMarker.style.opacity = '0';
        slider.style.opacity = '1';
        dragButton.style.opacity = '1';
        playButton.disabled = false;
        slider.style.pointerEvents = 'auto';
        dragButton.style.pointerEvents = 'auto';
    }, 2000);
});
