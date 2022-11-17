import {
  DOOR_HINGE_OFFSET,
  DOOR_Z_OFFSET,
  DOOR_MESH_OFFSET,
  DOOR_SET_WIDTH,
  DOOR_SET_HEIGHT,
  GAS_SPRING_X_ADJUSTMENT,
  GAS_SPRING_Y_ADJUSTMENT,
  GAS_SPRING_Z_ADJUSTMENT,
} from './constants';
import { INCH_TO_M } from '../constants';
import { getAssetInstanceId, reparent } from '../helper';
import { materialAssigner } from '../materials';
import { animation, Player } from '../player';
import { updateAssets } from './helper';
import { Component } from './Component';

export class Door extends Component {
  constructor(contents) {
    super('door');

    this.translation = {};
    this.rotation = {};

    this.reset(contents);
  }

  reset(contents) {
    const assets = {};

    const { data, boundry } = contents;
    const handleType = data.handle.type;
    let pair = false;
    let rotationZ;
    let switchXY = false;
    if (data.handle.swing === 'right') {
      rotationZ = 180;
    } else if (data.handle.swing === 'top') {
      rotationZ = -90;
      switchXY = true;
    } else if (data.handle.swing === 'bottom') {
      rotationZ = 90;
      switchXY = true;
    } else if (data.handle.swing === 'pair') {
      pair = true;
    }
    const verticalDiff = boundry.height - data.height;

    this.translation = {
      x: switchXY
        ? 0
        : DOOR_HINGE_OFFSET * INCH_TO_M * (rotationZ === 180 ? 1 : -1),
      y:
        ((boundry.height - data.height) / 2 +
          (data.handle.swing === 'top'
            ? 0
            : data.handle.swing === 'bottom'
            ? -verticalDiff
            : data.handle.swing === 'right'
            ? -(boundry.height - data.height) / 2 + 0.0625
            : -(boundry.height - data.height) / 2)) *
        INCH_TO_M,
      z: (boundry.depth / 2 + DOOR_Z_OFFSET) * INCH_TO_M,
    };
    this.rotation = {
      x: 0,
      y: 0,
      z: rotationZ,
    };

    const isTriggerLatch = handleType === 'triggerLatch';
    const doorName = isTriggerLatch
      ? contents.ChassisDoor
        ? 'ChassisTriggerLatchDoor'
        : 'TriggerLatchDoor'
      : 'Door';
    const doorBuildFunc = isTriggerLatch
      ? getNodeForTriggerLatchDoorAsset
      : getNodeForDoorAsset;

    const doorAsset = {
      name: doorName,
      data: {
        type: pair ? 'Pair of Doors' : doorName,
        width: pair
          ? (boundry.width - 0.25) / 2
          : switchXY
          ? data.height
          : data.width,
        height: pair ? data.height : switchXY ? data.width : data.height,
        switchXY,
      },
      build: doorBuildFunc,
    };
    assets.doorAsset = doorAsset;

    if (pair) {
      // Adds in the second door when Pair of Doors is selected
      const doorAsset2 = {
        name: doorName,
        data: {
          type: 'Second Door',
          width: (boundry.width - 0.25) / 2,
          height: data.height,
          switchXY,
        },
        build: doorBuildFunc,
      };
      assets.doorAsset2 = doorAsset2;
    }

    // Create gas spring
    const hasGasSpring = handleType === 'MotionLatch' && switchXY;
    if (hasGasSpring) {
      const gasSpringLeftAsset = {
        name: 'GasSpringLeft',
        data: {
          rotationY: 180,
          rotationZ: 90,
          x: (INCH_TO_M * boundry.width) / 2 - GAS_SPRING_X_ADJUSTMENT,
          y: -((INCH_TO_M * boundry.height) / 2 - GAS_SPRING_Y_ADJUSTMENT),
          z: -GAS_SPRING_Z_ADJUSTMENT,
        },
        build: getNodeForGasSpring,
      };
      const gasSpringRightAsset = {
        name: 'GasSpringRight',
        data: {
          rotationY: 180,
          rotationZ: 90,
          x: -(INCH_TO_M * boundry.width) / 2 + GAS_SPRING_X_ADJUSTMENT,
          y: -((INCH_TO_M * boundry.height) / 2 - GAS_SPRING_Y_ADJUSTMENT),
          z: -GAS_SPRING_Z_ADJUSTMENT,
        },
        build: getNodeForGasSpring,
      };
      assets.gasSpringLeftAsset = gasSpringLeftAsset;
      assets.gasSpringRightAsset = gasSpringRightAsset;
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

    window.api.scene.set(
      { id: this.id, plug: 'Transform', property: 'translation' },
      this.translation
    );
    window.api.scene.set(
      { id: this.id, plug: 'Transform', property: 'rotation' },
      this.rotation
    );
    reparent(window.api, this.id, ...partNodes);
    this.initialized = true;
    return this.id;
  }
}

async function getNodeForDoorAsset(id, values) {
  const width = INCH_TO_M * values.width;
  const height = INCH_TO_M * values.height;
  const stretchX = (width - DOOR_SET_WIDTH) * 50;
  const stretchY = (height - DOOR_SET_HEIGHT) * 50;
  const x = 2 * stretchX;

  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);

  let pair = false;
  let secondDoor = false;
  if (values.type === 'Pair of Doors' || values.type === 'Second Door') {
    pair = true;
  }
  if (values.type === 'Second Door') {
    secondDoor = true;
  }
  // 0
  window.api.scene.set(
    {
      id,
      plug: 'Transform',
      property: 'translation',
    },
    {
      x: pair
        ? secondDoor
          ? width + 0.125 * INCH_TO_M
          : (-width / 2 + (DOOR_SET_WIDTH / 2 - DOOR_MESH_OFFSET / 100)) * 2 -
            0.125 * INCH_TO_M
        : -width / 2 + (DOOR_SET_WIDTH / 2 - DOOR_MESH_OFFSET / 100),
      y: pair ? (secondDoor ? +0.078125 * INCH_TO_M : 0) : 0,
      z: 0,
    }
  );
  window.api.scene.set(
    {
      id,
      plug: 'Transform',
      property: 'rotation',
    },
    {
      x: 0,
      y: 0,
      z: secondDoor ? 180 : 0,
    }
  );
  // 1 Numbs
  const topNumbId = window.api.scene.findNode({
    from: instanceId,
    name: 'NumbTop',
  });
  const bottomNumbId = window.api.scene.findNode({
    from: instanceId,
    name: 'NumbBottom',
  });
  window.api.scene.set(
    { id: topNumbId, plug: 'Transform', property: 'translation' },
    { x, y: stretchY, z: 0 }
  );
  window.api.scene.set(
    { id: bottomNumbId, plug: 'Transform', property: 'translation' },
    { x, y: -stretchY, z: 0 }
  );
  applyMaterialToNode(topNumbId, 'plastic');
  applyMaterialToNode(bottomNumbId, 'plastic');
  // 2 End Caps
  const topEndCapId = window.api.scene.findNode({
    from: instanceId,
    name: 'EndCapTop',
  });
  const bottomEndCapId = window.api.scene.findNode({
    from: instanceId,
    name: 'EndCapBottom',
  });
  window.api.scene.set(
    { id: topEndCapId, plug: 'Transform', property: 'translation' },
    { x, y: stretchY, z: 0 }
  );
  window.api.scene.set(
    { id: bottomEndCapId, plug: 'Transform', property: 'translation' },
    { x, y: -stretchY, z: 0 }
  );
  applyMaterialToNode(topEndCapId, 'plastic');
  applyMaterialToNode(bottomEndCapId, 'plastic');
  // 3 Door base
  const doorBaseId = window.api.scene.findNode({
    from: instanceId,
    name: 'Door_Base',
  });
  window.api.scene.set(
    {
      id: doorBaseId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchY
  );
  window.api.scene.set(
    { id: doorBaseId, plug: 'Transform', property: 'translation' },
    { x, y: 0, z: 0 }
  );
  applyMaterialToNode(doorBaseId, 'steel');
  // 4 Door handle
  const doorHandleId = window.api.scene.findNode({
    from: instanceId,
    name: 'DoorHandle',
  });
  window.api.scene.set(
    {
      id: doorHandleId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchY
  );
  window.api.scene.set(
    { id: doorHandleId, plug: 'Transform', property: 'translation' },
    { x, y: 0, z: 0 }
  );
  applyMaterialToNode(doorHandleId, 'steel');
  // 5 Door skin
  const doorSkinId = window.api.scene.findNode({
    from: instanceId,
    name: 'DoorSkin',
  });
  window.api.scene.set(
    {
      id: doorSkinId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      // properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: doorSkinId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      // properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchY
  );
  window.api.scene.set(
    { id: doorSkinId, plug: 'Transform', property: 'translation' },
    { x: stretchX, y: 0, z: 0 }
  );
  applyMaterialToNode(doorSkinId);
  // 6 Door back
  const doorBackId = window.api.scene.findNode({
    from: instanceId,
    name: 'DoorBack',
  });
  window.api.scene.set(
    {
      id: doorBackId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      // properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: doorBackId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      // properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchY
  );
  window.api.scene.set(
    { id: doorBackId, plug: 'Transform', property: 'translation' },
    { x: stretchX, y: 0, z: 0 }
  );
  applyMaterialToNode(doorBackId, 'WH');
  // Hinges
  // // Door side hinge
  const doorSideHingeId = window.api.scene.findNode({
    from: instanceId,
    name: 'DoorSideHinge',
  });
  const offsetHingeBottomId = window.api.scene.findNode({
    from: instanceId,
    name: 'Offset_Hinge_Bottom',
  });
  // // Frame side hinge
  const frameSideHingeId = window.api.scene.findNode({
    from: instanceId,
    name: 'FrameSideHinge',
  });
  const offsetHingeTopId = window.api.scene.findNode({
    from: instanceId,
    name: 'Offset_Hinge_Top',
  });
  applyMaterialToNode(doorSideHingeId, 'steel');
  applyMaterialToNode(offsetHingeBottomId, 'steel');
  applyMaterialToNode(frameSideHingeId, 'steel');
  applyMaterialToNode(offsetHingeTopId, 'steel');

  // visibility
  window.api.scene.set(
    { id: doorSideHingeId, plug: 'Properties', property: 'visible' },
    !values.switchXY
  );
  window.api.scene.set(
    { id: offsetHingeBottomId, plug: 'Properties', property: 'visible' },
    !!values.switchXY
  );
  window.api.scene.set(
    { id: frameSideHingeId, plug: 'Properties', property: 'visible' },
    !values.switchXY
  );
  window.api.scene.set(
    { id: offsetHingeTopId, plug: 'Properties', property: 'visible' },
    !!values.switchXY
  );

  // Calculation
  if (values.switchXY) {
    // window.api.scene.set(
    //   {
    //     id: offsetHingeBottomId,
    //     plug: 'PolyMesh',
    //     properties: { type: 'Array' },
    //     property: 'count',
    //   },
    //   height / 0.04
    // );
    // window.api.scene.set(
    //   { id: offsetHingeBottomId, plug: 'Transform', property: 'translation' },
    //   { x: 0, y: -stretchY, z: 0 }
    // );
    window.api.scene.set(
      {
        id: offsetHingeBottomId,
        plug: 'PolyMesh',
        properties: { type: 'Stretch' },
        property: 'stretchDistance',
      },
      stretchY
    );

    window.api.scene.set(
      {
        id: offsetHingeTopId,
        plug: 'PolyMesh',
        properties: { type: 'Stretch' },
        property: 'stretchDistance',
      },
      stretchY
    );
  } else {
    window.api.scene.set(
      {
        id: doorSideHingeId,
        plug: 'PolyMesh',
        properties: { type: 'Stretch' },
        property: 'stretchDistance',
      },
      stretchY
    );

    window.api.scene.set(
      {
        id: frameSideHingeId,
        plug: 'PolyMesh',
        properties: { type: 'Stretch' },
        property: 'stretchDistance',
      },
      stretchY
    );
  }
  // Animation
  if (!animation.getPlayer(id)) {
    const player = new Player('door', 'close', 1000);
    player.addAction(playDoor(instanceId));
    animation.linkPlayer(id, player);
  }

  return id;
}

async function getNodeForGasSpring(id, values) {
  const instanceId = await getAssetInstanceId(window.api, id);
  // 0 Rotation
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    {
      x: 0,
      y: values.rotationY,
      z: values.rotationZ,
    }
  );

  // 1 Translation
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    {
      x: values.y,
      y: values.x,
      z: values.z,
    }
  );

  // Animation
  if (!animation.getPlayer(id)) {
    const player = new Player(values.name, 'close', 1000);
    player.addAction(playGasSpring(instanceId));
    animation.linkPlayer(id, player);
  }
  return id;
}

async function getNodeForTriggerLatchDoorAsset(id, values) {
  const width = INCH_TO_M * values.width;
  const height = INCH_TO_M * values.height;
  const stretchX = (width - 0.32385) * 50;
  const stretchY = (height - 0.2413) * 50;

  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);

  let pair = false;
  let secondDoor = false;
  if (values.type === 'Pair of Doors' || values.type === 'Second Door') {
    pair = true;
  }
  if (values.type === 'Second Door') {
    secondDoor = true;
  }
  // 0
  window.api.scene.set(
    {
      id,
      plug: 'Transform',
      property: 'translation',
    },
    {
      x: pair
        ? secondDoor
          ? width + 0.125 * INCH_TO_M
          : (-width / 2 + 0.32385 / 2) * 2 - 0.125 * INCH_TO_M
        : -width / 2,
      y: pair ? (secondDoor ? +0.078125 * INCH_TO_M : 0) : 0,
      z: 0,
    }
  );
  window.api.scene.set(
    {
      id,
      plug: 'Transform',
      property: 'rotation',
    },
    {
      x: 0,
      y: 0,
      z: secondDoor ? 180 : 0,
    }
  );
  // 1 Door skin top
  const topDoorSkinId = window.api.scene.findNode({
    from: instanceId,
    name: 'DoorSkinTop',
  });
  window.api.scene.set(
    {
      id: topDoorSkinId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: topDoorSkinId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    stretchY / 2
  );
  window.api.scene.set(
    { id: topDoorSkinId, plug: 'Transform', property: 'translation' },
    { x: stretchX, y: stretchY / 2, z: 0 }
  );
  applyMaterialToNode(topDoorSkinId);
  // 2 Latch Pieces
  const latch1Id = window.api.scene.findNode({
    from: instanceId,
    name: 'Latch1',
  });
  window.api.scene.set(
    { id: latch1Id, plug: 'Transform', property: 'translation' },
    { x: 2 * stretchX, y: 0, z: 0 }
  );
  const latch2Id = window.api.scene.findNode({
    from: instanceId,
    name: 'Latch2',
  });
  window.api.scene.set(
    { id: latch2Id, plug: 'Transform', property: 'translation' },
    { x: 2 * stretchX, y: 0, z: 0 }
  );
  const latch3Id = window.api.scene.findNode({
    from: instanceId,
    name: 'Latch3',
  });
  window.api.scene.set(
    { id: latch3Id, plug: 'Transform', property: 'translation' },
    { x: 2 * stretchX, y: 0, z: 0 }
  );
  // 3 Door skin bottom
  const bottomDoorSkinId = window.api.scene.findNode({
    from: instanceId,
    name: 'DoorSkinBottom',
  });
  window.api.scene.set(
    {
      id: bottomDoorSkinId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: bottomDoorSkinId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    stretchY / 2
  );
  window.api.scene.set(
    { id: bottomDoorSkinId, plug: 'Transform', property: 'translation' },
    { x: stretchX, y: -stretchY / 2, z: 0 }
  );
  applyMaterialToNode(bottomDoorSkinId);
  // 4 Door back
  const topDoorBackId = window.api.scene.findNode({
    from: instanceId,
    name: 'DoorBackTop',
  });
  window.api.scene.set(
    {
      id: topDoorBackId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: topDoorBackId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    stretchY / 2
  );
  window.api.scene.set(
    { id: topDoorBackId, plug: 'Transform', property: 'translation' },
    { x: stretchX, y: stretchY / 2, z: 0 }
  );
  applyMaterialToNode(topDoorBackId, 'WH');
  // 5 Door back
  const bottomDoorBackId = window.api.scene.findNode({
    from: instanceId,
    name: 'DoorBackBottom',
  });
  window.api.scene.set(
    {
      id: bottomDoorBackId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: bottomDoorBackId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    stretchY / 2
  );
  window.api.scene.set(
    { id: bottomDoorBackId, plug: 'Transform', property: 'translation' },
    { x: stretchX, y: -stretchY / 2, z: 0 }
  );
  applyMaterialToNode(bottomDoorBackId, 'WH');
  // Hinges
  // // Door side hinge
  const doorSideHingeId = window.api.scene.findNode({
    from: instanceId,
    name: 'DoorSideHinge',
  });
  // // Frame side hinge
  const frameSideHingeId = window.api.scene.findNode({
    from: instanceId,
    name: 'FrameSideHinge',
  });
  applyMaterialToNode(doorSideHingeId, 'steel');
  applyMaterialToNode(frameSideHingeId, 'steel');

  // Calculation
  window.api.scene.set(
    {
      id: doorSideHingeId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchY
  );

  window.api.scene.set(
    {
      id: frameSideHingeId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchY
  );

  // Animation
  if (!animation.getPlayer(id)) {
    const player = new Player('door', 'close', 1000);
    player.addAction(playDoor(instanceId));
    animation.linkPlayer(id, player);
  }

  return id;
}

const ROTATION = 90;
const DEFAULT_DOOR_ROTATION_Y = 0;

const DEFAULT_DOOR_HINGE_ROT_X = 0;
// A as the point where door spins at.
const POINT_A_Y = 19.275;
const POINT_A_Z = -5.92455;
// B as the point where bar connect hinge on door
const POINT_B_Y = 14.6625;
const POINT_B_Z = -0.80445;
// O as origin where bar swings at hinge on frame (0, 0, 0)
const INIT_B_A_Y_ANGLE =
  90 -
  (Math.atan(Math.abs((POINT_A_Y - POINT_B_Y) / (POINT_A_Z - POINT_B_Z))) *
    180) /
    Math.PI;
const A_B_LENGTH = Math.sqrt(
  (POINT_A_Y - POINT_B_Y) ** 2 + (POINT_A_Z - POINT_B_Z) ** 2
);
const INIT_BAR_LENGTH = Math.sqrt(POINT_B_Z ** 2 + POINT_B_Y ** 2);

let DOOR_INIT_ROT;
function playDoor(instanceId) {
  const bodyId = window.api.scene.findNode({
    from: instanceId,
    name: 'Body',
  });
  if (!DOOR_INIT_ROT)
    DOOR_INIT_ROT = window.api.scene.get({
      id: bodyId,
      plug: 'Transform',
      property: 'rotation',
    });
  function frame(progress, frames) {
    const increment = ROTATION / frames;
    const currentY = DEFAULT_DOOR_ROTATION_Y - progress * increment;
    window.api.scene.set(
      {
        id: bodyId,
        plug: 'Transform',
        property: 'rotation',
      },
      {
        x: DOOR_INIT_ROT.x,
        y: currentY,
        z: DOOR_INIT_ROT.z,
      }
    );
  }

  return frame;
}
let DOOR_HINGE_INIT_ROT;
function playGasSpring(instanceId) {
  // 3 parts:
  // Door hinge moves the same as door
  // Swing bar spins at frame ball mount
  // Swing bar moves its rod case & ball mount
  const doorHingeId = window.api.scene.findNode({
    from: instanceId,
    name: 'DoorHinge',
  });
  const swingBarId = window.api.scene.findNode({
    from: instanceId,
    name: 'SwingBar',
  });
  const barNullId = window.api.scene.findNode({
    from: instanceId,
    name: 'Rod_Bar',
  });
  if (!DOOR_HINGE_INIT_ROT)
    DOOR_HINGE_INIT_ROT = window.api.scene.get({
      id: doorHingeId,
      plug: 'Transform',
      property: 'rotation',
    });
  function frame(progress, frames) {
    const increment = ROTATION / frames;
    const currHingeRotX = DEFAULT_DOOR_HINGE_ROT_X + progress * increment;
    const posiZ_B =
      POINT_A_Z +
      Math.sin(((INIT_B_A_Y_ANGLE - currHingeRotX) * Math.PI) / 180) *
        A_B_LENGTH;
    const posiY_B =
      POINT_A_Y -
      Math.cos(((INIT_B_A_Y_ANGLE - currHingeRotX) * Math.PI) / 180) *
        A_B_LENGTH;
    const barLength = Math.sqrt(posiZ_B ** 2 + posiY_B ** 2);
    const B_O_Y_ANGLE = (Math.asin(posiZ_B / barLength) * 180) / Math.PI;
    window.api.scene.set(
      {
        id: doorHingeId,
        plug: 'Transform',
        property: 'rotation',
      },
      {
        x: currHingeRotX,
        y: DOOR_HINGE_INIT_ROT.y,
        z: DOOR_HINGE_INIT_ROT.z,
      }
    );
    window.api.scene.set(
      {
        id: swingBarId,
        plug: 'Transform',
        property: 'rotation',
      },
      {
        x: B_O_Y_ANGLE,
        y: 0,
        z: 0,
      }
    );
    window.api.scene.set(
      {
        id: barNullId,
        plug: 'Transform',
        property: 'translation',
      },
      {
        x: 0,
        y: barLength - INIT_BAR_LENGTH,
        z: 0,
      }
    );
  }

  return frame;
}
