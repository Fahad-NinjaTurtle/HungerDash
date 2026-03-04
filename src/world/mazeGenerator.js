/**
 * Procedural Maze Generator
 * Generates mazes of increasing complexity based on level
 */
export function generateMaze(level) {
  let size = Math.min(11 + level * 2, 41); // bigger, harder

  // Ensure odd size (required for backtracking)
  if (size % 2 === 0) size++;

  // Fill with walls
  const maze = Array(size).fill(null).map(() => Array(size).fill(1));

  carve(1, 1);

  function carve(x, z) {
    const dirs = shuffle([
      [2, 0],  // right
      [-2, 0], // left
      [0, 2],  // down
      [0, -2], // up
    ]);

    for (const [dx, dz] of dirs) {
      const nx = x + dx;
      const nz = z + dz;

      if (nx > 0 && nx < size - 1 && nz > 0 && nz < size - 1 && maze[nz][nx] === 1) {
        maze[z + dz / 2][x + dx / 2] = 0; // remove inner wall
        maze[nz][nx] = 0;                // carve cell
        carve(nx, nz);
      }
    }
  }

  // Ensure start + goal open
  maze[1][1] = 0;
  maze[size - 2][size - 2] = 0;

  return maze;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


function createPath(maze, startX, startZ, endX, endZ, size) {
  // Create a winding path from start to end
  let currentX = startX;
  let currentZ = startZ;
  
  // Clear start
  maze[currentZ][currentX] = 0;
  
  // Move towards end with some randomness
  while (currentX !== endX || currentZ !== endZ) {
    const directions = [];
    
    // Prefer moving towards end
    if (currentX < endX) directions.push({ x: 1, z: 0 });
    if (currentZ < endZ) directions.push({ x: 0, z: 1 });
    if (currentX > endX) directions.push({ x: -1, z: 0 });
    if (currentZ > endZ) directions.push({ x: 0, z: -1 });
    
    // Add some randomness
    if (Math.random() > 0.7) {
      directions.push({ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 });
    }
    
    // Shuffle and pick valid direction
    shuffleArray(directions);
    
    let moved = false;
    for (const dir of directions) {
      const newX = currentX + dir.x;
      const newZ = currentZ + dir.z;
      
      if (newX > 0 && newX < size - 1 && newZ > 0 && newZ < size - 1) {
        if (maze[newZ][newX] === 1 || (newX === endX && newZ === endZ)) {
          currentX = newX;
          currentZ = newZ;
          maze[currentZ][currentX] = 0;
          moved = true;
          break;
        }
      }
    }
    
    if (!moved) break; // Can't move further
  }
  
  // Ensure end is clear
  maze[endZ][endX] = 0;
}

function addComplexity(maze, size, level) {
  // Add more open areas and paths based on level
  const complexity = Math.min(level * 2, 15);
  
  for (let i = 0; i < complexity; i++) {
    const x = Math.floor(Math.random() * (size - 2)) + 1;
    const z = Math.floor(Math.random() * (size - 2)) + 1;
    
    // Create small open areas
    if (maze[z][x] === 1) {
      maze[z][x] = 0;
      // Sometimes create adjacent paths
      if (Math.random() > 0.5 && x + 1 < size - 1) maze[z][x + 1] = 0;
      if (Math.random() > 0.5 && z + 1 < size - 1) maze[z + 1][x] = 0;
    }
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

