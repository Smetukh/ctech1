import { getAssetInstanceId, reparent } from '../helper';
import { INCH_TO_M, INCH_TO_CM } from '../constants';
import { MAT_THICKNESS_INCHES, RADIUS_THICHNESS } from './constants';
import { updateAssets } from './helper';
import { materialAssigner } from '../materials';
import { Component } from './Component';
import { animation, Player } from '../player';

const TOP_MESH_WIDTH = 12; // In inches
const TOP_MESH_DEPTH = 12; // In inches
const FIXED_TOP_MESH_WIDTH = 24; // In inches
const FIXED_TOP_MESH_DEPTH = 24; // In inches
const TOP_HINGE_DEPTH_ADJ = 0.285; // In inches
const HINGE_MESH_LENGTH = 12; // In inches
const HINGE_WIDTH_ADJ = (0.475 / 2) * INCH_TO_M; //
const HINGE_TOP_MESH_DEFAULT_Y_TRANS = 0.0438; // In Meters
const HINGE_TOP_MESH_DEFAULT_Z_TRANS = 0.1453; // In Meters
const HINGE_NULL_DEFAULT_Y_TRANS = -0.0438; // In Meters
const HINGE_NULL_DEFAULT_Z_TRANS = -0.1453; // In Meters
const HYDRAULIC_MOUNT_ADJ = 10; // In Inches
const INVERTED_TRAY_MESH_WIDTH = 12; // In Inches
const INVERTED_TRAY_MESH_DEPTH = 30; // In Inches
const DROPIN_TRAY_MESH_DEPTH = 12; // In Inches
const DROPIN_TRAY_MESH_WIDTH = 12; // In Inches
const STAINLESS_OVERLAY_MESH_DEPTH = 18; // In Inches
const STAINLESS_OVERLAY_MESH_WIDTH = 18; // In Inches

export class Top extends Component {
  constructor(top, body) {
    super('top');
    this.reset(top, body);
  }

  reset(top, body) {
    const { width, depth, type, surface, tray, finish } = top;
    const { height } = body;

    const assets = {};
    // Map material from json to material name in constants.js
    const traySurfaceMat = getTopSurfaceMat(surface);

    if (type === 'hinged') {
      assets.topAsset = generateHingedTop(top, body);
      assets['Fixed Hinge'] = generateFixedHinge(top, body);
      assets['Left Hydraulic'] = generateHydraulic(top, body, 'left');
      assets['Right Hydraulic'] = generateHydraulic(top, body, 'right');
      assets['Left Mount'] = generateMount(top, body, 'left');
      assets['Right Mount'] = generateMount(top, body, 'right');
    } else if (type === 'inverted') {
      assets.topAsset = {
        // name tells which mesh to use, we could reuse same asset
        // for all posts by applying y-rotation (90*n degree)
        name: 'invertedTop',
        // An id will be added to this object after fetchObjects()
        // id: undefined,
        data: {
          // right now in inches
          translation: {
            x: 0,
            y: (height / 2 + MAT_THICKNESS_INCHES) * INCH_TO_M, // Use post mesh as that is the driver of height
            z: 0,
          },
          rotation: { x: 0, y: 0, z: 0 },
          xStretch: ((width - TOP_MESH_WIDTH) / 2) * INCH_TO_M,
          zStretch: ((depth - TOP_MESH_DEPTH) / 2) * INCH_TO_M,
          mat: surface === 'painted' ? finish && finish.color : traySurfaceMat,
        },
        build: getNodeForNonHingedTop,
      };
    } else if (type === 'fixed') {
      assets.topAsset = {
        // name tells which mesh to use, we could reuse same asset
        // for all posts by applying y-rotation (90*n degree)
        name: 'fixedTop',
        // An id will be added to this object after fetchObjects()
        // id: undefined,
        data: {
          // right now in inches
          translation: {
            x: 0,
            y: (height / 2 + MAT_THICKNESS_INCHES) * INCH_TO_M, // Use post mesh as that is the driver of height
            z: 0,
          },
          rotation: { x: 0, y: 0, z: 0 },
          xStretch: ((width - FIXED_TOP_MESH_WIDTH) / 2) * INCH_TO_M,
          zStretch: ((depth - FIXED_TOP_MESH_DEPTH) / 2) * INCH_TO_M,
          mat: traySurfaceMat,
        },
        build: getNodeForNonHingedTop,
      };
      // Stainless Steel top is now one piece that is corner formed, no longer an overlay
      // if (surface === 'stainless') {
      //   assets.overlay = {
      //     name: 'StainlessSteelOverlay',
      //     data: {
      //       translation: {
      //         x: 0,
      //         y: (height / 2 + MAT_THICKNESS_INCHES - 0.05) * INCH_TO_M,
      //         z: 0,
      //       },
      //       rotation: { x: 0, y: 0, z: 0 },
      //       xStretch: ((width - STAINLESS_OVERLAY_MESH_WIDTH) / 2) * INCH_TO_M,
      //       zStretch: ((depth - STAINLESS_OVERLAY_MESH_DEPTH) / 2) * INCH_TO_M,
      //       mat: traySurfaceMat,
      //     },
      //     build: getNodeForStainlessOverlay,
      //   };
      // }
    }

    if (tray) {
      assets.tray = generateTray(top, body);
    }
    // calculate stretch, transfrom
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

async function getNodeForNonHingedTop(id, values) {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const { translation, rotation, xStretch, zStretch, mat } = values;

  const topId = window.api.scene.findNode({
    from: instanceId,
    name: 'Top',
  });
  const bottomId = window.api.scene.findNode({
    from: instanceId,
    name: 'Bottom',
  });

  [topId, bottomId].forEach((meshId) => {
    // 0. Translate
    window.api.scene.set(
      { id, plug: 'Transform', property: 'translation' },
      translation
    );
    // 1. rotation
    window.api.scene.set(
      { id, plug: 'Transform', property: 'rotation' },
      rotation
    );
    // 2. Stretch X
    window.api.scene.set(
      {
        id: meshId,
        plug: 'PolyMesh',
        properties: { type: 'Stretch', axis: 1 },
        property: 'stretchDistance',
      },
      xStretch
    );
    // 3. Stretch Z
    window.api.scene.set(
      {
        id: meshId,
        plug: 'PolyMesh',
        properties: { type: 'Stretch', axis: 3 },
        property: 'stretchDistance',
      },
      zStretch
    );
  });

  await applyMaterialToNode(topId, mat);
  await applyMaterialToNode(bottomId, mat);

  //* need to return id so after build mesh the
  //* caller can reparent this to caller's null
  return id;
};

async function getNodeForStainlessOverlay(id, values) {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const { translation, rotation, xStretch, zStretch, mat } = values;
  const overlayMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'Overlay',
  });

  // 0. Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );
  // 1. rotation
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    rotation
  );
  // 2. Stretch X
  window.api.scene.set(
    {
      id: overlayMeshId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch', axis: 1 },
      property: 'stretchDistance',
    },
    xStretch
  );
  // 3. Stretch Z
  window.api.scene.set(
    {
      id: overlayMeshId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch', axis: 3 },
      property: 'stretchDistance',
    },
    zStretch
  );

  if (mat) {
    applyMaterialToNode(overlayMeshId, mat);
  } else {
    applyMaterialToNode(overlayMeshId);
  }

  //* need to return id so after build mesh the
  //* caller can reparent this to caller's null
  return id;
};

function generateTray(top, body) {
  const { hingeSide, tray, surface, type } = top;
  const { height, depth, width } = body;
  let newTray = {};

  let yRot = 0;

  switch (hingeSide) {
    case 'left':
      yRot = 0;
      break;
    case 'front':
      yRot = 90;
      break;
    case 'right':
      yRot = 180;
      break;
    case 'rear':
      yRot = 270;
      break;
    default:
      yRot = 0;
  }

  // Map material from json to material name in constants.js
  const traySurfaceMat = type === 'hinged' ? null : getTopSurfaceMat(surface);

  if (tray === 'inverted') {
    newTray = {
      name: 'InvertedTray',
      data: {
        translation: {
          x: 0,
          y: (height / 2 + MAT_THICKNESS_INCHES) * INCH_TO_M, // Use post mesh as that is the driver of height
          z: 0,
        },
        rotation: { x: 0, y: yRot, z: 0 },
        xStretch: ((width - INVERTED_TRAY_MESH_WIDTH) / 2) * INCH_TO_M,
        zStretch: ((depth - INVERTED_TRAY_MESH_DEPTH) / 2) * INCH_TO_M,
        mat: traySurfaceMat,
      },
      build: getNodeForTray,
    };
  } else if (tray === 'drop-in') {
    newTray = {
      name: 'DropInTray',
      data: {
        translation: {
          x: 0,
          y: (height / 2 + MAT_THICKNESS_INCHES - 1.91) * INCH_TO_M, // Use post mesh as that is the driver of height
          z: 0,
        },
        rotation: { x: 0, y: yRot, z: 0 },
        xStretch: ((width - DROPIN_TRAY_MESH_WIDTH - 0.22) / 2) * INCH_TO_M,
        zStretch: ((depth - DROPIN_TRAY_MESH_DEPTH - 0.22) / 2) * INCH_TO_M,
        mat: traySurfaceMat,
      },
      build: getNodeForTray,
    };
  }
  return newTray;
}

async function getNodeForTray(id, values) {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const { translation, rotation, xStretch, zStretch, mat } = values;
  const trayMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'Tray',
  });

  // 0. Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );
  // 1. rotation
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    rotation
  );
  // 2. Stretch X
  window.api.scene.set(
    {
      id: trayMeshId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch', axis: 1 },
      property: 'stretchDistance',
    },
    xStretch
  );
  // 3. Stretch Z
  window.api.scene.set(
    {
      id: trayMeshId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch', axis: 3 },
      property: 'stretchDistance',
    },
    zStretch
  );

  if (mat) {
    applyMaterialToNode(trayMeshId, mat);
  } else {
    applyMaterialToNode(trayMeshId);
  }

  //* need to return id so after build mesh the
  //* caller can reparent this to caller's null
  return id;
};

function generateFixedHinge(top, body) {
  const { hingeSide } = top;
  const bodyHeight = body.height;
  const bodyDepth = body.depth;
  const bodyWidth = body.width;

  let yRot = 0;
  let xTrans = 0; // Transformation multipliers
  let zTrans = 0;
  switch (hingeSide) {
    case 'left':
      yRot = 0;
      xTrans = 0;
      zTrans = -1;
      break;
    case 'front':
      yRot = 90;
      xTrans = -1;
      zTrans = 0;
      break;
    case 'right':
      yRot = 180;
      xTrans = 0;
      zTrans = 1;
      break;
    case 'rear':
      yRot = 270;
      xTrans = 1;
      zTrans = 0;
      break;
    default:
      yRot = 0;
  }

  const fixedHinge = {
    // name tells which mesh to use, we could reuse same asset
    // for all posts by applying y-rotation (90*n degree)
    name: 'FixedHinge',
    // An id will be added to this object after fetchObjects()
    // id: undefined,
    data: {
      // right now in inches
      translation: {
        x: xTrans * (bodyWidth / 2) * INCH_TO_M,
        y: (bodyHeight / 2) * INCH_TO_M, // Use post mesh as that is the driver of height
        z: zTrans * (bodyDepth / 2) * INCH_TO_M,
      },
      rotation: { x: 0, y: yRot, z: 0 },
      xStretch:
        ((bodyWidth - 2 * RADIUS_THICHNESS - HINGE_MESH_LENGTH) / 2) *
        INCH_TO_M,
    },
    build: getNodeForHinge,
  };

  return fixedHinge;
}

async function getNodeForHinge(id, values) {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const { translation, rotation, xStretch } = values;
  const hingeMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'Hinge',
  });

  // 0. Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );
  // 1. rotation
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    rotation
  );
  // 2. Stretch X
  window.api.scene.set(
    {
      id: hingeMeshId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch', axis: 1 },
      property: 'stretchDistance',
    },
    xStretch
  );

  applyMaterialToNode(hingeMeshId, 'steel');

  //* need to return id so after build mesh the
  //* caller can reparent this to caller's null
  return id;
};

function generateHydraulic(top, body, sideName) {
  const { hingeSide } = top;
  const bodyHeight = body.height;
  const bodyDepth = body.depth;
  const bodyWidth = body.width;

  let yRot = 0;
  let xTranslation = 0;
  let zTranslation = 0;
  const sideDir = sideName === 'left' ? -1 : 1; // Direction multiplier for adjust left/right
  switch (hingeSide) {
    case 'left':
      xTranslation = sideDir * ((bodyWidth - 1.7) / 2) * INCH_TO_M;
      zTranslation = (-(bodyDepth / 2) + HYDRAULIC_MOUNT_ADJ) * INCH_TO_M;
      yRot = 90;
      break;
    case 'front':
      xTranslation = (-(bodyWidth / 2) + HYDRAULIC_MOUNT_ADJ) * INCH_TO_M;
      zTranslation = sideDir * ((bodyDepth - 1.7) / 2) * INCH_TO_M;
      yRot = 180;
      break;
    case 'right':
      xTranslation = -sideDir * ((bodyWidth - 1.7) / 2) * INCH_TO_M;
      zTranslation = (bodyDepth / 2 - HYDRAULIC_MOUNT_ADJ) * INCH_TO_M;
      yRot = 270;
      break;
    case 'rear':
      xTranslation = (bodyWidth / 2 - HYDRAULIC_MOUNT_ADJ) * INCH_TO_M;
      zTranslation = -sideDir * ((bodyDepth - 1.7) / 2) * INCH_TO_M;
      yRot = 0;
      break;
    default:
      yRot = 0;
  }

  const hydraulic = {
    // name tells which mesh to use, we could reuse same asset
    // for all posts by applying y-rotation (90*n degree)
    name: 'TopHydraulic',
    // An id will be added to this object after fetchObjects()
    // id: undefined,
    data: {
      // right now in inches
      translation: {
        x: xTranslation,
        y: (bodyHeight / 2 - 0.9) * INCH_TO_M, // Use post mesh as that is the driver of height
        z: zTranslation,
      },
      rotation: { x: 0, y: yRot, z: 0 },
    },
    build: getNodeForHydraulic,
  };

  return hydraulic;
}

async function getNodeForHydraulic(id, values) {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const { translation, rotation } = values;
  const extensionId = window.api.scene.findNode({
    from: instanceId,
    name: 'Extension',
  });
  const nullId = window.api.scene.findNode({
    from: instanceId,
    name: 'HydraulicNull',
  });

  // 0. Translated
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );
  // 1. rotation
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    rotation
  );
  // 2. Retract Extension for Closed Default
  window.api.scene.set(
    { id: extensionId, plug: 'Transform', property: 'translation' },
    {
      // x: 0,
      x: 0,
      y: 0,
      z: 0,
    }
  );
  window.api.scene.set(
    { id: nullId, plug: 'Transform', property: 'rotation' },
    { x: 0, y: 0, z: 0 }
  );

  applyMaterialToNode(extensionId, 'steel');

  if (!animation.getPlayer(id)) {
    const player = new Player('topHydraulic', 'close', 1000);
    player.addAction(playHyd(instanceId));
    animation.linkPlayer(id, player);
  }

  //* need to return id so after build mesh the
  //* caller can reparent this to caller's null
  return id;
};

function generateMount(top, body, sideName) {
  const { hingeSide } = top;
  const bodyHeight = body.height;
  const bodyDepth = body.depth;
  const bodyWidth = body.width;

  let yRot = 0;
  let xTranslation = 0;
  let zTranslation = 0;
  const sideDir = sideName === 'left' ? -1 : 1; // Direction multiplier for adjust left/right
  const mirrorDir = sideName === 'left' ? 0 : 1;
  switch (hingeSide) {
    case 'left':
      xTranslation = sideDir * ((bodyWidth - 2.57) / 2) * INCH_TO_M;
      zTranslation = (-(bodyDepth / 2) + HYDRAULIC_MOUNT_ADJ) * INCH_TO_M;
      yRot = -90 + 180 * mirrorDir;
      break;
    case 'front':
      xTranslation = (-(bodyWidth / 2) + HYDRAULIC_MOUNT_ADJ) * INCH_TO_M;
      zTranslation = sideDir * ((bodyDepth - 2.57) / 2) * INCH_TO_M;
      yRot = 0 + 180 * mirrorDir;
      break;
    case 'right':
      xTranslation = -sideDir * ((bodyWidth - 2.57) / 2) * INCH_TO_M;
      zTranslation = (bodyDepth / 2 - HYDRAULIC_MOUNT_ADJ) * INCH_TO_M;
      yRot = 90 + 180 * mirrorDir;
      break;
    case 'rear':
      xTranslation = (bodyWidth / 2 - HYDRAULIC_MOUNT_ADJ) * INCH_TO_M;
      zTranslation = -sideDir * ((bodyDepth - 2.57) / 2) * INCH_TO_M;
      yRot = 180 + 180 * mirrorDir;
      break;
    default:
      yRot = 0;
  }

  const mount = {
    // name tells which mesh to use, we could reuse same asset
    // for all posts by applying y-rotation (90*n degree)
    name: 'HydraulicMount',
    // An id will be added to this object after fetchObjects()
    // id: undefined,
    data: {
      // right now in inches
      translation: {
        x: xTranslation,
        y: (bodyHeight / 2 - 1.9) * INCH_TO_M, // Use post mesh as that is the driver of height
        z: zTranslation,
      },
      rotation: { x: 0, y: yRot, z: 0 },
    },
    build: getNodeForMount,
  };

  return mount;
}

async function getNodeForMount(id, values) {
  // const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const { translation, rotation } = values;

  // 0. Translated
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );
  // 1. rotation
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    rotation
  );

  applyMaterialToNode(id, 'steel');

  //* need to return id so after build mesh the
  //* caller can reparent this to caller's null
  return id;
};

function generateHingedTop(top, body) {
  const { width, depth, hingeSide, surface } = top;
  const { height } = body;
  let yRot = 0;
  let hingeYAdjust = 0.135;
  let hingeZAdjust = 0.09;
  switch (hingeSide) {
    case 'left':
      yRot = 0;
      break;
    case 'front':
      yRot = 90;
      break;
    case 'right':
      yRot = 180;
      break;
    case 'rear':
      yRot = 270;
      break;
    default:
      yRot = 0;
  }
  // Add adjustment for Y and Z
  hingeYAdjust = 0.135;
  hingeZAdjust = 0.09;

  const topAsset = {
    // name tells which mesh to use, we could reuse same asset
    // for all posts by applying y-rotation (90*n degree)
    name: 'hingedTop',
    // An id will be added to this object after fetchObjects()
    // id: undefined,
    data: {
      // right now in inches
      translation: {
        x: 0,
        y: (height / 2 + MAT_THICKNESS_INCHES + hingeYAdjust) * INCH_TO_M, // Use post mesh as that is the driver of height
        z: hingeZAdjust * INCH_TO_M,
      },
      rotation: { x: 0, y: yRot, z: 0 },
      xStretch: ((width - TOP_MESH_WIDTH) / 2) * INCH_TO_M,
      zStretch: ((depth - TOP_MESH_DEPTH) / 2) * INCH_TO_M,
      mat: getTopSurfaceMat(surface),
    },
    build: getNodeForHingedTop,
  };

  return topAsset;
}

async function getNodeForHingedTop(id, values) {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const { translation, rotation, xStretch, zStretch, mat } = values;

  const hingeNullId = window.api.scene.findNode({
    from: instanceId,
    name: 'HingeNull',
  });

  const topId = window.api.scene.findNode({
    from: instanceId,
    name: 'Top',
  });
  const bottomId = window.api.scene.findNode({
    from: instanceId,
    name: 'Bottom',
  });
  const pivotsId = window.api.scene.findNode({
    from: instanceId,
    name: 'Pivots',
  });
  const backHingeId = window.api.scene.findNode({
    from: instanceId,
    name: 'BackHinge',
  });

  // 0. Translate main null
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );
  // 1. Totation main null
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    rotation
  );

  [topId, bottomId].forEach((meshId) => {
    // 2. Stretch X of TopMesh
    window.api.scene.set(
      {
        id: meshId,
        plug: 'PolyMesh',
        properties: { type: 'Stretch', axis: 1 },
        property: 'stretchDistance',
      },
      xStretch
    );
    // 3. Stretch Z
    window.api.scene.set(
      {
        id: meshId,
        plug: 'PolyMesh',
        properties: { type: 'Stretch', axis: 3 },
        property: 'stretchDistance',
      },
      zStretch
    );
    // 4. Translate Z of TopMesh relative to hinge null
    window.api.scene.set(
      { id: meshId, plug: 'Transform', property: 'translation' },
      {
        x: 0,
        y: HINGE_TOP_MESH_DEFAULT_Y_TRANS,
        z: HINGE_TOP_MESH_DEFAULT_Z_TRANS + zStretch,
      }
    );
  });

  [pivotsId, backHingeId].forEach((meshId) => {
    // 2. Stretch X of TopMesh
    window.api.scene.set(
      {
        id: meshId,
        plug: 'PolyMesh',
        properties: { type: 'Stretch', axis: 1 },
        property: 'stretchDistance',
      },
      xStretch
    );
  });
  // 4. Translate Z of TopMesh relative to hinge null
  window.api.scene.set(
    { id: pivotsId, plug: 'Transform', property: 'translation' },
    {
      x: 0,
      y: HINGE_TOP_MESH_DEFAULT_Y_TRANS,
      z: HINGE_TOP_MESH_DEFAULT_Z_TRANS - 0.005, // Hinge Placement does not depend on ZStretch
    }
  );
  window.api.scene.set(
    { id: backHingeId, plug: 'Transform', property: 'translation' },
    {
      x: 0,
      y: HINGE_TOP_MESH_DEFAULT_Y_TRANS,
      z: HINGE_TOP_MESH_DEFAULT_Z_TRANS, // Hinge Placement does not depend on ZStretch
    }
  );
  // 5. Translate Hinge Null to align with new desired location
  window.api.scene.set(
    { id: hingeNullId, plug: 'Transform', property: 'translation' },
    {
      x: 0,
      y: HINGE_NULL_DEFAULT_Y_TRANS,
      z: HINGE_NULL_DEFAULT_Z_TRANS - zStretch,
    }
  );
  applyMaterialToNode(topId, mat);
  applyMaterialToNode(bottomId, mat !== 'BrushedSteel' ? mat : undefined);
  if (!animation.getPlayer(id)) {
    const player = new Player('hingedTop', 'close', 1000);
    player.addAction(playTop(instanceId));
    animation.linkPlayer(id, player);
  }

  //* need to return id so after build mesh the
  //* caller can reparent this to caller's null
  return id;
};

const TOP_ROTATION = 32;
const DEFAULT_TOP_ROTATION_X = 0;

function playTop(instanceId) {
  const hingeId = window.api.scene.findNode({
    from: instanceId,
    name: 'HingeNull',
  });

  function frame(progress, frames) {
    const increment = TOP_ROTATION / frames;
    const currentX = DEFAULT_TOP_ROTATION_X - progress * increment;
    window.api.scene.set(
      {
        id: hingeId,
        plug: 'Transform',
        property: 'rotation',
      },
      {
        x: currentX,
        y: 0,
        z: 0,
      }
    );
  }

  return frame;
}

const TOP_RELATIVE_ANGLE_DEG = -7.75; // Angle of Top's hinge to top hydraulic mount in degrees
const TOP_RELATIVE_ANGLE_RAD = (TOP_RELATIVE_ANGLE_DEG * Math.PI) / 180; // Angle of Top's hinge to top hydraulic mount in radians
const a = 10.71; // Dist inches X-Direction from Top's hinge to rail hydraulic mount
const b = 4.72; // Dist inches from Top's hinge to mount for hydraulic to the top
const HYD_LENGTH = 6.03; // Dist from Top hydraulic mount to rail hydraulic mount, default length of hydraulic with extension translation at 0

function playHyd(instanceId) {
  const extId = window.api.scene.findNode({
    from: instanceId,
    name: 'Extension',
  });
  const hydNullId = window.api.scene.findNode({
    from: instanceId,
    name: 'HydraulicNull',
  });

  function frame(progress, frames) {
    const incrementX = TOP_ROTATION / frames;
    // Base all math off top having constant rate of rotation
    const topAngle = DEFAULT_TOP_ROTATION_X - progress * incrementX;
    const topAngleRel = topAngle + TOP_RELATIVE_ANGLE_DEG;
    const topAngleRad = (topAngleRel * Math.PI) / 180; // Get angle in radians
    // Calculate needed extension of hydraulic piece from default
    const currentXInches =
      Math.sqrt(
        Math.pow(a - b * Math.cos(-topAngleRad), 2) +
          Math.pow(
            b * Math.sin(-topAngleRad) - b * Math.sin(-TOP_RELATIVE_ANGLE_RAD),
            2
          )
      ) - HYD_LENGTH;
    const currentXM = currentXInches * INCH_TO_M;
    // Calculate rotation of hydraulic piece in degrees
    const currentZRot =
      Math.asin(
        (b * Math.sin(-topAngleRad) - b * Math.sin(-TOP_RELATIVE_ANGLE_RAD)) /
          (currentXInches + HYD_LENGTH)
      ) *
      (180 / Math.PI);
    window.api.scene.set(
      {
        id: extId,
        plug: 'Transform',
        property: 'translation',
      },
      {
        x: currentXM,
        y: 0,
        z: 0,
      }
    );
    window.api.scene.set(
      {
        id: hydNullId,
        plug: 'Transform',
        property: 'rotation',
      },
      {
        x: 0,
        y: 0,
        z: currentZRot,
      }
    );
  }

  return frame;
}

function getTopSurfaceMat(topSurface) {
  switch (topSurface) {
    case 'sanded':
      return 'BrushedSteel';
    case 'stainless':
      return 'steel';
    default:
      return null;
  }
}