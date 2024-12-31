// Constants
let CANVAS_PADDING;
let PEG_RADIUS;
let BALL_RADIUS;
let PEG_SPACING;

// Function to calculate dynamic sizes
// Fixed base sizes
const BASE_PEG_SPACING = 60;
const BASE_PEG_RADIUS = 4;
const BASE_BALL_RADIUS = 6;
const BASE_PADDING = 40;

function calculateSizes() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate how many pegs need to fit horizontally
    const maxPegsHorizontal = currentRows + 2;
    
    // Calculate base width and height needed
    const baseWidth = (maxPegsHorizontal - 1) * BASE_PEG_SPACING + (2 * BASE_PADDING);
    const baseHeight = (currentRows * BASE_PEG_SPACING) + (BASE_PEG_SPACING * 2) + (2 * BASE_PADDING);
    
    // Calculate scale factor to fit container
    const scaleX = containerWidth / baseWidth;
    const scaleY = containerHeight / baseHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Never scale up, only down
    
    // Apply scale to all measurements
    PEG_SPACING = BASE_PEG_SPACING * scale;
    PEG_RADIUS = BASE_PEG_RADIUS * scale;
    BALL_RADIUS = BASE_BALL_RADIUS * scale;
    CANVAS_PADDING = BASE_PADDING * scale;
    
    // Set container height to maintain aspect ratio
    const height = baseHeight * scale;
    container.style.height = height + 'px';
    canvas.height = height;
}
// Function to generate multipliers based on number of rows
function generateMultipliers(rows) {
    // Base multiplier pattern from the image
    const basePattern = [5, 1.7, 1.1, 1, 0.5, 1, 1.1, 1.7, 5];
    const pegsInLastRow = rows + 2;
    const numMultipliers = pegsInLastRow - 1; // One less multiplier than pegs
    
    if (numMultipliers <= 9) {
        // For 8 rows (9 multipliers), return the exact pattern
        return basePattern;
    }
    
    // For more rows, extend the pattern while maintaining symmetry
    const multipliers = [];
    const extraSlots = (numMultipliers - 9) / 2;
    
    // Left side (high values)
    for (let i = 0; i < extraSlots; i++) {
        multipliers.push(5 + (i + 1) * 0.5); // Increment by 0.5 for each extra slot
    }
    
    // Add base pattern
    multipliers.push(...basePattern);
    
    // Right side (mirror of left side)
    for (let i = extraSlots - 1; i >= 0; i--) {
        multipliers.push(5 + (i + 1) * 0.5);
    }
    
    return multipliers;
}

// Function to generate colors for multipliers
function generateColors(multipliers) {
    const colors = {};
    multipliers.forEach(multiplier => {
        if (multiplier >= 5) {
            colors[multiplier] = '#4CAF50'; // Bright green for high multipliers
        } else if (multiplier > 1) {
            colors[multiplier] = '#388E3C'; // Darker green for medium multipliers
        } else if (multiplier === 1) {
            colors[multiplier] = '#D32F2F'; // Red for 1x
        } else {
            colors[multiplier] = '#B71C1C'; // Darker red for values less than 1
        }
    });
    return colors;
}

// Game state
let balance = 1000;
let currentBet = 0.00;
let currentRows = 8;
let MULTIPLIERS = generateMultipliers(currentRows);
let COLORS = generateColors(MULTIPLIERS);
let currentRisk = 'low';
let canvas, ctx;
let balls = [];
let ballTrails = []; // Store ball trails
let pegs = [];
let landingSpots = [];
let animationId;
let canDrop = true;
let isChangingRows = false;

// Trail configuration
const TRAIL_LENGTH = 10;
const TRAIL_OPACITY_STEP = 0.8 / TRAIL_LENGTH;

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('plinkoCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        calculateSizes();
        setupPegs();
        setupLandingSpots();
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Setup bet controls
    const betInput = document.getElementById('currentBet');
    betInput.value = currentBet.toFixed(2);
    
    // Bet modification buttons
    document.querySelectorAll('.bet-button').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.textContent;
            switch(action) {
                case '1/2':
                    currentBet = Math.max(0.01, currentBet / 2);
                    break;
                case '2x':
                    if (currentBet * 2 <= balance) {
                        currentBet = currentBet * 2;
                    }
                    break;
                case 'Max':
                    currentBet = balance;
                    break;
            }
            betInput.value = currentBet.toFixed(2);
        });
    });

    // Risk level buttons
    document.querySelectorAll('.risk-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.risk-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentRisk = button.textContent.toLowerCase();
        });
    });

    // Row selection buttons
    document.querySelectorAll('.row-button').forEach(button => {
        button.addEventListener('click', () => {
            // Don't allow changes while balls are active
            if (balls.length > 0) return;
            
            document.querySelectorAll('.row-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Set changing rows flag
            isChangingRows = true;
            
            // Clear any existing state
            balls = [];
            ballTrails = [];
            
            // Update rows and recreate interface
            currentRows = parseInt(button.textContent);
            MULTIPLIERS = generateMultipliers(currentRows);
            COLORS = generateColors(MULTIPLIERS);
            calculateSizes();
            setupPegs();
            setupLandingSpots();
            
            // Reset changing rows flag
            isChangingRows = false;
        });
    });

    // Bet input validation
    betInput.addEventListener('change', (e) => {
        let value = parseFloat(e.target.value);
        if (isNaN(value) || value < 0.01) {
            value = 0.01;
        } else if (value > balance) {
            value = balance;
        }
        currentBet = value;
        e.target.value = value.toFixed(2);
    });

    // Setup drop button
    document.getElementById('dropButton').addEventListener('click', dropBall);

    // Start animation loop
    animate();
});

function setupPegs() {
    pegs = [];
    const startY = CANVAS_PADDING + PEG_SPACING;
    
    // Calculate total width needed for the bottom row
    const maxPegsInRow = currentRows + 2; // Bottom row has currentRows + 2 pegs
    const totalMaxWidth = (maxPegsInRow - 1) * PEG_SPACING;
    
    // Start with 3 pegs in first row, add one each row
    for (let row = 0; row < currentRows; row++) {
        const pegsInThisRow = row + 3;
        const rowWidth = (pegsInThisRow - 1) * PEG_SPACING;
        const startX = (canvas.width - rowWidth) / 2;
        
        for (let col = 0; col < pegsInThisRow; col++) {
            pegs.push({
                x: startX + (col * PEG_SPACING),
                y: startY + (row * PEG_SPACING),
                radius: PEG_RADIUS,
                row: row // Add row information for easier filtering
            });
        }
    }
}

function setupLandingSpots() {
    landingSpots = [];
    
    if (!pegs.length) return; // Guard against empty pegs array
    
    // Get the pegs in the final row using the row property
    const lastRowIndex = currentRows - 1;
    const pegsInLastRow = pegs.filter(peg => peg.row === lastRowIndex)
                             .sort((a, b) => a.x - b.x);
    
    if (!pegsInLastRow.length) return; // Guard against empty last row
    
    // Calculate landing spot positions after the final row
    const landingY = pegsInLastRow[0].y + (PEG_SPACING * 0.6); // Position buckets closer to pegs
    
    // Create landing spots between each x position of final row pegs
    for (let i = 0; i < pegsInLastRow.length - 1; i++) {
        const leftPeg = pegsInLastRow[i];
        const rightPeg = pegsInLastRow[i + 1];
        const centerX = (leftPeg.x + rightPeg.x) / 2;
        
        landingSpots.push({
            x: centerX,
            y: landingY,
            width: PEG_SPACING * 0.8,
            multiplier: MULTIPLIERS[i]
        });
    }
}

function dropBall() {
    if (!canDrop || currentBet > balance || isChangingRows) return;
    
    balance -= currentBet;
    updateBalance();
    
    // Always drop from middle peg in top row
    const firstRowPegs = pegs.filter(peg => peg.y === CANVAS_PADDING + PEG_SPACING);
    const middlePeg = firstRowPegs[1]; // Index 1 is the middle peg since first row has 3 pegs
    
    const ball = {
        x: middlePeg.x,
        y: CANVAS_PADDING,
        radius: BALL_RADIUS,
        velocity: { x: 0, y: 0 },
        active: true
    };
    
    balls.push(ball);
}

function updateBalance() {
    document.getElementById('balance').textContent = balance.toFixed(2);
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw pegs with glow
    pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#fff';
        ctx.fill();
    });
    ctx.shadowBlur = 0;
    
    // Draw landing spots
    landingSpots.forEach(spot => {
        // Draw landing spot background with glow
        ctx.fillStyle = COLORS[spot.multiplier.toString()];
        ctx.shadowColor = COLORS[spot.multiplier.toString()];
        ctx.shadowBlur = 10;
        // Draw landing spot as a shorter rectangle
        const width = spot.width;
        const height = PEG_SPACING * 0.4; // Make buckets thicker
        const x = spot.x - width/2;
        const y = spot.y - height/2;
        
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, height * 0.3); // More rounded corners
        
        ctx.closePath();
        
        // Add a glow effect
        ctx.shadowBlur = 15;
        ctx.fill();
        
        // Reset shadow for text
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        // Make text more prominent
        const fontSize = Math.min(Math.max(spot.width * 0.3, 14), 24);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(spot.multiplier + 'x', spot.x, spot.y);
    });
    
    // Update and draw balls
    balls.forEach((ball, index) => {
        if (!ball.active) return;
        
        // Apply gravity (scaled to base size)
        ball.velocity.y += 0.08 * (PEG_SPACING / BASE_PEG_SPACING);
        
        // Apply horizontal dampening
        ball.velocity.x *= 0.99;
        
        // Update position
        ball.x += ball.velocity.x;
        ball.y += ball.velocity.y;
        
        // Check for collisions with pegs
        pegs.forEach(peg => {
            const dx = ball.x - peg.x;
            const dy = ball.y - peg.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ball.radius + peg.radius) {
                // Calculate collision response
                const angle = Math.atan2(dy, dx);
                const speed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
                
                ball.velocity.x = Math.cos(angle) * speed * 0.4; // Reduce bounce coefficient
                ball.velocity.y = Math.sin(angle) * speed * 0.4;
                
                // Reduce random bounce factor
                ball.velocity.x += (Math.random() - 0.5) * (PEG_SPACING * 0.015);
            }
        });
        
        // Check for wall collisions
        if (ball.x < ball.radius) {
            ball.x = ball.radius;
            ball.velocity.x *= -0.4;
        } else if (ball.x > canvas.width - ball.radius) {
            ball.x = canvas.width - ball.radius;
            ball.velocity.x *= -0.4;
        }
        
        // Check for landing
        if (ball.y > landingSpots[0].y - ball.radius) {
            ball.active = false;
            
            // Find which spot it landed in based on x position
            const spot = landingSpots.find(spot => {
                const dx = Math.abs(ball.x - spot.x);
                return dx <= spot.width/2;
            });
            
            if (spot) {
                const winAmount = currentBet * spot.multiplier;
                balance += winAmount;
                updateBalance();
            }
            
            // Remove ball
            setTimeout(() => {
                balls.splice(index, 1);
            }, 1000);
        }
        
        // Update ball trail
        if (!ballTrails[index]) {
            ballTrails[index] = [];
        }
        ballTrails[index].unshift({ x: ball.x, y: ball.y });
        if (ballTrails[index].length > TRAIL_LENGTH) {
            ballTrails[index].pop();
        }
        
        // Draw ball trail
        ballTrails[index].forEach((pos, i) => {
            const opacity = 0.8 - (i * TRAIL_OPACITY_STEP);
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, ball.radius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.fill();
        });
        
        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.shadowBlur = 0;
    });
    
    animationId = requestAnimationFrame(animate);
}
