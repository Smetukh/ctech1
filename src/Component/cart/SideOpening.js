import { reparent, getAssetInstanceId } from '../../helper';
import {
  INCH_TO_M,
  INCH_TO_CM,
  FIRST_OPENING,
  LAST_OPENING,
  MIDDLE_OPENING,
  SINGLE_OPENING,
} from '../../constants';
import {
  RAIL_WIDTH,
  RAIL_GROOVE,
  CENTER_RAIL_OFFSET_DEPTH,
  RAIL_MESH_LENGTH,
  CENTER_PANEL_DEPTH_ADJUSTMENT,
  CENTER_RAIL_ATTACH_PLATE_OFFSET,
  SLOT_DEFAULT_SPACING,
} from '../constants';
import { materialAssigner } from '../../materials';

import { SideOpenings } from './SideOpenings';
import { Door } from '../Door';
import { Insert } from '../Insert';
import { Filler } from '../Filler';
import { Shelves } from './CartShelves';
import { calcSlotDepthSpacing } from '../Shell';
import { updateAssets } from '../helper';
import { Component } from '../Component';

//const CENTER_PANEL_MESH_WIDTH = 3.809997473433668;
//const CENTER_PANEL_MESH_DEPTH = 38.9282065273477;
//const CENTER_PANEL_MESH_HEIGHT = 28.045104353611805;
const CENTER_PANEL_Z_OFFSET = 0;
const CART_CENTER_PANEL_MESH_HEIGHT = 0.8903 * 12; // In Inches
const CART_CENTER_PANEL_MESH_WIDTH = 12; // In Inches
const CART_PANEL_MESH_TOP_HEIGHT = 0.275 * 12; // In Inches
const CART_PANEL_MESH_BOTTOM_HEIGHT = 0.3647 * 12; // In Inches
const BRACING_MESH_HEIGHT = 0.2826 * 12; // In Inches
//const CART_PANEL_TOP_HOLE_TO_END_OF_MESH_HEIGHT = 0.125 * 12; // In Inches

export class SideOpening extends Component {
  constructor(opening, chassis, idx, nodeLevel, isEndUnit, translation) {
    super(`opening${idx}`);

    this.reset(opening, chassis, idx, nodeLevel, isEndUnit, translation);
  }

  reset(opening, chassis, idx, nodeLevel, isEndUnit, translation) {
    const assets = {};
    let chassisType;
    if(chassis){
      chassisType = getChassisType(chassis);
    }
      
    this.nodeLevel = nodeLevel;
    this.translation = translation;
    //
    const {
      frame,
      openings,
      contents,
      width,
      height,
      depth,
      leftExt,
      rightExt,
    } = opening;

    let frameHeight = height;
    let shelfYOffset = 0.112 + 0.48;
    shelfYOffset -= 1.4;

    const gasketLoc = frame.top === 'gasketLoc';
    if (gasketLoc) {
      frameHeight += 2;
      shelfYOffset += 0.536;
    } else if (frame.top.indexOf('rail') !== -1) {
      frameHeight += 1.5;
    }
    if (frame.bottom.indexOf('rail') !== -1) {
      frameHeight += 1.5;
    } else if (frame.bottom === 'toekick') {
      shelfYOffset += 0.5;
      if (!gasketLoc) shelfYOffset += 0.76;
    }

    const centerRailAssets = [];
    const internalBracingAssets = [];
    if (frame.right === 'center rail' && nodeLevel % 2 === 0) {
      centerRailAssets.push(getCenterRailRight(opening));
      if (depth > 0) {
        assets.centerPanelAsset = getCenterPanelRight(opening, frameHeight, chassisType);
      }
    }
    if (frame.bottom === 'center rail' && nodeLevel % 2 === 1) {
      centerRailAssets.push(getCenterRailBottom(opening));
    }
    if(frame.left === 'corner post' && contents && contents.type === 'door' && depth > 0){
      internalBracingAssets.push(getInternalBracing(opening, chassisType, frameHeight, 'Front', 'Left'));
      internalBracingAssets.push(getInternalBracing(opening, chassisType, frameHeight, 'Back', 'Left'));
    } 
    if(frame.right === 'corner post' && contents && contents.type === 'door' && depth > 0){
      internalBracingAssets.push(getInternalBracing(opening, chassisType, frameHeight, 'Front', 'Right'));
      internalBracingAssets.push(getInternalBracing(opening, chassisType, frameHeight, 'Back', 'Right'));
    }
    centerRailAssets.forEach((asset, index) => {
      assets[`rail${index}`] = asset;
    });
    internalBracingAssets.forEach((asset, index) => {
      assets[`bracing${index}`] = asset;
    });
    isEndUnit =
      frame.left.indexOf('end') !== -1
        ? frame.right.indexOf('end') !== -1
          ? SINGLE_OPENING
          : FIRST_OPENING
        : frame.right.indexOf('end') !== -1
        ? LAST_OPENING
        : MIDDLE_OPENING;
    this.isEndUnit = isEndUnit;

    if (openings && openings.length) {
      assets.openings = this.assets.openings
        ? this.assets.openings.reset(
            openings,
            {
              width,
              height,
              depth,
              leftExt,
              rightExt,
            },
            chassis,
            0,
            0,
            nodeLevel + 1,
            isEndUnit
          )
        : new SideOpenings(
            openings,
            {
              width,
              height,
              depth,
              leftExt,
              rightExt,
            },
            chassis,
            0,
            0,
            nodeLevel + 1,
            isEndUnit
          );
    }
      
    if (contents) {
      contents.isCart = true;
      contents.boundry = { width, height, depth, leftExt, rightExt };
      const { type, shelves } = contents;

      if (type === 'door') {
        assets.door = this.assets.door
          ? this.assets.door.reset(contents)
          : new Door(contents);
      } else if (type === 'insert') {
        assets.insert = this.assets.insert
          ? this.assets.insert.reset(contents, frame, false)
          : new Insert(contents, frame, false);
      } else if (type === 'filler') {
        assets.filler = this.assets.filler
          ? this.assets.filler.reset(contents)
          : new Filler(contents);
      }
      if (shelves) {
        assets.shelves = this.assets.shelves
          ? this.assets.shelves.reset(contents, {
              isEndUnit,
              frameHeight,
              shelfYOffset,
              frame,
              chassisType
            })
          : new Shelves(contents, {
              isEndUnit,
              frameHeight,
              shelfYOffset,
              frame,
              chassisType
            });
      }
    }

    this.assets = updateAssets(this.assets, assets);

    return this;
  }

  async build() {
    await this.fetchObjects();
    const partNodes = await Promise.all(
      Object.values(this.assets)
        .filter((asset) => asset.modified !== false || !this.initialized)
        .map((asset) => asset.build(asset.id, asset.data))
    );

    reparent(window.api, this.id, ...partNodes);
    this.initialized = true;
    window.api.scene.set(
      { id: this.id, plug: 'Transform', property: 'translation' },
      this.translation
    );

    return this.id;
  }
}
function getCenterRailRight(opening) {
  const { width, height, depth, frame, x } = opening;
  const noBottom = frame.bottom === 'none';
  const centerRailAsset = {
    name: 'CenterRail',
    data: {
      length: height + RAIL_GROOVE * (noBottom ? 1 : 2) - 0.25,
      x: x === undefined ? width / 2 + RAIL_WIDTH / 2 : x,
      y: noBottom ? RAIL_GROOVE / 2 : 0,
      z: depth / 2 - CENTER_RAIL_OFFSET_DEPTH + 0.18,
      rotateZ: 180,
    },
    build: getNodeForCenterRailAsset,
  };
  return centerRailAsset;
}
function getCenterPanelRight(opening, frameHeight, chassisType) {
  const { width, height, depth, frame } = opening;
  let actualHeight = height;
  let y = 0;
  const actualDepth = depth - CENTER_PANEL_DEPTH_ADJUSTMENT;
  const toekick = frame.bottom === 'toekick';
  if(!chassisType || chassisType == 'mini' || chassisType == 'standard'){
    y -= 0.92;
    actualHeight += 1.84;
  }
  if (frame.bottom === 'none') {
    const heightDiff = 1.042;
    actualHeight += heightDiff;
    y += heightDiff / 2;
  } else if (toekick) {
    if (frame.top !== 'gasketLoc') {
      const heightDiff = 0.3;
      actualHeight += heightDiff;
      y += heightDiff / 2;
    }
    y += 1;
  } else {
    actualHeight += 2.7;
  }

  const centerPanelAsset = {
    name: 'CartCenterPanel',
    data: {
      height: actualHeight - 3.35,
      depth: actualDepth - 2.4,
      openingHeight: height,
      // halfInch: frameHeight <= 24,
      halfInch: true,
      x: (width + CENTER_RAIL_ATTACH_PLATE_OFFSET) / 2, // attach plate is +0.05 off center
      y: y - 0.37,
      toekick,
    },
    build: getNodeForCenterPanelAsset,
  };

  return centerPanelAsset;
}
function getCenterRailBottom(opening) {
  const { width, height, depth } = opening;
  const centerRailAsset = {
    name: 'CenterRail',
    data: {
      length: width,
      x: 0,
      y: -height / 2 - RAIL_WIDTH / 2,
      z: depth / 2 - CENTER_RAIL_OFFSET_DEPTH,
      rotateZ: 90,
    },
    build: getNodeForCenterRailAsset,
  };
  return centerRailAsset;
}

async function getNodeForCenterRailAsset(id, values) {
  const length = INCH_TO_M * values.length;
  const stretch = ((length - RAIL_MESH_LENGTH) / 2) * 100;
  const x = INCH_TO_M * values.x;
  const y = INCH_TO_M * values.y;
  const z = INCH_TO_M * values.z;
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const railMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'Item',
  });
  // 0. Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    { x, y, z }
  );
  // 1. Stretch
  window.api.scene.set(
    {
      id: railMeshId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretch
  );
  // 2. Rotation
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    { x: 0, y: 0, z: values.rotateZ }
  );
  applyMaterialToNode(railMeshId);
  return id;
}

async function getNodeForCenterPanelAsset(id, values) {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);

  // 0. Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    {
      x: INCH_TO_M * (values.x + 3.135) - CART_CENTER_PANEL_MESH_WIDTH / 200 ,
      y: INCH_TO_M * values.y,
      z: CENTER_PANEL_Z_OFFSET * INCH_TO_M,
    }
  );
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    {
      x: 0,
      y: -90,
      z: 0,
    }
  );

  var height = values.height;
  var depth = values.depth;

  // Get the id of necessary elements
  const topPartId = window.api.scene.findNode({
    from: instanceId,
    name: 'Top',
  });
  const bottomPartId = window.api.scene.findNode({
    from: instanceId,
    name: 'Bottom',
  });
  const backUpperPartId = window.api.scene.findNode({
    from: instanceId,
    name: 'BackUpper',
  });
  const backMiddlePartId = window.api.scene.findNode({
    from: instanceId,
    name: 'BackMiddle',
  });
  const backLowerPartId = window.api.scene.findNode({
    from: instanceId,
    name: 'BackLower',
  });
  const frontUpperPartId = window.api.scene.findNode({
    from: instanceId,
    name: 'FrontUpper',
  });
  const frontMiddlePartId = window.api.scene.findNode({
    from: instanceId,
    name: 'FrontMiddle',
  });
  const frontLowerPartId = window.api.scene.findNode({
    from: instanceId,
    name: 'FrontLower',
  });
  const slotsPartId = window.api.scene.findNode({
    from: instanceId,
    name: 'Slots',
  });
  applyMaterialToNode(topPartId);
  applyMaterialToNode(bottomPartId);
  applyMaterialToNode(backMiddlePartId);
  applyMaterialToNode(backLowerPartId);
  applyMaterialToNode(backUpperPartId);
  applyMaterialToNode(frontUpperPartId);
  applyMaterialToNode(frontMiddlePartId);
  applyMaterialToNode(frontLowerPartId);
  applyMaterialToNode(slotsPartId);

  // Use opening height as indicated by drawing
  const numOfSlots = Math.floor(height - CART_PANEL_MESH_TOP_HEIGHT - CART_PANEL_MESH_BOTTOM_HEIGHT) + 1;
  const shelfYOffset = 0.255;
  
  var heightDiff = (height - CART_CENTER_PANEL_MESH_HEIGHT) * INCH_TO_M;
  var depthDiff = (depth - CART_CENTER_PANEL_MESH_WIDTH) * INCH_TO_M;
  var frontBackXTrans = (depthDiff/2 + (1 * INCH_TO_M));
  var xStretch = depthDiff/2 + (1 * INCH_TO_M);

  // Top mesh
  window.api.scene.set(
    { id: topPartId, plug: 'Transform', property: 'translation' },
    { x: 0, y: heightDiff / 2, z: 0 }
  );
  window.api.scene.set(
    {
      id: topPartId,
      plug: 'PolyMesh',
      propreties: {type: 'Stretch', axis: 1},
      property: 'stretchDistance',
    },
    xStretch,
  );

  // Bottom mesh
  window.api.scene.set(
    { id: bottomPartId, plug: 'Transform', property: 'translation' },
    { x: 0, y: -heightDiff/2, z: 0 }
  );
  window.api.scene.set(
    {
      id: bottomPartId,
      plug: 'PolyMesh',
      properties: {type: 'Stretch', axis: 1},
      property: 'stretchDistance',
    },
    xStretch
  );


  // Slots Mesh
  window.api.scene.set(
    {
      id: slotsPartId,
      plug: 'PolyMesh',
      properties: { type: 'Array' },
      property: 'count',
    },
    numOfSlots
  );
  window.api.scene.set(
    { id: slotsPartId, plug: 'Transform', property: 'translation' },
    { x: 0, y: -heightDiff/2, z: 0 }
  );
  window.api.scene.set(
    {
      id: slotsPartId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch', axis: 1 },
      property: 'stretchDistance',
    },
    xStretch
  );

  // // Front Upper
  window.api.scene.set(
    { id: frontUpperPartId, plug: 'Transform', property: 'translation' },
    { x: frontBackXTrans, y: heightDiff/4, z: 0}
  );
  window.api.scene.set(
    {
      id: frontUpperPartId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch', axis: 2 },
      property: 'stretchDistance',
    },
    heightDiff/4
  );
  // // Front Lower
  window.api.scene.set(
    { id: frontLowerPartId, plug: 'Transform', property: 'translation' },
    { x: frontBackXTrans, y: -heightDiff/4, z: 0}
  );
  window.api.scene.set(
    {
      id: frontLowerPartId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch', axis: 2 },
      property: 'stretchDistance',
    },
    heightDiff / 4
  );
  // // Back Upper
  window.api.scene.set(
    { id: backUpperPartId, plug: 'Transform', property: 'translation' },
    { x: -frontBackXTrans, y: heightDiff/4, z: 0}
  );
  window.api.scene.set(
    {
      id: backUpperPartId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch', axis: 2 },
      property: 'stretchDistance',
    },
    heightDiff/4
  );
  // // Back Lower
  window.api.scene.set(
    { id: backLowerPartId, plug: 'Transform', property: 'translation' },
    { x: -frontBackXTrans, y: -heightDiff/4, z: 0}
  );
  window.api.scene.set(
    {
      id: backLowerPartId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' , axis: 2},
      property: 'stretchDistance',
    },
    heightDiff / 4
  );
  // // Front Middle
  window.api.scene.set(
    { id: frontMiddlePartId, plug: 'Transform', property: 'translation' },
    { x: frontBackXTrans, y: 0, z: 0}
  );

  // // Back Middle
  window.api.scene.set(
    { id: backMiddlePartId, plug: 'Transform', property: 'translation' },
    { x: -frontBackXTrans, y: 0, z: 0}
  );
  
  return id;
}

function getInternalBracing(opening, chassisType, frameHeight, frontBack, leftRight) {
  const { width, height, depth, frame, x } = opening;
  const internalBracingAsset= {
    name: 'InternalBracing',
    data: {
      length: height * INCH_TO_M,
      x: (((width + 1.4)/2) * INCH_TO_M) * (leftRight === 'Left' ? -1: 1),
      y: ((-height /2) - .02) * INCH_TO_M,
      z: (((depth - 8.13)/ 2 - CENTER_RAIL_OFFSET_DEPTH) * (frontBack === 'Front' ? 1 : -1) + 0.08) * INCH_TO_M,
      rotateY: (leftRight === 'Left' ? -90 : 90),
      chassisType,
    },
    build: getNodeForInternalBracingAsset,
  };
  return internalBracingAsset;
}

async function getNodeForInternalBracingAsset(id, values) {
  let {length, x, y, z, rotateY, chassisType} = values

  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  
  const topPartId = window.api.scene.findNode({
    from: instanceId,
    name: 'Top',
  });
  const bottomPartId = window.api.scene.findNode({
    from: instanceId,
    name: 'Bottom',
  });
  const slotsPartId = window.api.scene.findNode({
    from: instanceId,
    name: 'Slots',
  });

  applyMaterialToNode(topPartId);
  applyMaterialToNode(bottomPartId);
  applyMaterialToNode(slotsPartId);

  // Use opening height as indicated by drawing
  let numOfSlots = Math.floor((length - ((BRACING_MESH_HEIGHT - 1) * INCH_TO_M))/0.0254 + 1);
  
  
  var heightDiff = (length - (BRACING_MESH_HEIGHT * INCH_TO_M));
  if(!chassisType || chassisType == 'mini' || chassisType == 'standard'){
    numOfSlots += 2;
    heightDiff += (1.84 * INCH_TO_M);
    y -= (1.84 * INCH_TO_M);
  }
  

  // 0. Translate and rotate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    { x, y, z }
  );
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    { x: 0, y: rotateY, z: 0 }
  );
  // 1. Place Top
  window.api.scene.set(
    {id: topPartId, plug: 'Transform', property: 'translation'},
    {x: 0, y: heightDiff, z: 0}
    //{x: 0, y: 0.5, z: 0}
  );
  // 2. Place Bottom
  window.api.scene.set(
    {id: bottomPartId, plug: 'Transform', property: 'translation'},
    {x: 0, y: 0, z: 0}
  );
  // 3. Translate Slots
  window.api.scene.set(
    {id: slotsPartId, plug: 'Transform', property: 'translation'},
    {x: 0, y: 0, z: 0}
  );
  // 4. Array Slots
  window.api.scene.set(
    {
      id: slotsPartId,
      plug: 'PolyMesh',
      properties: { type: 'Array' },
      property: 'count',
    },
    numOfSlots
  );

  return id;
}

function getChassisType(chassis) {
  let chassisType;
  if (chassis.wheels.mount === 'caster') chassisType = 'caster';

  if (chassis.wheels.mount === 'caster' && chassis.wheels.size === 10)
    chassisType = 'badass caster';

  if (
    chassis.wheels.mount === 'spindle' &&
    chassis.wheels.size === 10 &&
    chassis.options.fenders
  )
    chassisType = 'hot rod';

  if (
    chassis.wheels.mount === 'spindle' &&
    chassis.wheels.size === 10 &&
    chassis.rear.openings?.length > 0
  )
    chassisType = 'mini';

  if (
    chassis.wheels.mount === 'spindle' &&
    chassis.wheels.size === 17 &&
    chassis.rear.openings?.length > 0
  )
    chassisType = 'standard';

  return chassisType;
}