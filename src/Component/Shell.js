import {
  TOEKICK_Y_OFFSET,
  INCH_TO_CM,
  CM_TO_M,
  ASSET_DIMENSIONS,
  INCH_TO_M,
  END_RAIL_THICKNESS,
  END_RAIL_INSERTION,
} from '../constants';
import { getAssetInstanceId, reparent } from '../helper';
import {
  STRETCH_AMOUNT,
  END_PANEL_SIT_BACK_OFFSET,
  SLOT_DEFAULT_SPACING,
  MAT_THICKNESS_INCHES,
  MAT_THICKNESS_CM,
} from './constants';
import { materialAssigner } from '../materials';
import { ToekickFeet } from './ToekickFeet';
import { updateAssets } from './helper';
import { Component } from './Component';

const GASKETLOC_WRAPPER_HEIGHT_INCHES = 0.958;
const END_PANEL_MESH_DEPTH = 39.52748019559351;
const END_PANEL_MESH_HEIGHT = 25.075636303224336;
const ADJOINED_TOEKICK_EXT = 3.5;

export class Shell extends Component {
  constructor(shell, frame, openings) {
    super('shell');

    this.reset(shell, frame, openings);
  }

  reset(shell, frame, openings) {
    const assets = {};

    const { backPanel, topPanel, bottomPanel, toekick } = shell;
    const { gasketLoc, extensions } = frame;

    const left = extensions && extensions.left;
    const right = extensions && extensions.right;
    const leftExtension = (left && left.width) || 0;
    const rightExtension = (right && right.width) || 0;
    const leftExtended = (left && left.type === 'extended' && left.width) || 0;
    const rightExtended =
      (right && right.type === 'extended' && right.width) || 0;
    const leftAdjoined = left && left.type === 'adjoined';
    const rightAdjoined = right && right.type === 'adjoined';
    const openingHeight = openings[0].height;

    function getLeftPanelAsset() {
      let { height } = frame;
      const { width, depth } = frame;

      const extended = leftExtended ? left.width : 0;

      if (frame.gasketLoc) height -= GASKETLOC_WRAPPER_HEIGHT_INCHES;
      if (toekick) height -= TOEKICK_Y_OFFSET;
      const hasSlots =
        openings[0].contents?.shelves?.adjustable > 0 ||
        (openings[0].openings && openings[0].openings[0]?.contents?.shelves?.adjustable > 0);
      const extendedBaseAdjZ = (extended && gasketLoc ? 0.25 : 0) * INCH_TO_CM;

      const leftPanelAsset = {
        name: leftExtended ? 'EndPanelNoCut' : 'EndPanel',
        data: {
          height,
          depth,
          openingHeight,
          translate: {
            x:
              -(
                (width / 2 + extended) * INCH_TO_CM -
                ASSET_DIMENSIONS.EndPanel.x / 2 -
                END_RAIL_THICKNESS
              ) * CM_TO_M,
            y:
              ((toekick ? TOEKICK_Y_OFFSET : 0) / 2 -
                (frame.gasketLoc ? GASKETLOC_WRAPPER_HEIGHT_INCHES / 2 : 0)) *
              INCH_TO_M,
            z:
              (-(END_PANEL_SIT_BACK_OFFSET + MAT_THICKNESS_INCHES) *
                INCH_TO_M) /
              2,
          },
          halfInch: height <= 24,
          hasSlots,
          extendedBaseAdjZ,
        },
        build: getEndPanelForAsset,
      };

      return leftPanelAsset;
    }

    function getRightPanelAsset() {
      let { height } = frame;
      const { width, depth } = frame;

      const extended = rightExtended ? right.width : 0;

      if (frame.gasketLoc) height -= GASKETLOC_WRAPPER_HEIGHT_INCHES;
      if (toekick) height -= TOEKICK_Y_OFFSET;
      const hasSlots =
        openings[openings.length - 1].contents?.shelves?.adjustable > 0 ||
        (
          openings[openings.length - 1].openings &&
          openings[openings.length - 1].openings[
            openings[openings.length - 1].openings.length - 1
          ]?.contents?.shelves?.adjustable > 0
        );
      const extendedBaseAdjZ = (extended && gasketLoc ? 0.25 : 0) * INCH_TO_CM;

      // const panelHeight = toekick ? height - TOEKICK_Y_OFFSET : height;

      const rightPanelAsset = {
        name: rightExtended ? 'EndPanelNoCut' : 'EndPanel',
        data: {
          height,
          depth,
          openingHeight,
          rotate: { x: 0, y: 0, z: 180 },
          translate: {
            x:
              ((width / 2 + extended) * INCH_TO_CM -
                ASSET_DIMENSIONS.EndPanel.x / 2 -
                END_RAIL_THICKNESS) *
              CM_TO_M,
            y:
              ((toekick ? TOEKICK_Y_OFFSET : 0) / 2 -
                (frame.gasketLoc ? GASKETLOC_WRAPPER_HEIGHT_INCHES / 2 : 0)) *
              INCH_TO_M,
            z:
              (-(END_PANEL_SIT_BACK_OFFSET + MAT_THICKNESS_INCHES) *
                INCH_TO_M) /
              2,
          },
          halfInch: height <= 24,
          hasSlots,
          extendedBaseAdjZ,
        },
        build: getEndPanelForAsset,
      };

      return rightPanelAsset;
    }

    function getBackPanelAsset() {
      const { width, height, depth } = frame;

      const panelHeight = toekick ? height - TOEKICK_Y_OFFSET : height;

      const backPanelAsset = {
        name: 'BackPanel',
        data: {
          stretchOperators: [
            (width + leftExtended + rightExtended) * INCH_TO_CM -
              ASSET_DIMENSIONS.BackPanel.x -
              ASSET_DIMENSIONS.BackPanel.z * 2,
            height * INCH_TO_CM - ASSET_DIMENSIONS.BackPanel.y,
          ],
          translate: {
            x: ((rightExtended - leftExtended) / 2) * INCH_TO_M,
            y: ((panelHeight - height) / 2) * INCH_TO_M,
            z:
              ((-depth / 2) * INCH_TO_CM -
                ASSET_DIMENSIONS.BackPanel.z / 2 +
                END_RAIL_THICKNESS) *
              CM_TO_M,
          },
        },
      };

      return backPanelAsset;
    }

    function getTopPanelAsset() {
      const { width, height, depth } = frame;

      const topPanelAsset = {
        name: 'TopPanel',
        data: {
          stretchOperators: [
            (width + leftExtended + rightExtended) * INCH_TO_CM -
              ASSET_DIMENSIONS.TopPanel.x -
              END_RAIL_THICKNESS * 2,
            depth * INCH_TO_CM -
              ASSET_DIMENSIONS.TopPanel.z -
              END_RAIL_INSERTION -
              ASSET_DIMENSIONS.BackPanel.z * 2,
          ],
          translate: {
            x: ((rightExtended - leftExtended) / 2) * INCH_TO_M,
            y:
              ((height / 2) * INCH_TO_CM -
                ASSET_DIMENSIONS.TopPanel.y / 2 -
                END_RAIL_THICKNESS) *
              CM_TO_M,
            z:
              -(END_RAIL_INSERTION / 2 - ASSET_DIMENSIONS.BackPanel.z) *
              CM_TO_M,
          },
        },
      };

      return topPanelAsset;
    }

    function getTopMountingBracketAsset() {
      const { width, height, depth } = frame;

      const topMtgBrcktAsset = {
        name: 'BottomMountingBracket',
        data: {
          stretchOperators: [
            ((width + leftExtended + rightExtended) * INCH_TO_CM -
              ASSET_DIMENSIONS.TopMountingBracket.x -
              END_RAIL_THICKNESS * 2) *
              CM_TO_M,
          ],
          translate: {
            x: ((rightExtended - leftExtended) / 2) * INCH_TO_M,
            y:
              ((height / 2) * INCH_TO_CM -
                ASSET_DIMENSIONS.TopMountingBracket.y / 2 +
                END_RAIL_THICKNESS) *
              CM_TO_M,
            z:
              ((-depth / 2) * INCH_TO_CM +
                ASSET_DIMENSIONS.TopMountingBracket.z +
                END_RAIL_THICKNESS) *
              CM_TO_M,
          },
          rotate: {
            x: 90,
            y: 0,
            z: 0,
          },
        },
      };
      return topMtgBrcktAsset;
    }

    function getBottomMountingBracketAsset() {
      const { width, height, depth } = frame;

      const bottomMtgBrcktAsset = {
        name: 'BottomMountingBracket',
        data: {
          stretchOperators: [
            ((width + leftExtended + rightExtended) * INCH_TO_CM -
              ASSET_DIMENSIONS.BottomMountingBracket.x -
              END_RAIL_THICKNESS * 2) *
              CM_TO_M,
          ],
          translate: {
            x: ((rightExtended - leftExtended) / 2) * INCH_TO_M,
            y:
              -(
                (height / 2) * INCH_TO_CM -
                ASSET_DIMENSIONS.BottomMountingBracket.y +
                END_RAIL_THICKNESS
              ) * CM_TO_M,
            z:
              ((-depth / 2) * INCH_TO_CM +
                ASSET_DIMENSIONS.BottomMountingBracket.z +
                END_RAIL_THICKNESS) *
              CM_TO_M,
          },
        },
      };

      return bottomMtgBrcktAsset;
    }

    function getBottomPanelAsset() {
      const { width, height, depth } = frame;

      const bottomPanelAsset = {
        name: 'TopPanel',
        data: {
          stretchOperators: [
            (width + leftExtended + rightExtended) * INCH_TO_CM -
              ASSET_DIMENSIONS.TopPanel.x -
              END_RAIL_THICKNESS * 2,
            depth * INCH_TO_CM -
              ASSET_DIMENSIONS.TopPanel.z -
              END_RAIL_INSERTION -
              ASSET_DIMENSIONS.BackPanel.z * 2,
          ],
          rotate: { x: 0, y: 0, z: 180 },
          translate: {
            x: ((rightExtended - leftExtended) / 2) * INCH_TO_M,
            y:
              -(
                (height / 2) * INCH_TO_CM -
                ASSET_DIMENSIONS.TopPanel.y / 2 -
                END_RAIL_THICKNESS / 2
              ) * CM_TO_M,
            z:
              -(END_RAIL_INSERTION / 2 - ASSET_DIMENSIONS.BackPanel.z) *
              CM_TO_M,
          },
        },
      };

      return bottomPanelAsset;
    }

    function getToekickAsset() {
      const { width, depth, height } = frame;

      const panelHeight = height - TOEKICK_Y_OFFSET;

      const toekickAsset = {
        name: 'Toekick',
        data: {
          stretchOperators: [
            (width +
              (leftExtended
                ? leftExtension
                : leftAdjoined
                ? ADJOINED_TOEKICK_EXT
                : 0) +
              (rightExtended
                ? rightExtension
                : rightAdjoined
                ? ADJOINED_TOEKICK_EXT
                : 0)) *
              INCH_TO_CM -
              ASSET_DIMENSIONS.Toekick.x -
              END_RAIL_THICKNESS * 2,
            depth * INCH_TO_CM -
              ASSET_DIMENSIONS.Toekick.z -
              ASSET_DIMENSIONS.BackPanel.z -
              END_RAIL_INSERTION,
          ],
          translate: {
            x:
              (((rightExtended
                ? rightExtension
                : rightAdjoined
                ? ADJOINED_TOEKICK_EXT
                : 0) -
                (leftExtended
                  ? leftExtension
                  : leftAdjoined
                  ? ADJOINED_TOEKICK_EXT
                  : 0)) /
                2) *
              INCH_TO_M,
            y:
              ((-(panelHeight - TOEKICK_Y_OFFSET) / 2) * INCH_TO_CM -
                ASSET_DIMENSIONS.Toekick.y / 2) *
              CM_TO_M,
            z:
              ((ASSET_DIMENSIONS.BackPanel.z - END_RAIL_INSERTION) / 2) *
              CM_TO_M,
          },
          mat: 'TB',
        },
      };

      return toekickAsset;
    }

    assets.leftPanel = getLeftPanelAsset();
    assets.rightPanel = getRightPanelAsset();

    if (backPanel) {
      assets.backPanel = getBackPanelAsset();
    }
    if (gasketLoc) {
      //
    } else if (topPanel) {
      assets.topPanel = getTopPanelAsset();
    } else {
      assets.topMountingBrancket = getTopMountingBracketAsset();
    }
    if (toekick) {
      const { adjustableFeet, venting } = toekick;
      assets.toekick = getToekickAsset();
      if (adjustableFeet) {
        assets.toekickFeet = this.assets.toekickFeet
          ? this.assets.toekickFeet.reset(frame, openings)
          : new ToekickFeet(frame, openings);
      }
    } else if (bottomPanel) {
      assets.bottomPanel = getBottomPanelAsset();
    } else {
      assets.bottomMountingBracket = getBottomMountingBracketAsset();
    }

    this.assets = updateAssets(this.assets, assets);

    return this;
  }

  async build() {
    await this.fetchObjects();
    const partNodes = await Promise.all(
      Object.values(this.assets)
        .filter((asset) => asset.modified !== false || !this.initialized)
        .map((asset) => {
          if (asset.build) return asset.build(asset.id, asset.data);
          return getNodeForAsset(asset.id, asset.data);
        })
    );

    reparent(window.api, this.id, ...partNodes);
    this.initialized = true;
    return this.id;
  }
}

async function getNodeForAsset(id, values) {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const meshId = window.api.scene.findNode({
    from: instanceId,
    name: 'Item',
  });

  if (values.translate)
    window.api.scene.set(
      { id, plug: 'Transform', property: 'translation' },
      values.translate
    );
  if (values.rotate)
    window.api.scene.set(
      { id, plug: 'Transform', property: 'rotation' },
      values.rotate
    );
  values.stretchOperators.forEach((stretch, idx) => {
    window.api.scene.set(
      {
        id: meshId,
        plug: 'PolyMesh',
        operatorIndex: idx + 1,
        property: 'stretchDistance',
      },
      stretch * STRETCH_AMOUNT
    );
  });

  applyMaterialToNode(meshId, values.mat);

  return id;
}

async function getEndPanelForAsset(id, values) {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);

  if (values.translate)
    window.api.scene.set(
      { id, plug: 'Transform', property: 'translation' },
      values.translate
    );
  if (values.rotate)
    window.api.scene.set(
      { id, plug: 'Transform', property: 'rotation' },
      values.rotate
    );

  const halfInchNullId = window.api.scene.findNode({
    from: instanceId,
    name: 'Lessthan24',
  });
  const fullInchNullId = window.api.scene.findNode({
    from: instanceId,
    name: 'GreaterThan24',
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

  const partMidName = shelfSpacing === 1 ? 'halfinch' : 'inch';

  // Get the id of necessary elements
  const topPartId = window.api.scene.findNode({
    from: instanceId,
    name: `EndPanel_${partMidName}_Top`,
  });
  const bottomPartId = window.api.scene.findNode({
    from: instanceId,
    name: `EndPanel_${partMidName}_Bottom`,
  });
  const middlePartId = window.api.scene.findNode({
    from: instanceId,
    name: `EndPanel_${partMidName}_Middle`,
  });
  const middlePartFrontId = window.api.scene.findNode({
    from: instanceId,
    name: `EndPanel_${partMidName}_MiddleEndF`,
  });
  const middlePartBackId = window.api.scene.findNode({
    from: instanceId,
    name: `EndPanel_${partMidName}_MiddleEndB`,
  });
  applyMaterialToNode(topPartId);
  applyMaterialToNode(bottomPartId);
  applyMaterialToNode(middlePartId);
  applyMaterialToNode(middlePartFrontId);
  applyMaterialToNode(middlePartBackId);

  // Calculations
  // Use opening height as indicated by drawing
  const numOfSlots = Math.floor((values.openingHeight - 7) / shelfSpacing) + 1;
  const slotDepthSpacing = calcSlotDepthSpacing(values.depth);
  const height = values.height * INCH_TO_CM;
  const depth =
    (values.depth - END_PANEL_SIT_BACK_OFFSET - MAT_THICKNESS_INCHES) *
    INCH_TO_CM;

  const spacingDiff = slotDepthSpacing - SLOT_DEFAULT_SPACING;
  const y = ((numOfSlots - 1) * shelfSpacing * INCH_TO_CM) / 2;
  const slotStretchZ = (spacingDiff * INCH_TO_CM) / 2;

  const heightDiff = (height - END_PANEL_MESH_HEIGHT - y * 2) / 4;
  const depthDiff = depth - END_PANEL_MESH_DEPTH - slotStretchZ * 2;

  const extendedBaseAdjZ = values.extendedBaseAdjZ || 0;

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
    { x: 0, y: -y, z: -MAT_THICKNESS_CM }
  );
  window.api.scene.set(
    {
      id: middlePartId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    slotStretchZ + (values.hasSlots ? 0 : INCH_TO_CM)
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
    {
      x: 0,
      y: -y,
      z: slotStretchZ + depthDiff / 4 - MAT_THICKNESS_CM / 2 + extendedBaseAdjZ,
    }
  );
  window.api.scene.set(
    {
      id: middlePartFrontId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    depthDiff / 4 + MAT_THICKNESS_CM / 2 + extendedBaseAdjZ
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
    { x: 0, y: -y, z: -(slotStretchZ + depthDiff / 4) }
  );
  window.api.scene.set(
    {
      id: middlePartBackId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    depthDiff / 4 - MAT_THICKNESS_CM
  );

  // Top mesh
  window.api.scene.set(
    { id: topPartId, plug: 'Transform', property: 'translation' },
    { x: 0, y: y + heightDiff, z: MAT_THICKNESS_CM / 2 + extendedBaseAdjZ }
  );
  window.api.scene.set(
    {
      id: topPartId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    heightDiff
  );
  window.api.scene.set(
    {
      id: topPartId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    depthDiff / 2 + slotStretchZ - MAT_THICKNESS_CM / 2 + extendedBaseAdjZ
  );
  // Bottom mesh
  window.api.scene.set(
    { id: bottomPartId, plug: 'Transform', property: 'translation' },
    { x: 0, y: -(y + heightDiff), z: MAT_THICKNESS_CM / 2 + extendedBaseAdjZ }
  );
  window.api.scene.set(
    {
      id: bottomPartId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    heightDiff
  );
  window.api.scene.set(
    {
      id: bottomPartId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    depthDiff / 2 + slotStretchZ - MAT_THICKNESS_CM / 2 + extendedBaseAdjZ
  );
  return id;
}
/**
 *
 * @param {number} depth In inches
 */
export function calcSlotDepthSpacing(depth) {
  if (depth <= 8) return 3.482;
  if (depth <= 13) return 4;
  if (depth <= 17) return 8;
  if (depth <= 23) return 10;
  if (depth <= 31) return 12;
  if (depth <= 40) return 16;
  return depth / 2;
}
