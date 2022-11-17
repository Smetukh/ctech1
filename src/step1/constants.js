const WALL_CONSTANTS = {
  LOCATIONS: {
    RIGHT: { NODE_NAME: 'WALL_RIGHT', NODE_WALL_CHILD: 'WALL_RIGHT_CHILD', AXIS: 'z', CAMERA: 'Camera_Right' },
    FRONT: { NODE_NAME: 'WALL_FRONT', NODE_WALL_CHILD: 'WALL_FRONT_CHILD', AXIS: 'x', CAMERA: 'Camera_Front' },
    BACK: { NODE_NAME: 'WALL_BACK', NODE_WALL_CHILD: 'WALL_BACK_CHILD', AXIS: 'x', CAMERA: 'Camera_Back' },
    LEFT: { NODE_NAME: 'WALL_LEFT', NODE_WALL_CHILD: 'WALL_LEFT_CHILD', AXIS: 'z', CAMERA: 'Camera_Left' },
  },
  DIMENSIONS: {
    HEIGHT: 2,
    WIDTH: 2,
  },
  MESH_NAME: 'WALL',
  SEQUENCE: ['LEFT', 'FRONT', 'RIGHT', 'BACK', 'LEFT'],
};
const FLOOR_CONSTANTS = {
  MESH_NAME: 'FLOOR',
  DIMENSIONS: {
    DEPTH: 2,
    WIDTH: 2,
  },
  UV_SCALE: 0.3048,
};

const BLOCK_CONSTANTS = {
  MESH_NAME: 'Block',
  INITIAL_SIZE: {
    width: 2,
    length: 2,
    mainThickness: 0.5,
    legThickness: 0.5,
    height: 0.95885,
  },
  Y_OFFSET: {
    Base: 0,
    Closet: 0,
    Wall: 60,
    Overhead: 60,
  },
};
const SNAP_THRESHOLD = 0.15;
const SNAP_OFFSET = 0.001;
const ADJACENCY_THRESHOLD = 0.01;
const WALL_REGEX = /^wall-.*/;
const SELECTION_COLOR = '#dedede';
const DOOR_OFFSET = {
  default: 36,
  Overhead: 16,
};

const STEP1 = 1;
const STEP2 = 2;

export {
  WALL_CONSTANTS,
  FLOOR_CONSTANTS,
  BLOCK_CONSTANTS,
  SELECTION_COLOR,
  SNAP_THRESHOLD,
  SNAP_OFFSET,
  WALL_REGEX,
  ADJACENCY_THRESHOLD,
  DOOR_OFFSET,
  STEP1,
  STEP2,
};
