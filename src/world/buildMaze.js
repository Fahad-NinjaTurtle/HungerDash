import { MAZE_LAYOUT } from "./mazeData.js";
import { createWall } from "./createWall.js";

export function buildMaze(scene, options = {}) {
  const {
    cellSize = 2,
    wallHeight = 2,
    mazeData = null, // Use provided maze data or fallback to MAZE_LAYOUT
  } = options;

  const walls = [];
  const layout = mazeData || MAZE_LAYOUT;

  for (let z = 0; z < layout.length; z++) {
    for (let x = 0; x < layout[z].length; x++) {
      if (layout[z][x] === 1) {
        const wall = createWall(cellSize, wallHeight);
        wall.position.x = x * cellSize;
        wall.position.z = z * cellSize;

        scene.add(wall);
        walls.push(wall);
      }
    }
  }

  return walls;
}
