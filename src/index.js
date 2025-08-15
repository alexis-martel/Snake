/*
Snake
Copyright (C) 2024  Alexis Andrew Martel

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or any
later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

"use strict";

let game;

// Listen for new-game-form submit
document.getElementById("new-game-form").onsubmit = () => {
  game = new Game({
    width: document.getElementById("screen-width").value,
    height: document.getElementById("screen-height").value,
    frameDelay:
      ((100 - document.getElementById("game-speed").value) / 100) * 250,
    props: {
      snakeLength: document.getElementById("starting-length").value,
      appleAmount: document.getElementById("amount-of-apples").value,
      appleLengthBonus: document.getElementById("apple-length-bonus").value,
      player1ControlScheme: document.getElementById("snake1-control-scheme")
        .value,
    },
  });
  // Start the game
  game.start();
};

const controlSchemes = {
  UDLR: {
    up: "ArrowUp",
    left: "ArrowLeft",
    down: "ArrowDown",
    right: "ArrowRight",
  },
  WASD: {
    up: "w",
    left: "a",
    down: "s",
    right: "d",
  },
  IJKL: {
    up: "i",
    left: "j",
    down: "k",
    right: "l",
  },
  HJKL: {
    up: "k",
    left: "h",
    down: "j",
    right: "l",
  },
};

class Game {
  constructor({ width, height, frameDelay, props }) {
    // Canvas and graphics
    this.canvas = document.getElementById("game-view");
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext("2d");
    // Game variables
    this.snakes = []; // Indexed by player ("Player One" -> [0], etc.)
    this.apples = []; // All onscreen apples
    this.balls = []; // All onscreen balls
    this.pixels = []; // All active pixels (see the `Pixel` class)
    // Properties
    this.props = props;
    this.frameDelay = frameDelay;
    this.draw = this.draw.bind(this); // Since draw is called from setInterval, set its context to Game
  }
  start() {
    this.canvas.focus();
    // Keyboard controls
    document.onkeydown = (e) => {
      e.preventDefault();
      this.canvas.focus();
      for (const snake of this.snakes) {
        if (e.key === snake.controlScheme.up) {
          snake.goUp();
        } else if (e.key === snake.controlScheme.down) {
          snake.goDown();
        } else if (e.key === snake.controlScheme.left) {
          snake.goLeft();
        } else if (e.key === snake.controlScheme.right) {
          snake.goRight();
        }
      }
    };
    // Button controls
    const upIds = ["p1-go-up"];
    const downIds = ["p1-go-down"];
    const leftIds = ["p1-go-left"];
    const rightIds = ["p1-go-right"];
    for (const [i, id] of upIds.entries()) {
      document.getElementById(id).onclick = () => {
        this.snakes[i].goUp();
      };
    }
    for (const [i, id] of downIds.entries()) {
      document.getElementById(id).onclick = () => {
        this.snakes[i].goDown();
      };
    }
    for (const [i, id] of leftIds.entries()) {
      document.getElementById(id).onclick = () => {
        this.snakes[i].goLeft();
      };
    }
    for (const [i, id] of rightIds.entries()) {
      document.getElementById(id).onclick = () => {
        this.snakes[i].goRight();
      };
    }
    // Pause button
    document.getElementById("pause").onclick = () => {
      this.pause();
    };
    // Create initial instances
    console.log(this.props.player1ControlScheme);
    console.log(controlSchemes[this.props.player1ControlScheme]);
    this.snakes.push(
      new Snake({
        x: 1,
        y: 1,
        direction: "Right",
        length: this.props.snakeLength,
        controlScheme: controlSchemes[this.props.player1ControlScheme],
      })
    );
    for (let i = 0; i < this.props.appleAmount; i++) {
      this.apples.push(
        new Apple({
          x: Math.floor(Math.random() * this.canvas.width),
          y: Math.floor(Math.random() * this.canvas.height),
          lengthBonus: this.props.appleLengthBonus,
        })
      );
    }
    this.hud = new StatsHUD();
    // Enter main game loop
    this.running = true;
    this.loop = setInterval(this.draw, this.frameDelay);
  }
  pause() {
    window.alert("Game paused");
  }
  pushPixel(pixels) {
    this.pixels.push(pixels);
  }
  killApple(apple) {
    for (const [index, item] of this.apples.entries()) {
      if (item === apple) {
        // Remove the apple from game array
        this.apples.splice(index, 1);
      }
    }
  }
  draw() {
    // Update game objects
    this.pixels = []; // Clear pixels array for new frame
    for (const apple of this.apples) {
      apple.update(this);
    }
    for (const snake of this.snakes) {
      snake.update(this);
    }
    // Check if game is over before drawing changes
    if (!this.running) {
      // Freeze the game
      clearInterval(this.loop);
      if (
        window.confirm(
          `Game Over!\nYou scored ${this.snakes[0].length}.\nDo you want to start a new game?`
        )
      ) {
        window.location.reload();
      }
      return;
    }
    // Frame logic
    let missingApples = this.props.appleAmount - this.apples.length;
    for (let i = 0; i < missingApples; i++) {
      this.apples.push(
        new Apple({
          x: Math.floor(Math.random() * this.canvas.width),
          y: Math.floor(Math.random() * this.canvas.height),
          lengthBonus: 2,
        })
      );
    }
    // Draw game objects
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear screen
    for (const apple of this.apples) {
      apple.draw(this.ctx);
    }
    for (const snake of this.snakes) {
      snake.draw(this.ctx);
    }
    this.hud.update(this);
  }
}

class Pixel {
  constructor({ x, y, type, parent }) {
    this.x = x;
    this.y = y;
    this.parent = parent; // The parent object of the pixel (i.e. an instance of `Snake`, `Apple`, `Ball`)
    this.type = type; // Designates the "type" of the pixel (i.e. "snake", "ball", "apple")
    if (!this.type) {
      console.warn("Pixel created without passing in type string.");
    }
  }
}

class Snake {
  constructor({ x, y, length, controlScheme, direction }) {
    // Snake properties
    this.x = x; // Head position x
    this.y = y; // Head position y
    this.direction = direction; // Direction the snake is facing (i.e. "Up", "Down", "Left", "Right")
    this.length = length; // Amount of body pixels, including the head
    this.remainingGrowth = 0; // The number of frames the snake should continue moving without popping its pixels array
    this.pixels = []; // Array of body pixels
    // Add starting length to pixels array
    if (this.direction === "Right") {
      for (let i = 0; i < this.length; i++) {
        this.pixels.push(
          new Pixel({
            x: this.x - i,
            y: this.y,
            type: "snake",
          })
        );
      }
    } else if (this.direction === "Left") {
      for (let i = 0; i < this.length; i++) {
        this.pixels.push(
          new Pixel({
            x: this.x + i,
            y: this.y,
            type: "snake",
          })
        );
      }
    } else if (this.direction === "Up") {
      for (let i = 0; i < this.length; i++) {
        this.pixels.push(
          new Pixel({
            x: this.x,
            y: this.y + i,
            type: "snake",
          })
        );
      }
    } else if (this.direction === "Down") {
      for (let i = 0; i < this.length; i++) {
        this.pixels.push(
          new Pixel({
            x: this.x,
            y: this.y - i,
            type: "snake",
          })
        );
      }
    }
    // Snake options
    this.controlScheme = controlScheme;
  }
  update(game) {
    this.currentDirection = this.direction; // Prevents snake from backing into itself due to frantic input
    // Move snake head forward
    if (this.direction === "Up") {
      this.y -= 1;
    } else if (this.direction === "Down") {
      this.y += 1;
    } else if (this.direction === "Left") {
      this.x -= 1;
    } else if (this.direction === "Right") {
      this.x += 1;
    }
    this.pixels.unshift(new Pixel({ x: this.x, y: this.y, type: "snake" }));
    // Add this snake's pixels to the game's pixel array
    for (const pixel of this.pixels.slice(0, this.pixels.length - 1)) {
      game.pushPixel(pixel);
    }
    // Check head collisions with apples
    if (
      game.pixels.filter(
        (pixel) =>
          pixel.type === "apple" && pixel.x === this.x && pixel.y === this.y
      ).length > 0
    ) {
      this.remainingGrowth += game.props.appleLengthBonus;
      // Kill the pixel's parent apple
      game.pixels
        .filter(
          (pixel) =>
            pixel.type === "apple" && pixel.x === this.x && pixel.y === this.y
        )[0]
        .parent.kill(game);
    }
    if (this.remainingGrowth === 0) {
      this.pixels.pop(); // Remove end of snake tail
    } else {
      this.remainingGrowth -= 1;
    }
    // Check head collisions with snakes
    if (
      game.pixels.filter(
        (pixel) =>
          pixel.type === "snake" && pixel.x === this.x && pixel.y === this.y
      ).length > 1
    ) {
      game.running = false;
    }
    // Check if head is out of bounds
    if (
      this.x > game.canvas.width - 1 ||
      this.y > game.canvas.height - 1 ||
      this.x < 0 ||
      this.y < 0
    ) {
      game.running = false;
    }
    // Calculate new length
    this.length = this.pixels.length;
  }
  draw(ctx) {
    // Draw snake on screen
    ctx.fillStyle = "rgb(0 255 0)";
    for (const pixel of this.pixels) {
      ctx.fillRect(pixel.x, pixel.y, 1, 1);
    }
  }
  goUp() {
    if (this.currentDirection !== "Down") {
      this.direction = "Up";
    }
  }
  goDown() {
    if (this.currentDirection !== "Up") {
      this.direction = "Down";
    }
  }
  goLeft() {
    if (this.currentDirection !== "Right") {
      this.direction = "Left";
    }
  }
  goRight() {
    if (this.currentDirection !== "Left") {
      this.direction = "Right";
    }
  }
  kill(game) {
    console.log(`game.snakes[${game.snakes.indexOf(this)}] died.`);
    game.running = false;
  }
}

class Apple {
  constructor({ x, y, lengthBonus }) {
    this.x = x;
    this.y = y;
    this.lenghtBonus = lengthBonus;
    this.pixels = [];
  }
  update(game) {
    // Add pixel to game pixels array
    this.pixels = [
      new Pixel({
        x: this.x,
        y: this.y,
        type: "apple",
        parent: this,
      }),
    ];
    for (const pixel of this.pixels) {
      game.pushPixel(pixel);
    }
  }
  draw(ctx) {
    // Draw apple on screen
    ctx.fillStyle = "rgb(255 0 0)";
    for (const pixel of this.pixels) {
      ctx.fillRect(pixel.x, pixel.y, 1, 1);
    }
  }
  kill(game) {
    // Removes the apple from its game's apples array
    game.killApple(this);
  }
}

class StatsHUD {
  constructor() {
    this.element = document.getElementById("stats-hud");
  }
  update(game) {
    this.element.textContent = `Score: ${game.snakes[0].length}`;
  }
}
