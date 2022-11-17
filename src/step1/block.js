import { reparent, getAssetInstanceId, setEquals } from '../helper';
import { INCH_TO_M } from '../constants';
import {
  BLOCK_CONSTANTS,
  SNAP_THRESHOLD,
  SNAP_OFFSET,
  WALL_REGEX,
  ADJACENCY_THRESHOLD,
  DOOR_OFFSET,
} from './constants';
import { findMaterial } from '../materials';
import { Cabinet } from '../Component/Cabinet';

export default class Block {
  constructor(type, layout, location, dimensions, translations, data) {
    this.nodeId = '';
    this.blockId = '';
    this.cabsId = '';
    this.type = type;
    this.layout = layout;
    this.data = data;
    this.dimensions = this.findDimensions(dimensions);
    this.row = this.findRow();
    this.colliding = false;
    this.items = [];
    this.adjacency = { left: new Set(), right: new Set() };
    this.position =
      translations && translations.x ? translations.x * INCH_TO_M : 0;
    this.location = location;
    this.direction = 1;
    this.initialized = false;
    this.initialTranslation = {
      x: translations && translations.x ? translations.x * INCH_TO_M : 0,
      y:
        translations && translations.y
          ? translations.y * INCH_TO_M
          : BLOCK_CONSTANTS.Y_OFFSET[type] * INCH_TO_M,
      z:
        translations && translations.z
          ? translations.z * INCH_TO_M
          : SNAP_OFFSET,
    };
    this.moving = false;
    this.material = '';
    this.updated = true;
  }

  findDimensions(dimensions) {
    ['width', 'height', 'mainThickness'].forEach((key) => {
      if (!dimensions[key])
        throw new Error(
          `${key} is required in the dimensions object parameter.`
        );
    });
    if (this.layout !== 'Straight') {
      ['length', 'legThickness'].forEach((key) => {
        if (!dimensions[key])
          throw new Error(
            `${key} is required for corner pieces in the dimensions object parameter.`
          );
      });
      return {
        width: dimensions.width,
        height: dimensions.height,
        mainThickness: dimensions.mainThickness,
        length: dimensions.length,
        legThickness: dimensions.legThickness,
      };
    }
    return {
      width: dimensions.width,
      height: dimensions.height,
      mainThickness: dimensions.mainThickness,
    };
  }

  findRow() {
    return this.type === 'Closet'
      ? ['Top', 'Bottom']
      : this.type === 'Base'
      ? ['Bottom']
      : ['Top'];
  }

  getRow() {
    return this.row;
  }

  setColliding(bool) {
    this.colliding = bool;
  }

  isColliding() {
    return this.colliding;
  }

  isAdjacent() {
    return this.adjacency.left.size > 0 || this.adjacency.right.size > 0;
  }

  resetAdjacent() {
    const sides = Object.keys(this.adjacency);
    sides.forEach((side, idx) => {
      this.adjacency[side].forEach((blockId) => {
        if (!WALL_REGEX.test(blockId))
          window.state
            .getBlock(blockId)
            .removeAdjacent(sides[Math.abs(idx - 1)], this.nodeId);
      });
      this.adjacency[side].clear();
    });
  }

  setAdjacent(side, id) {
    this.adjacency[side].add(id);
    this.setMaterial();
  }

  removeAdjacent(side, id) {
    this.adjacency[side].delete(id);
    this.setMaterial();
  }

  exportTranslations() {
    return {
      x: this.position / INCH_TO_M,
      y: this.initialTranslation.y / INCH_TO_M,
      z: this.initialTranslation.z / INCH_TO_M,
    };
  }

  async init() {
    [this.nodeId, this.cabsId, this.blockId] = await Promise.all(
      [
        ['Block', 'Null'],
        ['Cabinets', 'Null'],
        [`${this.layout}`, 'Block'],
      ].map((args) => window.poolApi.getObject(...args))
    );
    this.instanceId = await getAssetInstanceId(window.api, this.blockId);

    const wall = window.state.getWall(this.location);

    reparent(window.api, wall.getInstanceId(), this.nodeId);
    reparent(window.api, this.nodeId, this.cabsId, this.blockId);

    window.api.scene.set(
      { id: this.nodeId, plug: 'Properties', property: 'visible' },
      true
    );
    window.api.scene.set(
      { id: this.cabsId, plug: 'Properties', property: 'visible' },
      true
    );
    this.meshId = window.api.scene.findNode({
      from: this.instanceId,
      name: BLOCK_CONSTANTS.MESH_NAME,
    });
    this.direction = wall.getBoundaries().direction;
    window.api.scene.set(
      {
        id: this.nodeId,
        plug: 'Transform',
        property: 'translation',
      },
      this.initialTranslation
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  async setLayout(layout, dimensions) {
    if (layout !== this.layout) {
      const blockId = await window.poolApi.getObject(`${layout}`, 'Block');

      window.poolApi.removeObject(this.blockId, this.layout);
      window.api.scene.set(
        { id: this.blockId, plug: 'Properties', property: 'visible' },
        false
      );

      this.layout = layout;
      this.blockId = blockId;
      this.instanceId = await getAssetInstanceId(window.api, this.blockId);
      this.meshId = window.api.scene.findNode({
        from: this.instanceId,
        name: BLOCK_CONSTANTS.MESH_NAME,
      });

      if (window.state.selection === this.nodeId)
        window.state.selectItem(this.nodeId);

      this.material = '';
      reparent(window.api, this.nodeId, this.blockId);
      await new Promise((resolve) => setTimeout(resolve, 50));
      this.update(dimensions);

      window.poolApi.showAndHide('blocks');
    }
  }

  async setCabinet(json, index) {
    const cabId = this.items[index];
    if (cabId) {
      const cabinet = window.state.cabinets[cabId];
      cabinet.reset(json);
      return cabinet;
    }
    const cabinet = new Cabinet();
    const id = await cabinet.init(json);
    window.state.cabinets[id] = cabinet;

    return cabinet;
  }

  async fetchObjects(blockJS = this.data) {
    if (!Array.isArray(blockJS))
      throw new Error(
        'Invalid cabinets data type or incorrect number of cabinets'
      );
    // * remove excess cabinets if new json has less cabinets
    if (this.items.length > blockJS.length) {
      this.items
        .slice(blockJS.length)
        .map((cabId) => window.state.removeCabinet(cabId));
    }
    const items = await Promise.all(
      blockJS.map(async (json, index) => {
        const cabinet = await this.setCabinet(json, index);
        await cabinet.fetchObjects();
        return cabinet.id;
      })
    );
    this.items = items;
    this.data = blockJS;

    return items;
  }

  async setCabinets(blockJS) {
    if (!Array.isArray(blockJS))
      throw new Error(
        'Invalid cabinets data type or incorrect number of cabinets'
      );
    if (this.items.length > blockJS.length) {
      this.items
        .slice(blockJS.length)
        .map((cabId) => window.state.removeCabinet(cabId));
    }
    const items = await Promise.all(
      blockJS.map(async (cabJSON, index) => {
        const cabinet = await this.setCabinet(cabJSON, index);
        return cabinet.build();
      })
    );
    reparent(window.api, this.cabsId, ...items);
    this.initialized = true;
    this.items = items;
    this.data = blockJS;

    if (blockJS.length === 1 || this.layout === 'Straight') {
      const totalLength = blockJS.reduce((acc, json) => {
        acc += json.width;
        return acc;
      }, 0);

      let xEnd = -totalLength / 2;
      window.api.scene.set(
        { id: this.cabsId, plug: 'Transform', property: 'translation' },
        { x: 0, y: 0, z: 0 }
      );

      xEnd += blockJS[0]?.radius.left ? 2 : 0;

      items.forEach((id, index) => {
        const x = xEnd + blockJS[index].frame.width / 2;
        xEnd += blockJS[index].frame.width;
        window.api.scene.set(
          { id, plug: 'Transform', property: 'translation' },
          { x: x * INCH_TO_M, y: 0, z: 0 }
        );
        window.api.scene.set(
          { id, plug: 'Transform', property: 'rotation' },
          { x: 0, y: 0, z: 0 }
        );
      });
    } else {
      let leftLength = 0;
      let extension;

      // Use number of width to check if corner started
      const cornerStartIndex = blockJS.findIndex((json) => {
        leftLength += json.frame.width;
        if (json.extensions && json.extensions.right.width > 0) {
          extension = json.extensions.right.width;
          leftLength += extension;
          return true;
        }
        return false;
      });
      if (blockJS.length > 0 && cornerStartIndex === -1) {
        throw new Error('Cannot find where corner starts');
      }

      if (this.layout === 'Left') {
        window.api.scene.set(
          { id: this.cabsId, plug: 'Transform', property: 'translation' },
          {
            x: (-this.dimensions.width / 2) * INCH_TO_M,
            y: 0,
            z: 0,
          }
        );

        let xEnd = 0;
        let zEnd = leftLength;
        items.forEach((id, index) => {
          let rotateY = 0;
          let x = xEnd;
          let z = zEnd;
          if (index <= cornerStartIndex) {
            rotateY = 90;
            z -= blockJS[index].frame.width / 2;
            zEnd -= blockJS[index].frame.width;
            state.cabinets[id].side = this.layout;
          } else {
            x += blockJS[index].frame.width / 2;
            xEnd += blockJS[index].frame.width;
          }
          window.api.scene.set(
            { id, plug: 'Transform', property: 'translation' },
            { x: x * INCH_TO_M, y: 0, z: z * INCH_TO_M }
          );
          window.api.scene.set(
            { id, plug: 'Transform', property: 'rotation' },
            { x: 0, y: rotateY, z: 0 }
          );
          if (index === cornerStartIndex) {
            xEnd += extension;
            zEnd -= extension;
          }
        });
      } else {
        window.api.scene.set(
          { id: this.cabsId, plug: 'Transform', property: 'translation' },
          {
            x: (this.dimensions.width / 2) * INCH_TO_M,
            y: 0,
            z: 0,
          }
        );

        let xEnd = -leftLength;
        let zEnd = 0;
        items.forEach((id, index) => {
          let rotateY = 0;
          let x = xEnd;
          let z = zEnd;
          if (index > cornerStartIndex) {
            rotateY = -90;
            z += blockJS[index].frame.width / 2;
            zEnd += blockJS[index].frame.width;
            state.cabinets[id].side = this.layout;
          } else {
            x += blockJS[index].frame.width / 2;
            xEnd += blockJS[index].frame.width;
          }
          window.api.scene.set(
            { id, plug: 'Transform', property: 'translation' },
            { x: x * INCH_TO_M, y: 0, z: z * INCH_TO_M }
          );
          window.api.scene.set(
            { id, plug: 'Transform', property: 'rotation' },
            { x: 0, y: rotateY, z: 0 }
          );
          if (index === cornerStartIndex) {
            xEnd += extension;
            zEnd += extension;
          }
        });
      }
    }

    this.updated = false;
    return items;
  }

  update({ width, length, height, mainThickness, legThickness } = {}) {
    const { MESH_NAME, INITIAL_SIZE } = BLOCK_CONSTANTS;
    if (width) this.dimensions.width = width;
    if (length) this.dimensions.length = length;
    if (height) this.dimensions.height = height;
    if (mainThickness) this.dimensions.mainThickness = mainThickness;
    if (legThickness) this.dimensions.legThickness = legThickness;
    this.updated = true;
    this.startPos = (-this.dimensions.width / 2) * INCH_TO_M;
    this.endPos = (this.dimensions.width / 2) * INCH_TO_M;
    const scale = window.api.scene.get({
      from: this.instanceId,
      name: MESH_NAME,
      plug: 'Transform',
      property: 'scale',
    });
    const direction = this.layout === 'Right' ? -1 : 1;
    const widthAdjust =
      (this.dimensions.width * INCH_TO_M - INITIAL_SIZE.width) * direction;
    const heightAdjust =
      this.dimensions.height * INCH_TO_M - INITIAL_SIZE.height;
    const mainThicknessAdjust =
      this.dimensions.mainThickness * INCH_TO_M - INITIAL_SIZE.mainThickness;
    // width
    window.api.scene.set(
      {
        from: this.instanceId,
        name: MESH_NAME,
        plug: 'PolyMesh',
        operatorIndex: 1,
        property: 'translation',
      },
      { x: widthAdjust / scale.x, y: 0, z: 0 }
    );
    // height
    window.api.scene.set(
      {
        from: this.instanceId,
        name: MESH_NAME,
        plug: 'PolyMesh',
        operatorIndex: 2,
        property: 'translation',
      },
      { x: 0, y: heightAdjust / scale.y, z: 0 }
    );
    // mainThickness
    window.api.scene.set(
      {
        from: this.instanceId,
        name: MESH_NAME,
        plug: 'PolyMesh',
        operatorIndex: 3,
        property: 'translation',
      },
      { x: 0, y: 0, z: mainThicknessAdjust / scale.z }
    );
    // return block to center
    window.api.scene.set(
      {
        from: this.instanceId,
        name: MESH_NAME,
        plug: 'Transform',
        property: 'translation',
      },
      { x: -widthAdjust / 2, y: 0, z: 0 }
    );
    // create base collision box
    // const adjustedWidth = this.dimensions.width * INCH_TO_M - SNAP_OFFSET * 10;
    const adjustedWidth = this.dimensions.width * INCH_TO_M;
    const adjustedMainThickness =
      (this.dimensions.mainThickness +
        (this.layout !== 'Straight'
          ? 0
          : this.type === 'Overhead'
          ? DOOR_OFFSET.Overhead
          : DOOR_OFFSET.default)) *
      INCH_TO_M;
    const boxes = {
      Base: {
        PolyMesh: {
          width: adjustedWidth,
          height: this.dimensions.height * INCH_TO_M,
          depth: adjustedMainThickness,
        },
        Transform: {
          translation: {
            x: 0,
            y: (this.dimensions.height * INCH_TO_M) / 2,
            z: adjustedMainThickness / 2,
          },
        },
      },
    };
    if (this.layout !== 'Straight') {
      const lengthAdjust =
        this.dimensions.length * INCH_TO_M - INITIAL_SIZE.length;

      const legThicknessAdjust =
        (this.dimensions.legThickness * INCH_TO_M - INITIAL_SIZE.legThickness) *
        direction;
      window.api.scene.set(
        {
          from: this.instanceId,
          name: MESH_NAME,
          plug: 'PolyMesh',
          operatorIndex: 4,
          property: 'translation',
        },
        { x: 0, y: 0, z: lengthAdjust / scale.z }
      );
      window.api.scene.set(
        {
          from: this.instanceId,
          name: MESH_NAME,
          plug: 'PolyMesh',
          operatorIndex: 5,
          property: 'translation',
        },
        { x: legThicknessAdjust / scale.x, y: 0, z: 0 }
      );
      // add leg collision box
      // const adjustedLength =
      //   this.dimensions.length * INCH_TO_M - SNAP_OFFSET * 10;
      const adjustedLength = this.dimensions.length * INCH_TO_M;
      const adjustedLegThickness = this.dimensions.legThickness * INCH_TO_M;
      boxes.Leg = {
        PolyMesh: {
          width: adjustedLegThickness,
          height: this.dimensions.height * INCH_TO_M,
          depth: adjustedLength,
        },
        Transform: {
          translation: {
            x: ((adjustedWidth - adjustedLegThickness) / 2) * -direction,
            y: (this.dimensions.height * INCH_TO_M) / 2,
            z: adjustedLength / 2,
          },
        },
      };
    }
    this.boxes = Object.values(boxes).map((box) => box.PolyMesh);
    // * For assets with invisible boxes
    // for (const name in boxes) {
    //   const plugs = boxes[name];
    //   for (const plug in plugs) {
    //     const properties = plugs[plug];
    //     for (const property in properties) {
    //       window.api.scene.set(
    //         {
    //           from: this.instanceId,
    //           name,
    //           plug,
    //           property,
    //         },
    //         properties[property]
    //       );
    //     }
    //   }
    // }
    const walls = this.getWalls();
    walls.forEach((wall) => {
      wall.vacate(this.nodeId);
    });
    this.move();
    window.api.player.evaluateSceneGraph();
    new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
      this.finishedMoving();
    });
  }

  getCollisionBoxes() {
    const node = window.api.scene.get({
      from: this.instanceId,
      name: BLOCK_CONSTANTS.MESH_NAME,
      evalNode: true,
    });
    const mainBox = node.getBoundingBox();
    const bBoxes = [];
    if (mainBox)
      this.boxes.forEach((box, index) => {
        const { min, max, intersectsBox } = mainBox;
        if (index === 0) {
          const customBox = {
            min: { ...min },
            max: { ...max },
            intersectsBox,
          };
          const sign =
            this.location === 'BACK' || this.location === 'LEFT' ? -1 : 1;
          const minV = sign * this.position - box.width / 2 + SNAP_OFFSET;
          const maxV = sign * this.position + box.width / 2 - SNAP_OFFSET;
          const doorOffset =
            (this.layout !== 'Straight'
              ? 0
              : this.type === 'Overhead'
              ? DOOR_OFFSET.Overhead
              : DOOR_OFFSET.default) * INCH_TO_M;
          switch (this.location) {
            case 'FRONT':
              customBox.min.x = minV;
              customBox.max.x = maxV;
              customBox.max.z += doorOffset;
              break;
            case 'BACK':
              customBox.min.x = minV;
              customBox.max.x = maxV;
              customBox.min.z -= doorOffset;
              break;
            case 'LEFT':
              customBox.min.z = minV;
              customBox.max.z = maxV;
              customBox.max.x += doorOffset;
              break;
            case 'RIGHT':
              customBox.min.z = minV;
              customBox.max.z = maxV;
              customBox.min.x -= doorOffset;
              break;
            default:
              console.error('Cannot get bounding box: Unknown location');
          }
          bBoxes.push(customBox);
        } else if (index === 1) {
          const legBox = {
            // Assumes at front
            min: { ...min },
            max: { ...max },
            intersectsBox,
          };
          ////
          if (this.layout === 'Left') {
            switch (this.location) {
              case 'FRONT':
                legBox.min.x = bBoxes[0].min.x;
                legBox.max.x = bBoxes[0].min.x + box.width - SNAP_OFFSET;
                bBoxes[0].max.z = legBox.min.z + this.boxes[0].depth;
                break;
              case 'BACK':
                legBox.min.x = bBoxes[0].max.x - box.width + SNAP_OFFSET;
                legBox.max.x = bBoxes[0].max.x;
                bBoxes[0].min.z = legBox.max.z - this.boxes[0].depth;
                break;
              case 'LEFT':
                legBox.min.z = bBoxes[0].max.z - box.width + SNAP_OFFSET;
                legBox.max.z = bBoxes[0].max.z;
                bBoxes[0].max.x = legBox.min.x + this.boxes[0].depth;
                break;
              case 'RIGHT':
                legBox.min.z = bBoxes[0].min.z;
                legBox.max.z = bBoxes[0].min.z + box.width - SNAP_OFFSET;
                bBoxes[0].min.x = legBox.max.x - this.boxes[0].depth;
                break;
              default:
                console.error('Cannot get bounding box: Unknown location');
            }
          } else {
            switch (this.location) {
              case 'FRONT':
                legBox.min.x = bBoxes[0].max.x - box.width + SNAP_OFFSET;
                legBox.max.x = bBoxes[0].max.x;
                bBoxes[0].max.z = legBox.min.z + this.boxes[0].depth;
                break;
              case 'BACK':
                legBox.min.x = bBoxes[0].min.x;
                legBox.max.x = bBoxes[0].min.x + box.width - SNAP_OFFSET;
                bBoxes[0].min.z = legBox.max.z - this.boxes[0].depth;
                break;
              case 'LEFT':
                legBox.min.z = bBoxes[0].min.z;
                legBox.max.z = bBoxes[0].min.z + box.width - SNAP_OFFSET;
                bBoxes[0].max.x = legBox.max.x - this.boxes[0].width;
                break;
              case 'RIGHT':
                legBox.min.z = bBoxes[0].max.z - box.width + SNAP_OFFSET;
                legBox.max.z = bBoxes[0].max.z;
                bBoxes[0].min.x = legBox.min.x - this.boxes[0].width;
                break;
              default:
                console.error('Cannot get bounding box: Unknown location');
            }
          }
          bBoxes.push(legBox);
        }
      });
    else console.error('Cannot get bounding box for ', this.nodeId);
    return bBoxes;
    // * For assets with invisible boxes
    // const boxes = ['Base'];
    // if (this.layout !== 'Straight') boxes.push('Leg');
    // return boxes.map((box) =>
    //   window.api.scene
    //     .get({
    //       from: this.instanceId,
    //       name: box,
    //       evalNode: true,
    //     })
    //     .getBoundingBox()
    // );
  }

  setMaterial() {
    const { MESH_NAME } = BLOCK_CONSTANTS;
    const opacity = this.moving ? 'Transparent' : 'Opaque';
    const color = this.isColliding()
      ? 'Red'
      : this.isAdjacent()
      ? 'Green'
      : 'Blue';
    const materialName = `${opacity}_${color}`;
    findMaterial(materialName).then((id) => {
      if (id !== this.material) {
        this.material = id;
        window.api.scene.set(
          {
            from: this.instanceId,
            name: MESH_NAME,
            plug: 'Material',
            property: 'reference',
          },
          this.material
        );
      }
    });
  }

  getPosition() {
    return this.position * this.direction;
  }

  getStartPos() {
    return this.position + this.startPos;
  }

  getEndPos() {
    return this.position + this.endPos;
  }

  getWalls() {
    const wall = window.state.getWall(this.location);
    return [
      wall,
      window.state.getWall(wall.getPrevious()),
      window.state.getWall(wall.getNext()),
    ];
  }

  finishedMoving() {
    this.moving = false;
    window.state.getWall(this.location).occupy(this.nodeId);
    window.state.checkCollision();
    window.state.checkAdjacency();
  }

  startedMoving() {
    this.getWalls().forEach((wall) => wall.vacate(this.nodeId));
    this.resetAdjacent();
    this.moving = true;
  }

  checkAdjacency() {
    const tempLeft = new Set(this.adjacency.left);
    const tempRight = new Set(this.adjacency.right);
    this.resetAdjacent();
    if (!this.isColliding()) {
      const walls = [state.getWall(this.location)];
      // check walls
      const { startPos, endPos } = walls[0].getBoundaries();
      const wallAdjacency = { left: '', right: '' };
      if (this.getStartPos() - startPos <= ADJACENCY_THRESHOLD) {
        this.setAdjacent('left', `wall-${walls[0].getPrevious()}`);
        wallAdjacency.left = walls[0].getPrevious();
      }
      if (endPos - this.getEndPos() <= ADJACENCY_THRESHOLD) {
        this.setAdjacent('right', `wall-${walls[0].getNext()}`);
        wallAdjacency.right = walls[0].getNext();
      }
      if (this.layout === 'Left' && wallAdjacency.left) {
        const adjWall = window.state.getWall(walls[0].getPrevious());
        adjWall.occupy(
          this.nodeId,
          adjWall.endPos - SNAP_OFFSET - this.dimensions.length * INCH_TO_M,
          adjWall.endPos - SNAP_OFFSET,
          'Adjacent'
        );
        walls.push(adjWall);
      }
      if (this.layout === 'Right' && wallAdjacency.right) {
        const adjWall = window.state.getWall(walls[0].getNext());
        adjWall.occupy(
          this.nodeId,
          adjWall.startPos + SNAP_OFFSET,
          adjWall.startPos + SNAP_OFFSET + this.dimensions.length * INCH_TO_M,
          'Adjacent'
        );
        walls.push(adjWall);
      }
      for (const wall of walls) wall.checkAdjacency(this.nodeId);
    }
    if (
      !setEquals(tempLeft, this.adjacency.left) ||
      !setEquals(tempRight, this.adjacency.right)
    )
      this.updated = true;
  }

  move(x) {
    const wall = state.getWall(this.location);
    const { startPos, endPos, direction } = wall.getBoundaries();
    const position = x === undefined ? this.position : x * direction;
    if (position + this.startPos < startPos)
      this.position = startPos - this.startPos;
    else if (position + this.endPos > endPos)
      this.position = endPos - this.endPos;
    else this.position = position;
    const snapped = { left: '', right: '' };
    if (window.state.snap) {
      const rows = this.getRow();
      // walls
      if (Math.abs(this.getStartPos() - startPos) <= SNAP_THRESHOLD) {
        snapped.left = `wall-${wall.getPrevious()}`;
        this.position = startPos - this.startPos + SNAP_OFFSET;
      } else if (Math.abs(this.getEndPos() - endPos) <= SNAP_THRESHOLD) {
        snapped.right = `wall-${wall.getNext()}`;
        this.position = endPos - this.endPos - SNAP_OFFSET;
      }
      // leftSide
      if (!snapped.left && !snapped.right) {
        for (const row of rows) {
          const map = wall.getMap(row);
          const possibleSnaps = map.filter(
            (item) =>
              item.blockId !== this.nodeId &&
              Math.abs(this.getStartPos() - item.endPos) <= SNAP_THRESHOLD
          );
          if (possibleSnaps.length > 0) {
            possibleSnaps.sort(
              (a, b) =>
                Math.abs(this.getStartPos() - a.endPos) -
                Math.abs(this.getStartPos() - b.endPos)
            );
            this.position =
              possibleSnaps[0].endPos - this.startPos + SNAP_OFFSET;
            snapped.left = possibleSnaps[0].blockId;
            break;
          }
        }
      }
      // right side if not snapped
      if (!snapped.right && !snapped.left) {
        for (const row of rows) {
          const map = wall.getMap(row);
          const possibleSnaps = map.filter(
            (item) =>
              item.blockId !== this.nodeId &&
              Math.abs(this.getEndPos() - item.startPos) <= SNAP_THRESHOLD
          );
          if (possibleSnaps.length > 0) {
            possibleSnaps.sort(
              (a, b) =>
                Math.abs(this.getEndPos() - a.startPos) -
                Math.abs(this.getEndPos() - b.startPos)
            );
            this.position =
              possibleSnaps[0].startPos - this.endPos - SNAP_OFFSET;
            snapped.right = possibleSnaps[0].blockId;
            break;
          }
        }
      }
    }
    window.api.scene.set(
      {
        id: this.nodeId,
        plug: 'Transform',
        property: 'translation',
      },
      { ...this.initialTranslation, x: this.position }
    );

    api.player.evaluateSceneGraph();
    this.checkCollision();
  }

  checkCollision(exclude) {
    let colliding = false;
    const ownBoxes = this.getCollisionBoxes();
    for (const block of window.state
      .getBlocks()
      .filter(
        (block) => block.nodeId !== this.nodeId && block.nodeId !== exclude
      )) {
      if (colliding) break;
      const cBoxes = block.getCollisionBoxes();
      for (const box of cBoxes) {
        if (colliding) break;
        for (const ownBox of ownBoxes) {
          if (ownBox.intersectsBox(box)) {
            colliding = true;
            break;
          }
        }
      }
    }
    this.setColliding(colliding);
    this.setMaterial();
    return colliding;
  }

  remove() {
    this.resetAdjacent();
    this.getWalls().forEach((wall) => {
      wall.vacate(this.nodeId);
    });
    window.poolApi.removeObject(this.blockId, this.layout);
    window.poolApi.removeObject(this.nodeId, 'Block');
    window.poolApi.removeObject(this.cabsId, 'Cabinets');
  }
}
