// Import NativeBridge
import { NativeBridge } from "./scripts/Modules.js";

// DOM elements
const menuScreen = document.getElementById("menuScreen");
const gameScreen = document.getElementById("gameScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const menuBtn = document.getElementById("menuBtn");
const restartBtn = document.getElementById("restartBtn");
const menuBtn2 = document.getElementById("menuBtn2");
const coinCounterDisplay = document.getElementById("coinCounter");
const finalScoreDisplay = document.getElementById("finalScore");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Set canvas dimensions
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Game variables
let gameState = "menu"; // "menu", "playing", "gameOver"
let bird = { x: 50, y: canvas.height / 2, width: 30, height: 30, vy: 0 };
const gravity = 0.6;
const flapStrength = -10;
let pipes = [];
const pipeWidth = 60;
const pipeGap = 150;
let frameCount = 0;
let coins = [];
const coinSize = 20;
let coinCount = 0;
let animationFrameId = null;

// Use native getDarkTheme to adjust background color
function setGameBackground() {
  const isDark = NativeBridge.sys.getDarkTheme ? NativeBridge.sys.getDarkTheme() : false;
  gameScreen.style.backgroundColor = isDark ? "#000" : "#87CEEB";
}
setGameBackground();

// Utility: Show specific screen
function showScreen(screen) {
  [menuScreen, gameScreen, gameOverScreen].forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
}

// Reset game state
function resetGame() {
  bird = { x: 50, y: canvas.height / 2, width: 30, height: 30, vy: 0 };
  pipes = [];
  coins = [];
  coinCount = 0;
  frameCount = 0;
  coinCounterDisplay.textContent = "Coins: 0";
  gameState = "playing";
  setGameBackground();
}

// Create new pipe pair and a coin in the gap
function createPipeAndCoin() {
  const topHeight = Math.random() * (canvas.height - pipeGap - 100) + 50;
  pipes.push({
    x: canvas.width,
    topHeight,
    bottomY: topHeight + pipeGap
  });
  // Place a coin in the middle of the gap (with a little random offset)
  const coinY = topHeight + pipeGap / 2 + (Math.random() * 20 - 10);
  coins.push({
    x: canvas.width + pipeWidth / 2,
    y: coinY,
    size: coinSize,
    collected: false
  });
}

// Drawing functions
function drawBird() {
  ctx.fillStyle = "yellow";
  ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
}

function drawPipes() {
  ctx.fillStyle = "green";
  pipes.forEach(pipe => {
    // Draw top pipe
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
    // Draw bottom pipe
    ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);
  });
}

function drawCoins() {
  ctx.fillStyle = "gold";
  coins.forEach(coin => {
    if (!coin.collected) {
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, coin.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// Simple rectangle collision
function rectsIntersect(r1, r2) {
  return !(r2.x > r1.x + r1.width ||
           r2.x + r2.width < r1.x ||
           r2.y > r1.y + r1.height ||
           r2.y + r2.height < r1.y);
}

// Update game objects
function update() {
  if (gameState !== "playing") return;

  bird.vy += gravity;
  // Cap the maximum falling speed (you can adjust this value)
  bird.vy = Math.min(bird.vy, 10);
  bird.y += bird.vy;
  

  // Spawn new pipe and coin every 100 frames
  if (frameCount % 100 === 0) {
    createPipeAndCoin();
  }

  // Move pipes and coins to the left
  pipes.forEach(pipe => pipe.x -= 3);
  coins.forEach(coin => coin.x -= 3);

  // Remove off-screen objects
  pipes = pipes.filter(pipe => pipe.x + pipeWidth > 0);
  coins = coins.filter(coin => coin.x + coin.size > 0);

  // Check for collisions with pipes or boundaries
  if (bird.y + bird.height > canvas.height || bird.y < 0 ||
      pipes.some(pipe =>
        bird.x < pipe.x + pipeWidth &&
        bird.x + bird.width > pipe.x &&
        (bird.y < pipe.topHeight || bird.y + bird.height > pipe.bottomY)
      )) {
    triggerGameOver();
    return;
  }

  // Check for coin collection (approximate with rectangle collision)
  coins.forEach(coin => {
    if (!coin.collected) {
      const coinRect = { x: coin.x - coin.size / 2, y: coin.y - coin.size / 2, width: coin.size, height: coin.size };
      if (rectsIntersect(bird, coinRect)) {
        coin.collected = true;
        coinCount++;
        coinCounterDisplay.textContent = "Coins: " + coinCount;
        // Vibrate on coin collection
        try {
          NativeBridge.sensors.vibrate(50);
        } catch (e) {
          console.warn("vibrate error: ", e);
        }
      }
    }
  });

  frameCount++;
}

// Render game objects
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBird();
  drawPipes();
  drawCoins();
}

// Main game loop
function gameLoop() {
  update();
  draw();
  if (gameState === "playing") {
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

// End game and show Game Over screen
function triggerGameOver() {
  gameState = "gameOver";
  // Vibrate to indicate collision/game over
  try {
    NativeBridge.sensors.vibrate(200);
  } catch (e) {
    console.warn("vibrate error: ", e);
  }
  cancelAnimationFrame(animationFrameId);
  finalScoreDisplay.textContent = "Coins collected: " + coinCount;
  showScreen(gameOverScreen);
}

// Event Listeners for UI buttons
startBtn.addEventListener("click", () => {
  resetGame();
  showScreen(gameScreen);
  gameLoop();
});
resetBtn.addEventListener("click", () => {
  cancelAnimationFrame(animationFrameId);
  resetGame();
  gameLoop();
});
menuBtn.addEventListener("click", () => {
  cancelAnimationFrame(animationFrameId);
  showScreen(menuScreen);
});
restartBtn.addEventListener("click", () => {
  resetGame();
  showScreen(gameScreen);
  gameLoop();
});
menuBtn2.addEventListener("click", () => {
  cancelAnimationFrame(animationFrameId);
  showScreen(menuScreen);
});

// Allow bird to flap when game screen is clicked/tapped
gameScreen.addEventListener("click", () => {
  if (gameState === "playing") {
    bird.vy = flapStrength;
    // Vibrate on flap
    try {
      NativeBridge.sensors.vibrate(50);
    } catch (e) {
      console.warn("vibrate error: ", e);
    }
  }
});
