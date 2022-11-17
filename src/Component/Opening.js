import { reparent, getAssetInstanceId } from '../helper';
import {
  INCH_TO_M,
  INCH_TO_CM,
  FIRST_OPENING,
  LAST_OPENING,
  MIDDLE_OPENING,
  SINGLE_OPENING,
} from '../constants';
import {
  RAIL_WIDTH,
  RAIL_GROOVE,
  CENTER_RAIL_OFFSET_DEPTH,
  RAIL_MESH_LENGTH,
  CENTER_PANEL_DEPTH_ADJUSTMENT,
  CENTER_RAIL_ATTACH_PLATE_OFFSET,
  SLOT_DEFAULT_SPACING,
} from './constants';
import { materialAssigner } from '../materials';

import { Openings } from './Openings';
import { Door } from './Door';
import { Insert } from './Insert';
import { Filler } from './Filler';
import { Shelves } from './Shelves';
import { HangerBars } from './HangerBars';
import { calcSlotDepthSpacing } from './Shell';
import { updateAssets } from './helper';
import { Component } from './Component';

const CENTER_PANEL_MESH_WIDTH = 3.809997473433668;
const CENTER_PANEL_MESH_DEPTH = 38.9282065273477;
const CENTER_PANEL_MESH_HEIGHT = 28.045104353611805;
const CENTER_PANEL_Z_OFFSET = -0.24;

export class Opening extends Component {
  constructor(opening, idx, nodeLevel, isEndUnit, translation, backPanel) {
    super(`opening${idx}`);

    this.reset(opening, idx, nodeLevel, isEndUnit, translation, backPanel);
  }

  reset(opening, idx, nodeLevel, isEndUnit, translation, backPanel) {
    const assets = {};

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
    let shelfYOffset = 0.112;
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
    if (frame.right === 'center rail' && nodeLevel % 2 === 0) {
      centerRailAssets.push(getCenterRailRight(opening));

      assets.centerPanelAsset = getCenterPanelRight(opening, frameHeight);
    }
    if (frame.bottom === 'center rail' && nodeLevel % 2 === 1) {
      centerRailAssets.push(getCenterRailBottom(opening));
    }
    centerRailAssets.forEach((asset, index) => {
      assets[`rail${index}`] = asset;
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
            backPanel,
            nodeLevel + 1,
            isEndUnit
          )
        : new Openings(
            openings,
            {
              width,
              height,
              depth,
              leftExt,
              rightExt,
            },
            backPanel,
            nodeLevel + 1,
            isEndUnit
          );
    }
    
    if (contents) {
      const { type, shelves } = contents;
      const boundry = { width, height, depth, leftExt, rightExt };
      const data = { ...contents, boundry };
        
      if (type === 'door') {
        assets.door = this.assets.door
          ? this.assets.door.reset(data)
          : new Door(data);
      } else if (type === 'insert') {
        assets.insert = this.assets.insert
          ? this.assets.insert.reset(data, frame, backPanel)
          : new Insert(data, frame, backPanel);
      } else if (type === 'filler') {
        assets.filler = this.assets.filler
          ? this.assets.filler.reset(data)
          : new Filler(data);
      }
      if (shelves) { 
        assets.shelves = this.assets.shelves
          ? this.assets.shelves.reset(data, {
              isEndUnit,
              frameHeight,
              shelfYOffset,
            })
          : new Shelves(data, {
              isEndUnit,
              frameHeight,
              shelfYOffset,
          });
          if (shelves.hangerBar > 0) {
              assets.hangerBar = this.assets.hangerBar
                  ? this.assets.hangerBar.reset(data, frame, {
                      frameHeight,
                      shelfYOffset,
                  })
                  : new HangerBars(data, frame, {
                      frameHeight,
                      shelfYOffset,
                  });
          }
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
      length: height + RAIL_GROOVE * (noBottom ? 1 : 2),
      x: x === undefined ? width / 2 + RAIL_WIDTH / 2 : x,
      y: noBottom ? RAIL_GROOVE / 2 : 0,
      z: depth / 2 - CENTER_RAIL_OFFSET_DEPTH,
      rotateZ: 180,
    },
    build: getNodeForCenterRailAsset,
  };
  return centerRailAsset;
}
function getCenterPanelRight(opening, frameHeight) {
  const { width, height, depth, frame } = opening;
  let actualHeight = height;
  let y = 0;
  const actualDepth = depth - CENTER_PANEL_DEPTH_ADJUSTMENT;
  const toekick = frame.bottom === 'toekick';
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
    name: 'CenterPanel',
    data: {
      height: actualHeight,
      depth: actualDepth,
      openingHeight: height,
      halfInch: frameHeight <= 24,
      x: (width + CENTER_RAIL_ATTACH_PLATE_OFFSET) / 2, // attach plate is +0.05 off center
      y,
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
  applyMaterialToNode(railMeshId, 'steel');
  return id;
}
async function getNodeForCenterPanelAsset(id, values) {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);

  // 0. Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    {
      x: INCH_TO_M * values.x - CENTER_PANEL_MESH_WIDTH / 200,
      y: INCH_TO_M * values.y,
      z: CENTER_PANEL_Z_OFFSET * INCH_TO_M,
    }
  );

  const halfInchNullId = window.api.scene.findNode({
    from: instanceId,
    name: 'Lessthan24',
  });
  const fullInchNullId = window.api.scene.findNode({
    from: instanceId,
    name: 'Greaterthan24',
  });

  let shelfSpacing = 1;

  if (values.halfInch) {
    window.api.scene.set(
      { id: halfInchNullId, plug: 'Properties', property: 'visible' },
      true
    );
    window.api.scene.set(
      { id: fullInchNullId, plug: 'Properties', property: 'visible' },
      false
    );
  } else {
    window.api.scene.set(
      { id: halfInchNullId, plug: 'Properties', property: 'visible' },
      false
    );
    window.api.scene.set(
      { id: fullInchNullId, plug: 'Properties', property: 'visible' },
      true
    );
    shelfSpacing = 2;
  }

  const partMidName = shelfSpacing === 1 ? 'HalfInch' : 'Inch';

  // Get the id of necessary elements
  const topPartId = window.api.scene.findNode({
    from: instanceId,
    name: `CenterPanel_${partMidName}_Top`,
  });
  const bottomPartId = window.api.scene.findNode({
    from: instanceId,
    name: `CenterPanel_${partMidName}_Bottom`,
  });
  const middlePartId = window.api.scene.findNode({
    from: instanceId,
    name: `CenterPanel_${partMidName}_Middle`,
  });
  const middlePartFrontId = window.api.scene.findNode({
    from: instanceId,
    name: `CenterPanel_${partMidName}_MiddleF`,
  });
  const middlePartBackId = window.api.scene.findNode({
    from: instanceId,
    name: `CenterPanel_${partMidName}_MiddleB`,
  });
  applyMaterialToNode(topPartId);
  applyMaterialToNode(bottomPartId);
  applyMaterialToNode(middlePartId);
  applyMaterialToNode(middlePartFrontId);
  applyMaterialToNode(middlePartBackId);

  // Use opening height as indicated by drawing
  const numOfSlots = Math.floor((values.openingHeight - 7) / shelfSpacing) + 1;
  const slotDepthSpacing = calcSlotDepthSpacing(values.depth);
  const height = values.height * INCH_TO_CM;
  const depth = values.depth * INCH_TO_CM;

  const spacingDiff = slotDepthSpacing - SLOT_DEFAULT_SPACING;
  const y = ((numOfSlots - 1) * shelfSpacing * INCH_TO_CM) / 2;
  const slotStretchZ = (spacingDiff * INCH_TO_CM) / 2;

  const heightDiff = height - CENTER_PANEL_MESH_HEIGHT - y * 2;
  const depthDiff = depth - CENTER_PANEL_MESH_DEPTH - slotStretchZ * 2;

  const shift = (values.toekick ? 0.04 : 0) * INCH_TO_CM;

  // Middle meshes
  window.api.scene.set(
    {
      id: middlePartId,
      plug: 'PolyMesh',
      properties: { type: 'Array' },
      property: 'count',
    },
    numOfSlots
  );
  window.api.scene.set(
    { id: middlePartId, plug: 'Transform', property: 'translation' },
    { x: 0, y: -y + shift, z: 0 }
  );
  window.api.scene.set(
    {
      id: middlePartId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    slotStretchZ
  );

  // // Front middle
  window.api.scene.set(
    {
      id: middlePartFrontId,
      plug: 'PolyMesh',
      properties: { type: 'Array' },
      property: 'count',
    },
    numOfSlots
  );
  window.api.scene.set(
    { id: middlePartFrontId, plug: 'Transform', property: 'translation' },
    { x: 0, y: -y + shift, z: slotStretchZ + depthDiff / 4 }
  );
  window.api.scene.set(
    {
      id: middlePartFrontId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    depthDiff / 4
  );
  // // Back middle
  window.api.scene.set(
    {
      id: middlePartBackId,
      plug: 'PolyMesh',
      properties: { type: 'Array' },
      property: 'count',
    },
    numOfSlots
  );
  window.api.scene.set(
    { id: middlePartBackId, plug: 'Transform', property: 'translation' },
    { x: 0, y: -y + shift, z: -(slotStretchZ + depthDiff / 4) }
  );
  window.api.scene.set(
    {
      id: middlePartBackId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    depthDiff / 4
  );

  // Top mesh
  window.api.scene.set(
    { id: topPartId, plug: 'Transform', property: 'translation' },
    { x: 0, y: y + heightDiff / 4 + shift / 2, z: 0 }
  );
  window.api.scene.set(
    {
      id: topPartId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    heightDiff / 4 - shift / 2
  );
  window.api.scene.set(
    {
      id: topPartId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    depthDiff / 2 + slotStretchZ
  );
  // Bottom mesh
  window.api.scene.set(
    { id: bottomPartId, plug: 'Transform', property: 'translation' },
    { x: 0, y: -(y + heightDiff / 4) + shift / 2, z: 0 }
  );
  window.api.scene.set(
    {
      id: bottomPartId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    heightDiff / 4 + shift / 2
  );
  window.api.scene.set(
    {
      id: bottomPartId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    depthDiff / 2 + slotStretchZ
  );
  return id;
}
