// Numbers and operations for equation generation
const numbers = Array.from({length: 16}, (_, i) => i.toString());
const operations = ['+', '-', '×', '÷'];

// Store generated equations to handle duplicates
const usedEquations = new Set();

// Initialize token count
let tokens = 15;

// Update token display
function updateTokenDisplay() {
    document.getElementById('tokenCount').textContent = tokens;
    const button = document.getElementById('generateBtn');
    button.disabled = tokens <= 0;
    if (tokens <= 0) {
        button.textContent = 'No tokens left!';
    } else {
        button.textContent = 'SPIN!';
    }
}

// Initialize slots with words
function initializeSlots() {
    const firstNumberScroll = document.getElementById('firstNumberScroll');
    const operationScroll = document.getElementById('operationScroll');
    const secondNumberScroll = document.getElementById('secondNumberScroll');
    
    // Create duplicate arrays for continuous scrolling effect
    const numbersExtended = [...numbers, ...numbers, ...numbers];
    const operationsExtended = [...operations, ...operations, ...operations];
    
    numbersExtended.forEach(num => {
        const div = document.createElement('div');
        div.className = 'slot-item';
        div.textContent = num;
        firstNumberScroll.appendChild(div.cloneNode(true));
        secondNumberScroll.appendChild(div);
    });
    
    operationsExtended.forEach(op => {
        const div = document.createElement('div');
        div.className = 'slot-item';
        div.textContent = op;
        operationScroll.appendChild(div);
    });
}

// Get random index ensuring visible scrolling
function getRandomIndex(array) {
    return Math.floor(Math.random() * array.length) + array.length;
}

// Generate a unique gamertag with slot machine effect
function generateEquation() {
    if (tokens <= 0) return;
    
    tokens--;
    updateTokenDisplay();
    
    const button = document.getElementById('generateBtn');
    button.disabled = true;
    
    const firstNumberScroll = document.getElementById('firstNumberScroll');
    const operationScroll = document.getElementById('operationScroll');
    const secondNumberScroll = document.getElementById('secondNumberScroll');
    
    // Add spinning class for initial rapid animation
    firstNumberScroll.classList.add('spinning');
    operationScroll.classList.add('spinning');
    secondNumberScroll.classList.add('spinning');
    
    // Get random indices
    const firstIndex = getRandomIndex(numbers);
    const operationIndex = getRandomIndex(operations);
    const secondIndex = getRandomIndex(numbers);
    
    // Calculate scroll positions (120px is the height of each slot item)
    const itemHeight = 120;
    const firstScrollPos = firstIndex * itemHeight;
    const operationScrollPos = operationIndex * itemHeight;
    const secondScrollPos = secondIndex * itemHeight;
    
    // Remove spinning and apply final position after a delay
    setTimeout(() => {
        firstNumberScroll.classList.remove('spinning');
        firstNumberScroll.style.transform = `translateY(-${firstScrollPos}px)`;
    }, 1000);
    
    setTimeout(() => {
        operationScroll.classList.remove('spinning');
        operationScroll.style.transform = `translateY(-${operationScrollPos}px)`;
    }, 1500);
    
    setTimeout(() => {
        secondNumberScroll.classList.remove('spinning');
        secondNumberScroll.style.transform = `translateY(-${secondScrollPos}px)`;
    }, 2000);
    
    // Re-enable button after animation
    setTimeout(() => {
        button.disabled = false;
        
        // Get the selected numbers and operation
        const selectedFirst = numbers[firstIndex % numbers.length];
        const selectedOperation = operations[operationIndex % operations.length];
        const selectedSecond = numbers[secondIndex % numbers.length];
        let equation = `${selectedFirst} ${selectedOperation} ${selectedSecond}`;
        
        // Handle duplicates
        if (usedEquations.has(equation)) {
            const newFirst = (parseInt(selectedFirst) + 1) % 16;
            equation = `${newFirst} ${selectedOperation} ${selectedSecond}`;
        }
        usedEquations.add(equation);
        
    }, 3500);
}

// Initialize on page load
window.addEventListener('load', () => {
    updateTokenDisplay();
    initializeSlots();
    // Initial position (show middle of first set)
    const firstNumberScroll = document.getElementById('firstNumberScroll');
    const operationScroll = document.getElementById('operationScroll');
    const secondNumberScroll = document.getElementById('secondNumberScroll');
    const initialNumPos = numbers.length * 120;
    const initialOpPos = operations.length * 120;
    firstNumberScroll.style.transform = `translateY(-${initialNumPos}px)`;
    operationScroll.style.transform = `translateY(-${initialOpPos}px)`;
    secondNumberScroll.style.transform = `translateY(-${initialNumPos}px)`;
});

// Add click event listener to generate button
document.getElementById('generateBtn').addEventListener('click', generateEquation);
