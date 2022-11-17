import { INCH_TO_M, INCH_TO_CM } from '../constants';
import { getAssetInstanceId, reparent } from '../helper';
import {
  RAIL_MESH_LENGTH,
  GASKET_LOC_MESH_WIDTH,
  GASKET_LOC_MESH_HEIGHT,
  GASKET_LOC_MESH_DEPTH,
  MAT_THICKNESS,
  GASKET_LOC_WRAPPER_HIGHT,
  GASKET_LOC_DEPTH_OFFSET,
  END_RAIL_PLANE_HEIGHT,
  MAT_THICKNESS_INCHES,
} from './constants';
import { updateAssets } from './helper';
import { materialAssigner } from '../materials';
import { Component } from './Component';

const SUPPORT_RAIL_LENGTH_ADJUSTMENT = 2.75;
const RAIL_END_CUT_OFFSET = 2.25;

export class Frame extends Component {
  constructor(frame) {
    super('frame');

    this.reset(frame);
  }

  reset(frame) {
    const assets = {};
    const { width, height, depth, bottomRail, gasketLoc, extensions } = frame;

    const left = extensions && extensions.left;
    const right = extensions && extensions.right;

    const leftExtended = (left && left.type === 'extended' && left.width) || 0;
    const rightExtended =
      (right && right.type === 'extended' && right.width) || 0;

    const leftWidth = (left && left.width) || 0;
    const rightWidth = (right && right.width) || 0;

    function getLeftEndRail() {
      const x = -INCH_TO_M * (width / 2 + leftExtended);
      const z = INCH_TO_M * (depth / 2);
      const y = bottomRail ? 0 : -END_RAIL_PLANE_HEIGHT;

      const length = INCH_TO_M * height;
      const stretch =
        ((length - RAIL_MESH_LENGTH) / 2 +
          (bottomRail ? 0 : END_RAIL_PLANE_HEIGHT)) *
        100;

      return {
        name: 'LeftEndRail',
        data: {
          x,
          y,
          z,
          stretch,
          bottomRail: !!bottomRail,
          gasketLoc: !!gasketLoc,
        },
        build: getNodeForEndRail,
      };
    }

    function getLeftExtRail() {
      const x = -INCH_TO_M * (width / 2);
      const z = INCH_TO_M * (depth / 2);
      const y =
        (bottomRail ? 0 : -END_RAIL_PLANE_HEIGHT / 2) +
        (gasketLoc ? -0.25 * INCH_TO_M : 0);

      const length = INCH_TO_M * (height - SUPPORT_RAIL_LENGTH_ADJUSTMENT);
      const stretch =
        (length -
          RAIL_MESH_LENGTH +
          (bottomRail ? 0 : END_RAIL_PLANE_HEIGHT) -
          (gasketLoc ? 0.5 * INCH_TO_M : 0)) /
        2;

      return {
        name: 'SupportedEndRail',
        data: {
          x,
          y,
          z,
          stretch,
          mirror: true,
        },
        build: getNodeForSupportRail,
      };
    }

    function getRightEndRail() {
      const x = INCH_TO_M * (width / 2 + rightExtended);
      const z = (INCH_TO_M * depth) / 2;
      const y = bottomRail ? 0 : -END_RAIL_PLANE_HEIGHT;

      const length = INCH_TO_M * height;
      const stretch =
        ((length - RAIL_MESH_LENGTH) / 2 +
          (bottomRail ? 0 : END_RAIL_PLANE_HEIGHT)) *
        100;

      return {
        name: 'RightEndRail',
        data: {
          x,
          y,
          z,
          stretch,
          bottomRail: !!bottomRail,
          gasketLoc: !!gasketLoc,
        },
        build: getNodeForEndRail,
      };
    }

    function getRightExtRail() {
      const x = INCH_TO_M * (width / 2);
      const z = INCH_TO_M * (depth / 2);
      const y =
        (bottomRail ? 0 : -END_RAIL_PLANE_HEIGHT / 2) +
        (gasketLoc ? -0.25 * INCH_TO_M : 0);

      const length = INCH_TO_M * (height - SUPPORT_RAIL_LENGTH_ADJUSTMENT);
      const stretch =
        (length -
          RAIL_MESH_LENGTH +
          (bottomRail ? 0 : END_RAIL_PLANE_HEIGHT) -
          (gasketLoc ? 0.5 * INCH_TO_M : 0)) /
        2;

      return {
        name: 'SupportedEndRail',
        data: {
          x,
          y,
          z,
          stretch,
        },
        build: getNodeForSupportRail,
      };
    }

    function getTopRail() {
      const extended = leftExtended || rightExtended;

      const length = INCH_TO_M * (width + extended);
      const x =
        ((left && left.type === 'extended' ? -1 : 1) * (extended * INCH_TO_M)) /
        2;
      const y = (INCH_TO_M * height) / 2;
      const z = (INCH_TO_M * depth) / 2;

      const stretch = ((length - RAIL_MESH_LENGTH) / 2 - MAT_THICKNESS) * 100;

      return {
        name: 'TopRail',
        data: {
          x,
          y,
          z,
          stretch,
        },
        build: getNodeForHorizontalRail,
      };
    }

    function getBottomRail() {
      const extended = leftExtended || rightExtended;

      const length = INCH_TO_M * (width + extended);
      const stretch = ((length - RAIL_MESH_LENGTH) / 2 - MAT_THICKNESS) * 100;
      const x =
        ((left && left.type === 'extended' ? -1 : 1) * (extended * INCH_TO_M)) /
        2;
      const y = INCH_TO_M * (-height / 2);
      const z = INCH_TO_M * (depth / 2);

      return {
        name: 'BottomRail',
        data: {
          x,
          y,
          z,
          stretch,
        },
        build: getNodeForHorizontalRail,
      };
    }

    function getGasketLoc() {
      const leftAdjoined = left && left.type === 'adjoined';
      const rightAdjoined = right && right.type === 'adjoined';
      // Assuming either left or right will be null, this checks if
      // cabinet extended or adjoined
      const extended = leftExtended || rightExtended;

      const stretchX =
        ((width +
          (leftExtended ? left.width : 0) +
          (rightExtended ? right.width : 0)) *
          INCH_TO_M -
          GASKET_LOC_MESH_WIDTH) *
        50;
      const stretchZ =
        (depth * INCH_TO_M - GASKET_LOC_MESH_DEPTH + MAT_THICKNESS / 2) * 50;
      const zOffset = GASKET_LOC_DEPTH_OFFSET - (MAT_THICKNESS / 2) * 50;

      const x =
        (((rightExtended ? right.width : 0) - (leftExtended ? left.width : 0)) /
          2) *
        INCH_TO_M;
      const y = (height * INCH_TO_M) / 2;

      const build = async (id) => {
        const instanceId = await getAssetInstanceId(window.api, id);
        const applyMaterialToNode = materialAssigner(id);

        window.api.scene.set(
          { id, plug: 'Transform', property: 'translation' },
          { x, y, z: 0 }
        );

        // Rails
        const railMeshId = window.api.scene.findNode({
          from: instanceId,
          name: 'CounterRail',
        });

        const railLeftStretch =
          leftExtended || !left ? 0 : leftAdjoined ? left.width : 2;
        const railRightStretch =
          rightExtended || !right ? 0 : rightAdjoined ? right.width : 2;
        const railStretchX =
          stretchX +
          (left || right
            ? ((railRightStretch + railLeftStretch) / 2) * INCH_TO_CM
            : 0);
        window.api.scene.set(
          { id: railMeshId, plug: 'Transform', property: 'translation' },
          {
            x: ((railRightStretch - railLeftStretch) / 2) * INCH_TO_CM,
            y: 0,
            z: zOffset,
          }
        );
        window.api.scene.set(
          {
            id: railMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 1,
            property: 'stretchDistance',
          },
          railStretchX
        );
        window.api.scene.set(
          {
            id: railMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 2,
            property: 'stretchDistance',
          },
          stretchZ
        );
        // // End Cuts
        window.api.scene.set(
          {
            id: railMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 3,
            property: 'center',
          },
          {
            x: -(
              railStretchX +
              (leftWidth ? RAIL_END_CUT_OFFSET : 0) +
              GASKET_LOC_MESH_WIDTH * 50 -
              (left ? (leftExtended || leftAdjoined ? 1 : 2) : 0) * INCH_TO_CM
            ),
            y: 0,
            z: 0,
          }
        );
        window.api.scene.set(
          {
            id: railMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 4,
            property: 'center',
          },
          {
            x:
              0.01 +
              railStretchX +
              (rightWidth ? RAIL_END_CUT_OFFSET : 0) +
              GASKET_LOC_MESH_WIDTH * 50 -
              (right ? (rightExtended || rightAdjoined ? 1 : 2) : 0) *
                INCH_TO_CM,
            y: 0,
            z: 0,
          }
        );
        applyMaterialToNode(railMeshId, 'steel');

        // Countertop Panel
        const panelMeshId = window.api.scene.findNode({
          from: instanceId,
          name: 'Countertop',
        });
        window.api.scene.set(
          { id: panelMeshId, plug: 'Transform', property: 'translation' },
          {
            x:
              0 +
              ((right && !rightExtended
                ? 1
                : rightExtended
                ? -MAT_THICKNESS_INCHES
                : 0) -
                (left && !leftExtended
                  ? 1
                  : leftExtended
                  ? -MAT_THICKNESS_INCHES
                  : 0)) *
                INCH_TO_CM,
            y: 0,
            z: zOffset,
          }
        );
        window.api.scene.set(
          {
            id: panelMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 1,
            property: 'stretchDistance',
          },
          stretchX +
            ((right && !rightExtended
              ? 1
              : rightExtended
              ? -MAT_THICKNESS_INCHES
              : 0) +
              (left && !leftExtended
                ? 1
                : leftExtended
                ? -MAT_THICKNESS_INCHES
                : 0)) *
              INCH_TO_CM
        );
        window.api.scene.set(
          {
            id: panelMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 2,
            property: 'stretchDistance',
          },
          stretchZ
        );
        applyMaterialToNode(panelMeshId, gasketLoc);

        // Gasket
        const gasketMeshId = window.api.scene.findNode({
          from: instanceId,
          name: 'Gasketlock',
        });
        window.api.scene.set(
          { id: gasketMeshId, plug: 'Transform', property: 'translation' },
          {
            x: ((railRightStretch - railLeftStretch) / 2) * INCH_TO_CM,
            y: 0,
            z: zOffset,
          }
        );
        window.api.scene.set(
          {
            id: gasketMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 1,
            property: 'stretchDistance',
          },
          railStretchX
        );
        window.api.scene.set(
          {
            id: gasketMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 2,
            property: 'stretchDistance',
          },
          stretchZ
        );
        window.api.scene.set(
          {
            id: gasketMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 3,
            property: 'center',
          },
          {
            x: -(
              railStretchX +
              GASKET_LOC_MESH_WIDTH * 50 -
              (left ? (leftExtended || leftAdjoined ? 1 : 2) : 0) * INCH_TO_CM
            ),
            y: 0,
            z: 0,
          }
        );
        window.api.scene.set(
          {
            id: gasketMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 4,
            property: 'center',
          },
          {
            x:
              railStretchX +
              GASKET_LOC_MESH_WIDTH * 50 -
              (right ? (rightExtended || rightAdjoined ? 1 : 2) : 0) *
                INCH_TO_CM,
            y: 0,
            z: 0,
          }
        );
        applyMaterialToNode(gasketMeshId, 'plastic');

        // Countertop Front Rail
        const frontRailMeshId = window.api.scene.findNode({
          from: instanceId,
          name: 'Countertop_Rail',
        });
        const frontRailRightExt = right ? right.width || 2 : 0;
        const frontRailLeftExt = left ? left.width || 2 : 0;
        window.api.scene.set(
          { id: frontRailMeshId, plug: 'Transform', property: 'translation' },
          {
            x: ((railRightStretch - railLeftStretch) / 2) * INCH_TO_CM,
            y: 0,
            z: stretchZ + zOffset,
          }
        );
        const frontRailStretch =
          ((width + frontRailRightExt + frontRailLeftExt) * INCH_TO_M -
            GASKET_LOC_MESH_WIDTH) *
          50;
        window.api.scene.set(
          {
            id: frontRailMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 1,
            property: 'stretchDistance',
          },
          frontRailStretch
        );
        // Left cut
        window.api.scene.set(
          {
            id: frontRailMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 2,
            property: 'center',
          },
          {
            x:
              (frontRailStretch +
                GASKET_LOC_MESH_WIDTH * 50 -
                (left
                  ? left.width - (leftExtended || leftAdjoined ? 1 : -1)
                  : 0) *
                  INCH_TO_CM) *
              -1,
            y: 0,
            z: 2 * INCH_TO_CM,
          }
        );
        window.api.scene.set(
          {
            id: frontRailMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 2,
            property: 'rotation',
          },
          {
            x: 0,
            y: leftExtended || leftAdjoined ? 45 : 0,
            z: 0,
          }
        );
        // Right cut
        window.api.scene.set(
          {
            id: frontRailMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 3,
            property: 'center',
          },
          {
            x:
              frontRailStretch +
              GASKET_LOC_MESH_WIDTH * 50 -
              (right
                ? right.width - (rightExtended || rightAdjoined ? 1 : -1)
                : 0) *
                INCH_TO_CM,
            y: 0,
            z: 2 * INCH_TO_CM,
          }
        );
        window.api.scene.set(
          {
            id: frontRailMeshId,
            plug: 'PolyMesh',
            // properties: { type: 'Stretch' },
            operatorIndex: 3,
            property: 'rotation',
          },
          {
            x: 0,
            y: rightExtended || rightAdjoined ? -45 : 0,
            z: 0,
          }
        );
        applyMaterialToNode(frontRailMeshId, 'steel');

        // Caps
        const leftCornerCapId = window.api.scene.findNode({
          from: instanceId,
          name: 'CornerCap_L',
        });
        const leftCornerCapVisible = leftExtended || !left;
        window.api.scene.set(
          { id: leftCornerCapId, plug: 'Properties', property: 'visible' },
          leftCornerCapVisible
        );
        if (leftCornerCapVisible) {
          window.api.scene.set(
            { id: leftCornerCapId, plug: 'Transform', property: 'translation' },
            {
              x:
                -stretchX +
                (leftExtended ? MAT_THICKNESS_INCHES : 0) * INCH_TO_CM,
              y: 0,
              z: -stretchZ + zOffset,
            }
          );
          applyMaterialToNode(leftCornerCapId, 'plastic');
        }
        const rightCornerCapId = window.api.scene.findNode({
          from: instanceId,
          name: 'CornerCap_R',
        });
        const rightCornerCapVisible = rightExtended || !right;
        window.api.scene.set(
          { id: rightCornerCapId, plug: 'Properties', property: 'visible' },
          rightCornerCapVisible
        );
        if (rightCornerCapVisible) {
          window.api.scene.set(
            {
              id: rightCornerCapId,
              plug: 'Transform',
              property: 'translation',
            },
            {
              x:
                stretchX +
                (right ? (0 - MAT_THICKNESS_INCHES) * INCH_TO_CM : 0),
              y: 0,
              z: -stretchZ + zOffset,
            }
          );
          applyMaterialToNode(rightCornerCapId, 'plastic');
        }
        const leftRailCapId = window.api.scene.findNode({
          from: instanceId,
          name: 'RailCap_L',
        });
        window.api.scene.set(
          { id: leftRailCapId, plug: 'Properties', property: 'visible' },
          !left
        );
        window.api.scene.set(
          { id: leftRailCapId, plug: 'Transform', property: 'translation' },
          { x: -stretchX, y: 0, z: stretchZ + zOffset }
        );
        applyMaterialToNode(leftRailCapId, 'plastic');
        const rightRailCapId = window.api.scene.findNode({
          from: instanceId,
          name: 'RailCap_R',
        });
        window.api.scene.set(
          { id: rightRailCapId, plug: 'Properties', property: 'visible' },
          !right
        );
        window.api.scene.set(
          { id: rightRailCapId, plug: 'Transform', property: 'translation' },
          { x: stretchX, y: 0, z: stretchZ + zOffset }
        );
        applyMaterialToNode(rightRailCapId, 'plastic');
        return id;
      };

      return {
        name: 'GasketLoc',
        data: {
          x,
          y,
          stretchX,
          stretchZ,
          left,
          right,
        },
        build,
      };
    }

    if (!(leftExtended && gasketLoc)) assets.leftRail = getLeftEndRail();
    if (!(rightExtended && gasketLoc)) assets.rightRail = getRightEndRail();
    if (leftExtended) {
      assets.leftExtRail = getLeftExtRail();
    }
    if (rightExtended) {
      assets.rightExtRail = getRightExtRail();
    }
    if (!gasketLoc) assets.topRail = getTopRail();
    else assets.gasketLoc = getGasketLoc();
    if (bottomRail) assets.bottomRail = getBottomRail();

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
    return this.id;
  }
}

async function getNodeForEndRail(id, values) {
  const { x, y, z, stretch, bottomRail, gasketLoc } = values;
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
  // 2. Cut top
  window.api.scene.set(
    {
      id: railMeshId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'center',
    },
    {
      x: 0,
      y:
        stretch +
        RAIL_MESH_LENGTH * 50 +
        (bottomRail ? END_RAIL_PLANE_HEIGHT * 100 : 0) -
        (gasketLoc ? GASKET_LOC_WRAPPER_HIGHT - MAT_THICKNESS * 50 : 0),
      z: 0,
    }
  );
  // 3. Cut bottom
  window.api.scene.set(
    {
      id: railMeshId,
      plug: 'PolyMesh',
      operatorIndex: 3,
      property: 'center',
    },
    {
      x: 0,
      y: -(
        stretch +
        RAIL_MESH_LENGTH * 50 -
        (bottomRail ? 0 : END_RAIL_PLANE_HEIGHT * 2 * 100)
      ),
      z: 0,
    }
  );
  applyMaterialToNode(railMeshId, 'steel');
  return id;
}

async function getNodeForSupportRail(id, values) {
  const { x, y, z, stretch, mirror } = values;
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const railMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'Item',
  });
  const supportMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'RailSupport',
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
  window.api.scene.set(
    {
      id: supportMeshId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretch
  );
  // 2. Mirror
  window.api.scene.set(
    { id: railMeshId, plug: 'Transform', property: 'scale' },
    { x: mirror ? -1 : 1, y: 1, z: 1 }
  );
  window.api.scene.set(
    { id: supportMeshId, plug: 'Transform', property: 'scale' },
    { x: mirror ? -1 : 1, y: 1, z: 1 }
  );
  applyMaterialToNode(railMeshId, 'steel');
  applyMaterialToNode(supportMeshId, 'steel');
  return id;
}

async function getNodeForHorizontalRail(id, values) {
  const { x, y, z, stretch } = values;
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
  // 1. stretch
  window.api.scene.set(
    {
      id: railMeshId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretch
  );
  applyMaterialToNode(railMeshId, 'steel');
  return id;
}
