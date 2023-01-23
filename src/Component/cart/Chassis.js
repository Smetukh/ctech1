import { getAssetInstanceId, reparent } from '../../helper';
import { INCH_TO_M, INCH_TO_CM } from '../../constants';
import { updateAssets } from '../helper';
import { materialAssigner } from '../../materials';
import { Component } from '../Component';
import { ChassisOpening } from './ChassisOpening';
// Actual mesh is lesser than the following number by
// offset/thickness(0.125)
const CHASSIS_PANEL_MESH_WIDTH = 36.5;
const CHASSIS_PANEL_MESH_DEPTH = 26;

const CHASSIS_PANEL_MESH_HEIGHT = 1.851;

// // ** Handle in hot rod sample fits cylinders at 13.248 (/27.875)
// // 6.06 / 13.536 (wheel: 10)
// const HOT_ROD_HANDLE_WIDTH_CONSTANT = 14.627;
// const HOT_ROD_HANDLE_HEIGHT_CONSTANT = 6.06;
// // ** Handle in mini sample fits cylinders at 15.634 (/29.824)
// // 5.354 / 12.5 (wheel: 10)
// const MINI_HANDLE_WIDTH_CONSTANT = 14.19;
// const MINI_HANDLE_HEIGHT_CONSTANT = 5.354;
// // ** Handle in standard sample fits cylinders at 22.777 (/36)
// // 8.9975 / 19 (wheel: 17)
// const STANDARD_HANDLE_WIDTH_CONSTANT = 13.223;
// const STANDARD_HANDLE_HEIGHT_CONSTANT = 8.9975;

export class Chassis extends Component {
  constructor(chassis, body) {
    super('chassis');

    this.reset(chassis, body);
  }

  reset(chassis, body) {
    const { width, depth, height } = body;
    const { model, wheels, handle, front, rear, left, right, options } = chassis;

    const chassisType = getChassisType(chassis);

    const assets = {};
    // ** All parts imported from samples and posistioned following
    // ** the ChassisPanel whose top surface sits at X-Z plane
    // 1 Chassis panel - Use body's dimension
    assets.panelAsset = {
      name: 'ChassisPanel',
      data: {
        width,
        depth,
        revert: chassisType === 'mini' || chassisType === 'standard',
      },
      build: getNodeForPanel,
    };

    // ?? Correct logic to determine what type of wheels to use
    const frontBrakes = wheels.brakes.front;
    const rearBrakes = wheels.brakes.rear;
    const frontSteering = wheels.steering.front;
    const rearSteering = wheels.steering.rear;
    let translationX = 0,
      translationY = 0,
      translationZ = 0;
    if (chassisType === 'caster') {
      // ** Models come from the sample whose dimension of body is
      // ** 40x31.125x24 (WxHxD)
      translationX = (width / 2 - 4.773) * INCH_TO_M;
      translationY = (CHASSIS_PANEL_MESH_HEIGHT + 0.125) * INCH_TO_M;
      translationZ = (depth / 2 - 4.648) * INCH_TO_M;
      // Beams
      const rotate = depth > 26;
      if (rotate) {
        const stretchZ = ((width - 24) * INCH_TO_CM) / 2;
        assets.beam1 = {
          name: 'CasterBeam',
          data: {
            translation: {
              x: 0,
              y: translationY,
              z: translationZ,
            },
            rotation: {
              x: 0,
              y: 90,
              z: 0,
            },
            stretchZ,
          },
          build: getNodeForBeam,
        };
        assets.beam2 = {
          name: 'CasterBeam',
          data: {
            translation: {
              x: 0,
              y: translationY,
              z: -translationZ,
            },
            rotation: {
              x: 0,
              y: 90,
              z: 0,
            },
            stretchZ,
          },
          build: getNodeForBeam,
        };
      } else {
        const stretchZ = ((depth - 24) * INCH_TO_CM) / 2;
        assets.beam1 = {
          name: 'CasterBeam',
          data: {
            translation: {
              x: translationX,
              y: translationY,
              z: 0,
            },
            rotation: {
              x: 0,
              y: 0,
              z: 0,
            },
            stretchZ,
          },
          build: getNodeForBeam,
        };
        assets.beam2 = {
          name: 'CasterBeam',
          data: {
            translation: {
              x: -translationX,
              y: translationY,
              z: 0,
            },
            rotation: {
              x: 0,
              y: 0,
              z: 0,
            },
            stretchZ,
          },
          build: getNodeForBeam,
        };
      }
      // Wheels
      assets.frontLeftWheel = {
        name: wheels.size === 4 ? (frontSteering ? 'CasterSwivel' : 'CasterRigid') : (frontSteering ? 'HalfassCasterSwivelBR' : 'HalfAssCasterFixed'),
        data: {
          translation: {
            x: -translationX,
            y: translationY - (wheels.size === 6 ? 1.625 * INCH_TO_M : 0),
            z: translationZ,
          },
        },
        build: getNodeForCaster,
      };
      assets.frontRightWheel = {
        name: wheels.size === 4 ? (frontSteering ? 'CasterSwivel' : 'CasterRigid') : (frontSteering ? 'HalfassCasterSwivelBL' : 'HalfassCasterFixed'),
        data: {
          translation: {
            x: -translationX,
            y: translationY - (wheels.size === 6 ? 1.625 * INCH_TO_M : 0),
            z: -translationZ,
          },
        },
        build: getNodeForCaster,
      };
      assets.rearLeftWheel = {
        name: wheels.size === 4 ? (rearSteering ? 'CasterSwivel' : 'CasterRigid') : (rearSteering ? 'HalfassCasterSwivelBR' : 'HalfassCasterFixed'),
        data: {
          translation: {
            x: translationX,
            y: translationY - (wheels.size === 6 ? 1.625 * INCH_TO_M : 0),
            z: translationZ,
          },
        },
        build: getNodeForCaster,
      };
      assets.rearRightWheel = {
        name: wheels.size === 4 ? (rearSteering ? 'CasterSwivel' : 'CasterRigid') : (rearSteering ? 'HalfassCasterSwivelBL' : 'HalfassCasterFixed'),
        data: {
          translation: {
            x: translationX,
            y: translationY - (wheels.size === 6 ? 1.625 * INCH_TO_M : 0),
            z: -translationZ,
          },
        },
        build: getNodeForCaster,
      };
    } else if (chassisType === 'badass caster') {
      // ** Models come from the sample whose dimension of body is
      // ** 48x37.125x30 (WxHxD)
      translationX = (width / 2 - 5.473) * INCH_TO_M;
      translationY = (CHASSIS_PANEL_MESH_HEIGHT + 0.125) * INCH_TO_M;
      translationZ = (depth / 2 - 4.648) * INCH_TO_M;
      const stretchX = 0.875 * INCH_TO_CM;
      const stretchZ = ((width - 25.25) * INCH_TO_CM) / 2;
      assets.beam1 = {
        name: 'CasterBeam',
        data: {
          translation: {
            x: 0,
            y: translationY,
            z: translationZ,
          },
          rotation: {
            x: 0,
            y: 90,
            z: 0,
          },
          stretchX,
          stretchZ,
        },
        build: getNodeForBeam,
      };
      assets.beam2 = {
        name: 'CasterBeam',
        data: {
          translation: {
            x: 0,
            y: translationY,
            z: -translationZ,
          },
          rotation: {
            x: 0,
            y: 90,
            z: 0,
          },
          stretchX,
          stretchZ,
        },
        build: getNodeForBeam,
      };
      assets.frontLeftWheel = {
        name: frontSteering ? 'BadassCasterSwivel' : 'BadassCasterRigid',
        data: {
          translation: {
            x: -translationX,
            y: translationY - 0.5 * INCH_TO_M,
            z: translationZ,
          },
        },
        build: getNodeForCaster,
      };
      assets.frontRightWheel = {
        name: frontSteering ? 'BadassCasterSwivel' : 'BadassCasterRigid',
        data: {
          translation: {
            x: -translationX,
            y: translationY - 0.5 * INCH_TO_M,
            z: -translationZ,
          },
        },
        build: getNodeForCaster,
      };
      assets.rearLeftWheel = {
        name: rearSteering ? 'BadassCasterSwivel' : 'BadassCasterRigid',
        data: {
          translation: {
            x: translationX,
            y: translationY - 0.5 * INCH_TO_M,
            z: translationZ,
          },
        },
        build: getNodeForCaster,
      };
      assets.rearRightWheel = {
        name: rearSteering ? 'BadassCasterSwivel' : 'BadassCasterRigid',
        data: {
          translation: {
            x: translationX,
            y: translationY - 0.5 * INCH_TO_M,
            z: -translationZ,
          },
        },
        build: getNodeForCaster,
      };
      if (frontBrakes) {
        assets.frontLeftBrake = {
          name: 'BadassCasterBrakes',
          data: {
            translation: {
              x: -translationX,
              y: translationY - 0.5 * INCH_TO_M,
              z: translationZ,
            },
          },
          build: getNodeForWheels,
        };
        assets.frontRightBrake = {
          name: 'BadassCasterBrakes',
          data: {
            translation: {
              x: -translationX,
              y: translationY - 0.5 * INCH_TO_M,
              z: -translationZ,
            },
          },
          build: getNodeForWheels,
        };
      }
      if (rearBrakes) {
        assets.rearLeftBrake = {
          name: 'BadassCasterBrakes',
          data: {
            translation: {
              x: translationX,
              y: translationY - 0.5 * INCH_TO_M,
              z: translationZ,
            },
          },
          build: getNodeForWheels,
        };
        assets.rearRightBrake = {
          name: 'BadassCasterBrakes',
          data: {
            translation: {
              x: translationX,
              y: translationY - 0.5 * INCH_TO_M,
              z: -translationZ,
            },
          },
          build: getNodeForWheels,
        };
      }
    } else if (chassisType === 'hot rod') {
      // ** Models come from the sample whose dimension of body is
      // ** 36.5x24.25x26 (WxHxD)
      translationX = (width / 2 - 1.85256) * INCH_TO_M;
      translationY = (CHASSIS_PANEL_MESH_HEIGHT + 0.125) * INCH_TO_M;
      const stretchX = ((width - 36.5) / 2) * INCH_TO_CM;
      const stretchZ = ((depth - 26) / 2) * INCH_TO_CM;
      assets.hotRodMount = {
        name: 'HotRodMount',
        data: {
          translation: {
            x: 0,
            y: translationY,
            z: 0,
          },
          stretchX,
          stretchZ,
        },
        build: getNodeForHotRodMount,
      };
      assets.frontWheels = {
        name: frontSteering ? 'HotRodWheelsSwivel' : 'HotRodWheelsRigid',
        data: {
          translation: {
            x: -translationX,
            y: translationY,
            z: 0,
          },
          stretchZ: ((depth - 26) / 2) * INCH_TO_CM,
        },
        build: getNodeForWheels,
      };
      assets.rearWheels = {
        name: rearSteering ? 'HotRodWheelsSwivel' : 'HotRodWheelsRigid',
        data: {
          translation: {
            x: translationX,
            y: translationY,
            z: 0,
          },
          stretchZ: ((depth - 26) / 2) * INCH_TO_CM,
        },
        build: getNodeForWheels,
      };
      if (frontBrakes) {
        assets.frontBrakes = {
          name: 'HotRodWheelBrakes',
          data: {
            translation: {
              x: -translationX,
              y: translationY,
              z: 0,
            },
            stretchZ: ((depth - 26) / 2) * INCH_TO_CM,
          },
          build: getNodeForWheels,
        };
      }
    } else if (chassisType === 'mini') {
      // ** Models come from the sample whose dimension of body is
      // ** 40x25.5x26 (WxHxD)
      translationX = (width / 2 - 4.3124) * INCH_TO_M;
      translationY = 0.125 * INCH_TO_M;
      assets.miniMount = {
        name: 'MiniMount',
        data: {
          translation: {
            x: 0,
            y: translationY,
            z: 0,
          },
          stretchX: ((width - 40) / 2) * INCH_TO_CM,
          stretchZ: ((depth - 26) / 2) * INCH_TO_CM,
        },
        build: getNodeForMiniMount,
      };
      assets.frontWheels = {
        name: frontSteering ? 'MiniWheelsSwivel' : 'MiniWheelsRigid',
        data: {
          translation: {
            x: -translationX,
            y: translationY,
            z: 0,
          },
          stretchZ: ((depth - 26) / 2) * INCH_TO_CM,
        },
        build: getNodeForWheels,
      };
      assets.rearWheels = {
        name: rearSteering ? 'MiniWheelsSwivel' : 'MiniWheelsRigid',
        data: {
          translation: {
            x: (width / 2 - 5.244) * INCH_TO_M,
            y: translationY,
            z: 0,
          },
          stretchZ: ((depth - 26) / 2) * INCH_TO_CM,
        },
        build: getNodeForWheels,
      };
      if (frontBrakes) {
        assets.frontBrakes = {
          name: 'MiniWheelBrakes',
          data: {
            translation: {
              x: -translationX,
              y: translationY,
              z: 0,
            },
            stretchZ: ((depth - 26) / 2) * INCH_TO_CM,
          },
          build: getNodeForWheels,
        };
      }
      // ?? Assumes rear will have an opening, can it have multiple sub
      // openings?
      if (rear.openings) {
        const opTranslation = {
          x: (width / 2 - 0.82) * INCH_TO_M,
          y: translationY - (rear.openings[0].height / 2) * INCH_TO_M,
          z: translationZ,
        };
        const opRotation = {
          x: 0,
          y: 90,
          z: 0,
        };
        assets.rearOpening = this.assets.rearOpening
          ? this.assets.rearOpening.reset(
              rear.openings[0],
              opTranslation,
              opRotation
            )
          : new ChassisOpening(rear.openings[0], opTranslation, opRotation);
      }
      if (options.nitrogenCradle === 1) {
        assets.nitrogenCradle = {
          name: 'MiniNitrogenCradle',
          data: {
            translation: {
              x: (1 * INCH_TO_M),
              y: translationY - (9.75 * INCH_TO_M),
              z: 0,
            },
          },
          build: getNodeForNitrogenCradle,
        };
      }
    } else if (chassisType === 'standard') {
      // ** Models come from the sample whose dimension of body is
      // ** 60x23.125x36 (WxHxD)
      translationY = 0.125 * INCH_TO_M;
      assets.standardMount = {
        name: 'StandardChassisMount',
        data: {
          translation: {
            x: 0,
            y: translationY,
            z: 0,
          },
          stretchX: ((width - 60) / 2) * INCH_TO_CM,
          stretchZ: ((depth - 36) / 2) * INCH_TO_CM,
        },
        build: getNodeForStandardMount,
      };
      translationX = (width / 2 - 8.1476) * INCH_TO_M;
      assets.frontWheels = {
        name: 'StandardWheelsSwivel',
        data: {
          translation: {
            x: -translationX,
            y: translationY,
            z: 0,
          },
          stretchZ: ((depth - 36) / 2) * INCH_TO_CM,
        },
        build: getNodeForWheels,
      };
      if (frontBrakes === 'hydraulic') {
        assets.frontBrakes = {
          name: 'StandardWheelBrakes',
          data: {
            translation: {
              x: -translationX,
              y: translationY,
              z: 0,
            },
            stretchZ: ((depth - 36) / 2) * INCH_TO_CM,
          },
          build: getNodeForWheels,
        };
      }
      assets.rearWheels = {
        name: 'StandardWheelsRigid',
        data: {
          translation: {
            x: translationX,
            y: translationY,
            z: 0,
          },
          stretchZ: ((depth - 36) / 2) * INCH_TO_CM,
        },
        build: getNodeForWheels,
      };

      if (left.openings) {
        const opTranslation = {
          x: 0,
          y: translationY - (left.openings[0].height / 2) * INCH_TO_M,
          z:
            translationZ -
            (depth / 2 - left.openings[0].depth / 2 - 0.25) * INCH_TO_M,
        };
        const opRotation = {
          x: 0,
          y: 180,
          z: 0,
        };
        assets.leftOpening = this.assets.leftOpening
          ? this.assets.leftOpening.reset(
              left.openings[0],
              opTranslation,
              opRotation
            )
          : new ChassisOpening(left.openings[0], opTranslation, opRotation);
      }
      if (right.openings) {
        const opTranslation = {
          x: 0,
          y: translationY - (right.openings[0].height / 2) * INCH_TO_M,
          z:
            translationZ +
            (depth / 2 - right.openings[0].depth / 2 - 0.25) * INCH_TO_M,
        };
        const opRotation = {
          x: 0,
          y: 0,
          z: 0,
        };
        assets.rightOpening = this.assets.rightOpening
          ? this.assets.rightOpening.reset(
              right.openings[0],
              opTranslation,
              opRotation
            )
          : new ChassisOpening(right.openings[0], opTranslation, opRotation);
      }
      if (rear.openings) {
        const opTranslation = {
          x: (width / 2 - rear.openings[0].depth / 2) * INCH_TO_M,
          y: translationY - (rear.openings[0].height / 2) * INCH_TO_M,
          z: 0,
        };
        const opRotation = {
          x: 0,
          y: 90,
          z: 0,
        };

        assets.rearOpening = this.assets.rearOpening
          ? this.assets.rearOpening.reset(
              rear.openings[0],
              opTranslation,
              opRotation
            )
          : new ChassisOpening(rear.openings[0], opTranslation, opRotation);
      }
      if (options.nitrogenCradle > 0) {
        assets.nitrogenCradle = {
          name: options.nitrogenCradle === 1 ? 'SingleNitrogenCradle' : 'DualNitrogenCradle',
          data: {
            translation: {
              x: (2.5 * INCH_TO_M),
              y: translationY - (13.266 * INCH_TO_M),
              z: 0,
            },
          },
          build: getNodeForNitrogenCradle,
        };
      }
    }

    Object.entries(handle).forEach(([position, data]) => {
      if (!data) return;
      const { type } = data;
      // For tee handle
      const xOffset = -(chassisType === 'hot rod' ? 4.45 : 3.75) * INCH_TO_M;
      const yOffset =
        -(chassisType === 'hot rod'
          ? 8.86
          : chassisType === 'mini'
          ? 6.3
          : chassisType === 'standard'
          ? 9.9775
          : 0) * INCH_TO_M;

      let xFactor = width,
        zFactor = depth,
        xSign = 1,
        zSign = 1,
        rotationYAlpha = 0,
        lengthFactor = width;
      if (position === 'front') {
        xFactor = width;
        zFactor = 0;
        xSign *= -1;
        lengthFactor = depth;
      } else if (position === 'left') {
        xFactor = 0;
        zFactor = depth;
        zSign *= -1;
        rotationYAlpha = -90;
        lengthFactor = width;
      } else if (position === 'rear') {
        xFactor = width;
        zFactor = 0;
        rotationYAlpha = 180;
        lengthFactor = depth;
      } else {
        xFactor = 0;
        zFactor = depth;
        rotationYAlpha = 90;
        lengthFactor = width;
      }
      if (type === 'folding handle') {
        assets[`${position}Handle`] = {
          name: 'FoldingHandle',
          data: {
            translation: {
              x: xSign * (xFactor / 2) * INCH_TO_M,
              y: (height - 1) * INCH_TO_M,
              z: zSign * (zFactor / 2) * INCH_TO_M,
            },
            rotation: {
              x: 0,
              y: 180 + rotationYAlpha,
              z: 0,
            },
            length: lengthFactor,
          },
          build: getNodeForFoldingHandle,
        };
      } else if (type === 'push-pull') {
        assets[`${position}Handle`] = {
          name: 'PushPullHandle',
          data: {
            translation: {
              x: xSign * (xFactor / 2) * INCH_TO_M,
              y: (height - 4) * INCH_TO_M,
              z: zSign * (zFactor / 2) * INCH_TO_M,
            },
            rotation: {
              x: 0,
              y: -90 + rotationYAlpha,
              z: 0,
            },
            stretch: ((lengthFactor - 30) * INCH_TO_CM) / 2,
          },
          build: getNodeForPushPullHandle,
        };
      } else if (type === 'tee') {
        assets[`${position}Handle`] = {
          name: chassisType === 'mini' ? 'TeeHandle' : 'StandardTeeHandle',
          data: {
            target: assets[`${position}Wheels`],
            xOffset,
            yOffset,
            rotation: {
              x: 0,
              y: rotationYAlpha,
              z: 0,
            },
            brakes: chassisType === 'mini' ? null : frontBrakes,
          },
          build: getNodeForTeeHandle,
        };
      } else if (type === 'heimJointTee') {
        assets[`${position}Handle`] = {
          name: chassisType === 'mini' ? 'HeimJointTeeHandle' : 'StandardHeimJointTeeHandle',
          data: {
            target: assets[`${position}Wheels`],
            xOffset,
            yOffset,
            rotation: {
              x: 0,
              y: rotationYAlpha,
              z: 0,
            },
            brakes: chassisType === 'mini' ? null : frontBrakes,
          },
          build: getNodeForTeeHandle,
        };
      }
    });

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
    chassis.rear?.openings?.length > 0
  )
    chassisType = 'mini';

  if (
    chassis.wheels.mount === 'spindle' &&
    chassis.wheels.size === 17 &&
    chassis.rear?.openings?.length > 0
  )
    chassisType = 'standard';

  return chassisType;
}

async function getNodeForPanel(id, values) {
  const { width, depth, revert } = values;
  const stretchX = ((width - CHASSIS_PANEL_MESH_WIDTH) * INCH_TO_CM) / 2;
  const stretchZ = ((depth - CHASSIS_PANEL_MESH_DEPTH) * INCH_TO_CM) / 2;
  const instanceId = await getAssetInstanceId(window.api, id);

  const panelId = window.api.scene.findNode({
    from: instanceId,
    name: 'Item',
  });

  if (revert) {
    // Translate
    window.api.scene.set(
      { id, plug: 'Transform', property: 'translation' },
      { x: 0, y: 0.125 * INCH_TO_M, z: 0 }
    );
    //  Rotation
    window.api.scene.set(
      { id, plug: 'Transform', property: 'rotation' },
      { x: 0, y: 0, z: 180 }
    );
  } else {
    // Translate
    window.api.scene.set(
      { id, plug: 'Transform', property: 'translation' },
      { x: 0, y: (CHASSIS_PANEL_MESH_HEIGHT + 0.125) * INCH_TO_M, z: 0 }
    );
    //  Rotation
    window.api.scene.set(
      { id, plug: 'Transform', property: 'rotation' },
      { x: 0, y: 0, z: 0 }
    );
  }
  // 1.Stretch
  window.api.scene.set(
    {
      id: panelId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      //   properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: panelId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      //   properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchZ
  );

  materialAssigner(id)(panelId, 'steel');
  return id;
}

async function getNodeForBeam(id, values) {
  const { translation, rotation, stretchX, stretchZ } = values;
  const instanceId = await getAssetInstanceId(window.api, id);

  const beamId = window.api.scene.findNode({
    from: instanceId,
    name: 'Item',
  });

  // Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );
  //  Rotation
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    rotation
  );
  // Stretch
  window.api.scene.set(
    {
      id: beamId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX || 0
  );
  window.api.scene.set(
    {
      id: beamId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    stretchZ || 0
  );

  return id;
}

async function getNodeForCaster(id, values) {
  const { translation } = values;
  //   const instanceId = await getAssetInstanceId(window.api, id);

  // Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );

  return id;
}

async function getNodeForHotRodMount(id, values) {
  const { translation, stretchX, stretchZ } = values;
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);

  // Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );

  const coverId = window.api.scene.findNode({
    from: instanceId,
    name: 'Covers',
  });
  window.api.scene.set(
    {
      id: coverId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: coverId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    stretchZ
  );

  const panelId = window.api.scene.findNode({
    from: instanceId,
    name: 'Panels',
  });
  window.api.scene.set(
    {
      id: panelId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: panelId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    stretchZ
  );

  const baseId = window.api.scene.findNode({
    from: instanceId,
    name: 'Base',
  });
  window.api.scene.set(
    {
      id: baseId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: baseId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    stretchZ
  );

  const beamId = window.api.scene.findNode({
    from: instanceId,
    name: 'Beam',
  });
  // TODO array
  window.api.scene.set(
    {
      id: beamId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    stretchZ
  );

  applyMaterialToNode(coverId);
  return id;
}

async function getNodeForWheels(id, values) {
  const { translation, stretchZ } = values;
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);

  // Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );

  const leftWheelNullId = window.api.scene.findNode({
    from: instanceId,
    name: 'LeftWheel',
  });
  const rightWheelNullId = window.api.scene.findNode({
    from: instanceId,
    name: 'RightWheel',
  });
  const beamId = window.api.scene.findNode({
    from: instanceId,
    name: 'Beam',
  });
  const barId = window.api.scene.findNode({
    from: instanceId,
    name: 'Bar',
  });

  window.api.scene.set(
    { id: leftWheelNullId, plug: 'Transform', property: 'translation' },
    { x: 0, y: 0, z: stretchZ }
  );
  window.api.scene.set(
    { id: rightWheelNullId, plug: 'Transform', property: 'translation' },
    { x: 0, y: 0, z: -stretchZ }
  );
  // Stretch
  if (beamId)
    window.api.scene.set(
      {
        id: beamId,
        plug: 'PolyMesh',
        operatorIndex: 1,
        //   properties: { type: 'Stretch' },
        property: 'stretchDistance',
      },
      stretchZ || 0
    );
  if (barId)
    window.api.scene.set(
      {
        id: barId,
        plug: 'PolyMesh',
        operatorIndex: 1,
        //   properties: { type: 'Stretch' },
        property: 'stretchDistance',
      },
      stretchZ || 0
    );

  const leftWheelBarId = window.api.scene.findNode({
    from: instanceId,
    name: 'LeftWheelBar',
  });
  if (leftWheelBarId) {
    window.api.scene.set(
      {
        id: leftWheelBarId,
        plug: 'PolyMesh',
        operatorIndex: 1,
        property: 'stretchDistance',
      },
      stretchZ / 2 || 0
    );
    window.api.scene.set(
      { id: leftWheelBarId, plug: 'Transform', property: 'translation' },
      { x: 0, y: 0, z: stretchZ / 2 }
    );
  }

  const rightWheelBarId = window.api.scene.findNode({
    from: instanceId,
    name: 'RightWheelBar',
  });
  if (rightWheelBarId) {
    window.api.scene.set(
      {
        id: rightWheelBarId,
        plug: 'PolyMesh',
        operatorIndex: 1,
        property: 'stretchDistance',
      },
      stretchZ / 2 || 0
    );
    window.api.scene.set(
      { id: rightWheelBarId, plug: 'Transform', property: 'translation' },
      { x: 0, y: 0, z: -stretchZ / 2 }
    );
  }

  const leftHoodId = window.api.scene.findNode({
    from: leftWheelNullId,
    name: 'Hood',
  });
  if (leftHoodId) applyMaterialToNode(leftHoodId);
  const rightHoodId = window.api.scene.findNode({
    from: rightWheelNullId,
    name: 'Hood',
  });
  if (rightHoodId) applyMaterialToNode(rightHoodId);
  const leftArmId = window.api.scene.findNode({
    from: leftWheelNullId,
    name: 'Arm',
  });
  const rightArmId = window.api.scene.findNode({
    from: leftWheelNullId,
    name: 'Arm',
  });
  if (leftArmId) applyMaterialToNode(leftArmId);
  if (rightArmId) applyMaterialToNode(rightArmId);

  return id;
}

async function getNodeForMiniMount(id, values) {
  const { translation, stretchX, stretchZ } = values;
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);

  // Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );

  // Nodes:
  const leftCoverId = window.api.scene.findNode({
    from: instanceId,
    name: 'LeftCover',
  });
  const rightCoverId = window.api.scene.findNode({
    from: instanceId,
    name: 'RightCover',
  });
  const leftPanelId = window.api.scene.findNode({
    from: instanceId,
    name: 'LeftPanel',
  });
  const rightPanelId = window.api.scene.findNode({
    from: instanceId,
    name: 'RightPanel',
  });
  const bottomPanelId = window.api.scene.findNode({
    from: instanceId,
    name: 'BottomPanel',
  });
  const frontPanelId = window.api.scene.findNode({
    from: instanceId,
    name: 'FrontPanel',
  });

  // Translate & stretch
  // Side covers
  window.api.scene.set(
    {
      id: leftCoverId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX || 0
  );
  window.api.scene.set(
    { id: leftCoverId, plug: 'Transform', property: 'translation' },
    { x: 0, y: 0, z: stretchZ }
  );
  window.api.scene.set(
    {
      id: rightCoverId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX || 0
  );
  window.api.scene.set(
    { id: rightCoverId, plug: 'Transform', property: 'translation' },
    { x: 0, y: 0, z: -stretchZ }
  );

  // Side panels
  window.api.scene.set(
    {
      id: leftPanelId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX || 0
  );
  window.api.scene.set(
    { id: leftPanelId, plug: 'Transform', property: 'translation' },
    { x: 0, y: 0, z: stretchZ }
  );
  window.api.scene.set(
    {
      id: rightPanelId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX || 0
  );
  window.api.scene.set(
    { id: rightPanelId, plug: 'Transform', property: 'translation' },
    { x: 0, y: 0, z: -stretchZ }
  );
  // Bottom panel
  window.api.scene.set(
    {
      id: bottomPanelId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: bottomPanelId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    stretchZ
  );

  // Front panel
  window.api.scene.set(
    {
      id: frontPanelId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchZ
  );
  window.api.scene.set(
    { id: frontPanelId, plug: 'Transform', property: 'translation' },
    { x: -stretchX, y: 0, z: 0 }
  );
  applyMaterialToNode(leftCoverId);
  applyMaterialToNode(rightCoverId);
  return id;
}

async function getNodeForStandardMount(id, values) {
  const { translation, stretchX, stretchZ } = values;
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);

  // Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );

  ['Left', 'Right'].forEach((side) => {
    const zSign = side === 'Left' ? 1 : -1;
    const z = zSign * stretchZ || 0;

    // Mounting bar
    const mountBarId = window.api.scene.findNode({
      from: instanceId,
      name: `${side}MountingBar`,
    });
    window.api.scene.set(
      { id: mountBarId, plug: 'Transform', property: 'translation' },
      { x: 0, y: 0, z }
    );
    window.api.scene.set(
      {
        id: mountBarId,
        plug: 'PolyMesh',
        operatorIndex: 1,
        property: 'stretchDistance',
      },
      stretchX
    );
    applyMaterialToNode(mountBarId, 'BlackSteel');

    // Opening
    const openingId = window.api.scene.findNode({
      from: instanceId,
      name: `${side}Opening`,
    });
    window.api.scene.set(
      { id: openingId, plug: 'Transform', property: 'translation' },
      { x: 0, y: 0, z }
    );
    window.api.scene.set(
      {
        id: openingId,
        plug: 'PolyMesh',
        operatorIndex: 1,
        property: 'stretchDistance',
      },
      stretchX
    );
    applyMaterialToNode(openingId, 'BlackSteel');

    // Panel
    const panelId = window.api.scene.findNode({
      from: instanceId,
      name: `${side}Panel`,
    });
    window.api.scene.set(
      { id: panelId, plug: 'Transform', property: 'translation' },
      { x: 0, y: 0, z }
    );
    window.api.scene.set(
      {
        id: panelId,
        plug: 'PolyMesh',
        operatorIndex: 1,
        property: 'stretchDistance',
      },
      stretchX
    );
    applyMaterialToNode(panelId, 'BlackSteel');

    ['Front', 'Rear'].forEach((position) => {
      const xSign = position === 'Front' ? -1 : 1;
      const x = xSign * stretchX;
      // Hood
      const hoodId = window.api.scene.findNode({
        from: instanceId,
        name: `${position}${side}Hood`,
      });
      window.api.scene.set(
        { id: hoodId, plug: 'Transform', property: 'translation' },
        { x, y: 0, z }
      );
      applyMaterialToNode(hoodId);
    });
  });

  // Rear mounting bar
  const rearMountBarId = window.api.scene.findNode({
    from: instanceId,
    name: 'RearMountingBar',
  });
  window.api.scene.set(
    { id: rearMountBarId, plug: 'Transform', property: 'translation' },
    { x: stretchX, y: 0, z: 0 }
  );
  window.api.scene.set(
    {
      id: rearMountBarId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchZ || 0
  );
  applyMaterialToNode(rearMountBarId, 'BlackSteel');

  // Front Panel
  const frontPanelId = window.api.scene.findNode({
    from: instanceId,
    name: 'FrontPanel',
  });
  window.api.scene.set(
    { id: frontPanelId, plug: 'Transform', property: 'translation' },
    { x: -stretchX, y: 0, z: 0 }
  );
  window.api.scene.set(
    {
      id: frontPanelId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchZ || 0
  );
  applyMaterialToNode(frontPanelId, 'BlackSteel');

  // Bottom Panel
  const bottomPanelId = window.api.scene.findNode({
    from: instanceId,
    name: 'BottomPanel',
  });
  window.api.scene.set(
    {
      id: bottomPanelId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX || 0
  );
  window.api.scene.set(
    {
      id: bottomPanelId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    stretchZ || 0
  );
  applyMaterialToNode(bottomPanelId, 'BlackSteel');

  // Front Beam
  const frontBeamId = window.api.scene.findNode({
    from: instanceId,
    name: 'FrontBeam',
  });
  window.api.scene.set(
    { id: frontBeamId, plug: 'Transform', property: 'translation' },
    { x: -stretchX, y: 0, z: 0 }
  );
  window.api.scene.set(
    {
      id: frontBeamId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchZ || 0
  );

  return id;
}

async function getNodeForPushPullHandle(id, values) {
  const { translation, rotation, stretch } = values;
  const instanceId = await getAssetInstanceId(window.api, id);

  // Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );
  //  Rotation
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    rotation
  );

  window.api.scene.set(
    {
      from: instanceId,
      name: 'Bar',
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretch
  );
  window.api.scene.set(
    {
      from: instanceId,
      name: 'LeftCap',
      plug: 'Transform',
      property: 'translation',
    },
    { x: stretch, y: 0, z: 0 }
  );
  window.api.scene.set(
    {
      from: instanceId,
      name: 'RightCap',
      plug: 'Transform',
      property: 'translation',
    },
    { x: -stretch, y: 0, z: 0 }
  );

  return id;
}

async function getNodeForFoldingHandle(id, values) {
  const { translation, rotation, length } = values;
  const instanceId = await getAssetInstanceId(window.api, id);

  let handleZAdj = length >= 30 ? 40 : 29; // if cart wider than 36in, then handles are 8in off edge, else handles are 3.5in off edge
  const z = ((length - handleZAdj) * INCH_TO_CM) / 2;

  // Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );
  //  Rotation
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    rotation
  );

  window.api.scene.set(
    {
      from: instanceId,
      name: 'Left',
      plug: 'Transform',
      property: 'translation',
    },
    { x: 0, y: 0, z: z }
  );
  window.api.scene.set(
    {
      from: instanceId,
      name: 'Right',
      plug: 'Transform',
      property: 'translation',
    },
    { x: 0, y: 0, z: -z }
  );

  return id;
}

async function getNodeForTeeHandle(id, values) {
  const { target, xOffset, yOffset, rotation } = values;
  const { translation } = target.data;
  const { x, y, z } = translation;
  const instanceId = await getAssetInstanceId(window.api, id);

  // Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    { x: x + xOffset, y: y + yOffset, z }
  );
  //  Rotation
  if (rotation) {
    window.api.scene.set(
      { id, plug: 'Transform', property: 'rotation' },
      rotation
    );
  }
  // Turn on/off brake components
  if (values.brakes) {
    const brakesId = window.api.scene.findNode({
      from: instanceId,
      name: 'Brake_Assy'
    });
    window.api.scene.set(
      {id: brakesId, plug: 'Properties', property: 'visible'},
      values.brakes === 'hydraulic'
    );
  }

  return id;
}

async function getNodeForNitrogenCradle(id, values) {
  const { translation } = values;
  
  // Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation,
  );

  return id;
}