/**
 * Procedural Maze Generator
 * Generates mazes of increasing complexity based on level
 */
export function generateMaze(level) {
  // Base size increases with level
  const baseSize = 7;
  const size = Math.min(baseSize + Math.floor(level * 1.5), 25); // Max 25x25
  
  // Create empty maze (1 = wall, 0 = path)
  const maze = Array(size).fill(null).map(() => Array(size).fill(1));
  
  // Simple maze generation algorithm (recursive backtracking simplified)
  // Start and end positions
  const startX = 1;
  const startZ = 1;
  const endX = size - 2;
  const endZ = size - 2;
  
  // Create paths using a simple algorithm
  // First, create a basic path from start to end
  createPath(maze, startX, startZ, endX, endZ, size);
  
  // Add some complexity based on level
  if (level > 1) {
    addComplexity(maze, size, level);
  }
  
  // Ensure start and end are clear
  maze[startZ][startX] = 0;
  maze[endZ][endX] = 0;
  
  return maze;
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

