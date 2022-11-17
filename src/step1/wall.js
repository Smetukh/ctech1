import { WALL_CONSTANTS, SNAP_OFFSET, ADJACENCY_THRESHOLD } from './constants';
import { INCH_TO_M } from '../constants';
import { getRootNode, getAssetInstanceId } from '../helper';

export default class Wall {
  constructor(location, width, length, height) {
    this.location = location;
    this.axis = WALL_CONSTANTS.LOCATIONS[this.location].AXIS;
    this.dimensions = this.findDimensions(width, length, height);
    this.map = { Top: [], Bottom: [] };
    this.blocks = new Set();
    this.nodeId = this.findNodeId();
    this.cameraNull = window.api.scene.findNode({
      from: getRootNode(window.api),
      name: `${location}_Cam_Null`,
    });
    this.instanceId = '';
    this.meshId = '';
    this.scale = null;
    this.plane = null;
    this.initialized = false;
    this.prev =
      WALL_CONSTANTS.SEQUENCE[
        WALL_CONSTANTS.SEQUENCE.lastIndexOf(location) - 1
      ];
    this.next =
      WALL_CONSTANTS.SEQUENCE[WALL_CONSTANTS.SEQUENCE.indexOf(location) + 1];
  }

  findDimensions(width, length, height) {
    return {
      width: this.axis === 'x' ? width : length,
      distance: this.axis === 'x' ? length : width,
      height: height || WALL_CONSTANTS.DIMENSIONS.HEIGHT / INCH_TO_M,
    };
  }

  findNodeId() {
    return window.api.scene.findNode({
      from: getRootNode(window.api),
      name: WALL_CONSTANTS.LOCATIONS[this.location].NODE_NAME,
    });
  }

  async init() {
    this.instanceId = await getAssetInstanceId(window.api, this.nodeId);
    this.meshId = window.api.scene.findNode({
      from: this.instanceId,
      name: WALL_CONSTANTS.MESH_NAME,
    });
    this.update();
    this.initialized = true;
    return Promise.resolve();
  }

  update({ width, length, height } = {}) {
    if (width) {
      if (this.axis === 'x') this.dimensions.width = width;
      else this.dimensions.distance = width;
    }

    if (length) {
      if (this.axis === 'x') this.dimensions.distance = length;
      else this.dimensions.width = length;
    }
    if (height) this.dimensions.height = height;
    this.startPos = (-this.dimensions.width / 2) * INCH_TO_M;
    this.endPos = (this.dimensions.width / 2) * INCH_TO_M;
    const distanceM = this.dimensions.distance * INCH_TO_M;
    // Set the sign to be above the wall
    const signId = window.api.scene.findNode({
      from: this.nodeId,
      name: 'Sign',
    });
    if (signId)
      window.api.scene.set(
        {
          id: signId,
          plug: 'Transform',
          property: 'translation',
        },
        { x: 0, y: this.dimensions.height * INCH_TO_M + 0.25, z: 0 }
      );

    if (!this.scale)
      this.scale = window.api.scene.get({
        id: this.meshId,
        plug: 'Transform',
        property: 'scale',
      });
    const { scale } = this;
    const xStretch =
      (this.dimensions.width * INCH_TO_M - WALL_CONSTANTS.DIMENSIONS.WIDTH) /
      2 /
      scale.x;
    const yScale =
      scale.y +
      (scale.y *
        (this.dimensions.height * INCH_TO_M -
          WALL_CONSTANTS.DIMENSIONS.HEIGHT)) /
        WALL_CONSTANTS.DIMENSIONS.HEIGHT;

    const translation = { x: 0, y: 0, z: 0 };
    const { THREE } = window.api;
    switch (this.location) {
      case 'LEFT':
        translation.x = -distanceM / 2;
        this.plane = new THREE.Plane(
          new THREE.Vector3(1, 0, 0),
          -translation.x
        );
        this.direction = -1;
        break;
      case 'RIGHT':
        translation.x = distanceM / 2;
        this.plane = new THREE.Plane(
          new THREE.Vector3(1, 0, 0),
          -translation.x
        );
        this.direction = 1;
        break;
      case 'FRONT':
        translation.z = -distanceM / 2;
        this.plane = new THREE.Plane(
          new THREE.Vector3(0, 0, 1),
          -translation.z
        );
        this.direction = 1;
        break;
      case 'BACK':
        translation.z = distanceM / 2;
        this.plane = new THREE.Plane(
          new THREE.Vector3(0, 0, 1),
          -translation.z
        );
        this.direction = -1;
        break;
    }
    this.position = translation;
    window.api.scene.set(
      {
        id: this.meshId,
        plug: 'PolyMesh',
        operatorIndex: 1,
        property: 'stretchDistance',
      },
      xStretch
    );
    window.api.scene.set(
      {
        id: this.meshId,
        plug: 'Transform',
        property: 'scale',
      },
      { ...scale, y: yScale }
    );
    window.api.scene.set(
      {
        id: this.nodeId,
        plug: 'Transform',
        property: 'translation',
      },
      translation
    );

    // stretch visible child wall width to the size of parents width
    const wallChildScale = { x: this.endPos * 1.01, y: (100 * yScale), z: 1 };     
    const wallChild = window.api.scene.findNode({
      from: this.nodeId,
      name: WALL_CONSTANTS.LOCATIONS[this.location].NODE_WALL_CHILD,
    });
    window.api.scene.set(
      {
        id: wallChild,
        plug: 'Transform',
        property: 'scale'
      },
      wallChildScale
    );    
  }

  getMap(row) {
    return this.map[row];
  }

  getNext() {
    return this.next;
  }

  getPrevious() {
    return this.prev;
  }

  occupy(blockId, startPos, endPos, layout) {
    const block = window.state.getBlock(blockId);
    const maps = block.getRow().map((row) => this.map[row]);
    for (const map of maps) {
      const index = map.findIndex((item) => item.blockId === blockId);
      if (index !== -1) continue;
      const occupied = {
        blockId: block.nodeId,
        startPos: startPos || block.position + block.startPos,
        endPos: endPos || block.position + block.endPos,
        layout: layout || block.layout,
      };
      map.push(occupied);
    }
  }

  vacate(blockId) {
    const block = window.state.getBlock(blockId);
    const maps = block.getRow().map((row) => this.map[row]);
    for (const map of maps) {
      const index = map.findIndex((item) => item.blockId === blockId);
      if (index !== -1) {
        map.splice(index, 1);
      }
    }
  }

  addBlock(blockId) {
    if (this.blocks.has(blockId))
      throw new Error(
        `Can't add blockId ${blockId} to location ${this.location}. It already exists.`
      );
    this.blocks.add(blockId);
  }

  removeBlock(blockId) {
    if (!this.blocks.delete(blockId))
      throw new Error(
        `Block ${blockId} was not present on location ${this.location}`
      );
  }

  checkAdjacency(blockId) {
    const block = window.state.getBlock(blockId);
    const maps = block.getRow().map((row) => this.map[row]);
    const blockItem = maps[0].find((item) => item.blockId === blockId);
    for (const map of maps) {
      const leftAdjacency = map.filter(
        (item) =>
          item.blockId !== blockId &&
          Math.abs(blockItem.startPos - item.endPos) <= ADJACENCY_THRESHOLD &&
          blockItem.startPos - item.endPos <= ADJACENCY_THRESHOLD &&
          !window.state.getBlock(item.blockId).isColliding()
      );
      const rightAdjacency = map.filter((item) => {
        return (
          item.blockId !== blockId &&
          Math.abs(item.startPos - blockItem.endPos) <= ADJACENCY_THRESHOLD &&
          item.startPos - blockItem.endPos <= ADJACENCY_THRESHOLD &&
          !window.state.getBlock(item.blockId).isColliding()
        );
      });
      leftAdjacency.forEach((item) => {
        block.setAdjacent('left', item.blockId);
        window.state.getBlock(item.blockId).setAdjacent('right', blockId);
      });
      rightAdjacency.forEach((item) => {
        block.setAdjacent('right', item.blockId);
        window.state.getBlock(item.blockId).setAdjacent('left', blockId);
      });
    }
  }

  getBlocks() {
    return [...this.blocks];
  }

  getLocation() {
    return this.location;
  }

  getInstanceId() {
    return this.instanceId;
  }

  getPlane() {
    return this.plane;
  }

  getAxis() {
    return this.axis;
  }

  getBoundaries() {
    return {
      startPos: this.startPos,
      endPos: this.endPos,
      direction: this.direction,
    };
  }

  frame() {
    // const sceneCamera = window.api.player.cameraController.getActiveCamera();
    api.setActiveCamera(
      api.scene.findNode({
        from: api.scene.findNode('Objects'),
        name: WALL_CONSTANTS.LOCATIONS[this.location].CAMERA,
      })
    );
    api.player.cameraController.restoreInitialCameraState();
    window.state.lookAt = this.location;
    // Change the target null back to center
    window.api.scene.set(
      {
        id: this.cameraNull,
        plug: 'Transform',
        property: 'translation',
      },
      { x: 0, y: 1, z: 0 }
    );
  }

  toObject() {
    return {
      dimensions: this.dimensions,
      map: this.map,
      blocks: this.getBlocks(),
      location: this.location,
    };
  }
}
