import Wall from './wall';
import Floor from './floor';
import { WALL_CONSTANTS } from './constants';

const initializeRoom = (width, length, height) => {
  const initPromises = [];
  for (const location in WALL_CONSTANTS.LOCATIONS) {
    const wall = new Wall(location, width, length, height);
    window.state.addWall(wall);
    initPromises.push(wall.init());
  }
  const floor = new Floor(width, length);
  floor.update();
  window.state.addFloor(floor);
  return Promise.all(initPromises).then(() => {
    window.state.setInitialized();
  });
};

const updateRoom = (width, length, height) => {
  Object.values(window.state.getRoom()).forEach((obj) => {
    obj.update({ width, length, height });
  });
};

window.updateRoom = updateRoom;
export { initializeRoom, updateRoom };
