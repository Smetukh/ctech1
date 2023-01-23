import { setNodeHighlighting } from './highlight';
import { STEP1, STEP2 } from './constants';
import { moveTool } from './playerTools';

export default class State {
  constructor() {
    this.blocks = {};
    this.room = {};
    this.cabinets = {};
    this.selection = '';
    this.selectedCabId = '';
    this.listeners = [];
    this.initialized = false;
    this.snap = true;
    this.openingPath = '';
  }

  changeStage(stage) {
    if (stage === STEP1) {
      window.poolApi.showAndHide('blocks');
      moveTool.enabled = true;
    } else if (stage === STEP2) {
      window.poolApi.showAndHide();
      moveTool.enabled = false;
    } else {
      console.error('Unknown step');
    }
  }

  getRoom() {
    return this.room;
  }

  getSelection() {
    return this.selection;
  }

  clearSelection(notifySelectionChanged = false) {
    if (this.selection) {
      const block = this.blocks[this.selection];
      setNodeHighlighting(block.meshId, false);
      if (block.items) {
        block.items.forEach((id) => setNodeHighlighting(id, false, true));
      }
    } else if (this.selectedCabId) {
      if (this.cart === undefined) {
        const cab = this.cabinets[this.selectedCabId];
        setNodeHighlighting(cab.id, false, true);
      } else {
        const cart = this.cart;
        setNodeHighlighting(cart.id, false, true);
      }
    }
    this.selection = '';
    this.selectedCabId = '';
    this.selectedCartId = '';
    if (notifySelectionChanged) {
      this.notifySelectionChanged();
    }
  }

  notifySelectionChanged() {
    if (this.listeners.length)
      this.listeners.forEach((fn) =>
        fn.call(null, this.selection, this.selectedCabId, this.openingPath)
      );
  }

  selectItem(nodeId, cabId, openingPath) {
    if (nodeId !== null) {
      if (
        this.selection === nodeId &&
        this.selectedCabId === cabId &&
        this.openingPath === openingPath
      )
        return;

      this.clearSelection();

      const block = this.blocks[nodeId];
      this.selection = nodeId;
      this.selectedCabId = cabId;
      this.openingPath = openingPath;
      setNodeHighlighting(block.meshId, true);
      // if (cabId) setNodeHighlighting(cabId, true, true);

      this.notifySelectionChanged();
    }
    else {
      if (this.selectedCabId === cabId && this.openingPath === openingPath) return;

      this.clearSelection();
      if (this.cart === undefined) {
        const cab = this.cabinets[cabId];
        this.selectedCabId = cab.id;
      } else {
        const cart = this.cart;
        this.selectedCabId = cart.id;
      }
      this.openingPath = openingPath;

      this.notifySelectionChanged();
    }
  }

  getBlocks() {
    return Object.values(this.blocks);
  }

  getBlock(blockId) {
    return this.blocks[blockId];
  }

  getBlockIds() {
    return Object.keys(this.blocks);
  }

  getUpdatedBlocks() {
    return Object.values(this.blocks).filter((block) => block.updated);
  }

  getCabinets() {
    return this.cabinets;
  }

  getCabinet(cabinetId) {
    return this.cabinets[cabinetId];
  }

  addWall(wall) {
    this.room = { ...this.room, [wall.getLocation()]: wall };
  }

  addFloor(floor) {
    this.room = { ...this.room, FLOOR: floor };
  }

  getFloor() {
    return this.room.FLOOR;
  }

  getWall(location) {
    return this.room[location];
  }

  getWalls() {
    return [this.room.LEFT, this.room.FRONT, this.room.RIGHT, this.room.BACK];
  }

  setRoomDimensions(width, length) {
    this.room = { ...this.room, width, length };
  }

  setInitialized(initialized = true) {
    this.initialized = initialized;
  }

  isInitialized() {
    return this.initialized;
  }

  addBlock(block) {
    if (!this.room[block.location])
      throw new Error(`Invalid location ${block.location}`);
    if (this.blocks[block.nodeId])
      throw new Error(`Block ${block.nodeId} already exists.`);
    this.blocks = { ...this.blocks, [block.nodeId]: block };
    this.room[block.location].addBlock(block.nodeId);
  }

  checkCollision(exclude) {
    this.getBlocks().forEach((block) => {
      block.checkCollision(exclude);
    });
  }

  checkAdjacency() {
    this.getBlocks().forEach((block) => {
      block.checkAdjacency();
    });
  }

  removeCabinet(cabinetId) {
    const cabinet = this.cabinets[cabinetId];
    if (!cabinet) throw new Error(`Invalid cabinetId ${cabinetId}`);
    cabinet.destroy();
    delete this.cabinets[cabinetId];
    window.poolApi.removeObjectsPool(cabinetId);
  }

  removeBlock(blockId) {
    const block = this.blocks[blockId];
    if (!block) throw new Error(`Invalid blockId ${blockId}`);
    if (!this.room[block.location])
      throw new Error(
        `Block ${blockId} has invalid location ${block.location}`
      );
    this.room[block.location].removeBlock(blockId);
    block.items.forEach((cabinetId) => {
      this.removeCabinet(cabinetId);
    });
    block.remove();
    delete this.blocks[blockId];
  }
}
