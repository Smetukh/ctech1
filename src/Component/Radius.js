import { INCH_TO_M, INCH_TO_CM } from '../constants';
import { getAssetInstanceId, reparent } from '../helper';
import {
  RADIUS_RAIL_MESH_WIDTH,
  RADIUS_RAIL_MESH_DEPTH,
  RADIUS_BASE_PANEL_MESH_WIDTH,
  RADIUS_PANEL_MESH_WIDTH,
  RADIUS_PANEL_MESH_DEPTH,
  RADIUS_THICHNESS,
  MAT_THICKNESS,
  TOE_KICK_HEIGHT,
  RADIUS_GASKET_LOCK_ADJUSTMENT,
} from './constants';
import { materialAssigner } from '../materials';
import { updateAssets } from './helper';
import { Component } from './Component';

const RADIUS_RAIL_CUT_Z_OFFSET = 5.5;

export class Radius extends Component {
  constructor(radius, frame, toekick, soffit) {
    super('radius');

    this.reset(radius, frame, toekick, soffit);
  }

  reset(radius, frame, toekick, soffit) {
    const assets = {};

    const { left, right, top, bottom, lighting } = radius;
    const { width, height, depth, gasketLoc, extensions } = frame;

    const leftExt = extensions && extensions.left;
    const rightExt = extensions && extensions.right;
    const leftExtended = leftExt && leftExt.type === 'extended';
    const rightExtended = rightExt && rightExt.type === 'extended';
    const leftAdjoined = leftExt && leftExt.type === 'adjoined';
    const rightAdjoined = rightExt && rightExt.type === 'adjoined';

    const soffitHeight = soffit ? soffit.height : 0;

    if (bottom) {
      // Radius at bottom of cab
      const y = -(height / 2 + 1);
      const panelAsset = { data: { width, depth, x: 0, y } };
      if (rightExtended) {
        panelAsset.data.width += rightExt.width - 0.09;
        panelAsset.data.x += (rightExt.width - 0.09) / 2;
      } else if (rightAdjoined) {
        panelAsset.data.width += 3.6 - 0.09;
        panelAsset.data.x += (3.6 - 0.09) / 2;
      }
      if (leftExtended) {
        panelAsset.data.width += leftExt.width;
        panelAsset.data.x -= leftExt.width / 2;
      } else if (leftAdjoined) {
        panelAsset.data.width += 3.6 - 0.09;
        panelAsset.data.x -= (3.6 - 0.09) / 2;
      }
      if (
        left ||
        right ||
        (leftExt && leftExt.width) ||
        (rightExt && rightExt.width)
      ) {
        panelAsset.name = 'RadiusPanel';
        panelAsset.build = getNodeForRadiusPanel;

        const z = depth / 2;

        const bottomRailAsset = {
          name: 'RadiusRail',
          data: {
            length: width,
            x: 0,
            y,
            z,
            leftStretch: 1,
            rightStretch: 1,
          },
          build: getNodeForRadiusRail,
        };
        if (left) {
          bottomRailAsset.data.leftCut = {
            z: -45,
          };
        } else if (leftExtended || leftAdjoined) {
          bottomRailAsset.data.leftCut = {
            y: 45,
          };
        } else {
          bottomRailAsset.data.leftStretch = 0;
        }
        if (right) {
          bottomRailAsset.data.rightCut = {
            z: 45,
          };
        } else if (rightExtended || rightAdjoined) {
          bottomRailAsset.data.rightCut = {
            y: -45,
          };
        } else {
          bottomRailAsset.data.rightStretch = 0;
        }

        assets.bottomRail = bottomRailAsset;
      } else {
        panelAsset.name = 'RadiusBaseComb';
        panelAsset.build = getNodeForRadiusBase;
      }
      assets.bottomPanel = panelAsset;
        // Radius Panel Lighting
        if (lighting.lights > 0) {
            // calculate puck light locaitons
            let puckLightSpacing = frame.width / (lighting.lights + 1);
            let puckLightOffset = puckLightSpacing;

            // add puck lights to renderer
            const puckLights = [];
            let puckLightLocation = -frame.width / 2 + puckLightOffset;
            for (let i = 0; i < lighting.lights; ++i) {
                const puckLight = {
                    name: 'PuckLight',
                    data: {
                        x: puckLightLocation,
                        y: y - 1
                    },
                    build: getNodeForRadiusLights,
                }
                puckLights.push(puckLight);
                puckLightLocation += puckLightSpacing;
            }
            puckLights.forEach((asset, index) => {
                assets[`${asset.name}${index}`] = asset;
            });
            const spotLights = [];
            let spotLightLocation = -frame.width / 2 + puckLightOffset;
            for (let i = 0; i < lighting.lights; ++i) {
                const spotLight = {
                    name: 'PuckLight_SpotLight',
                    data: {
                        x: spotLightLocation,
                        y: y - 1
                    },
                    build: getNodeForRadiusSpotLights,
                }
                spotLights.push(spotLight);
                spotLightLocation += puckLightSpacing;
            }
            spotLights.forEach((asset, index) => {
                assets[`${asset.name}${index}`] = asset;
            });
            // Radius Panel Lighting Switches
            if (lighting.switches != "none") {
                let switchDepthOffset = frame.depth / 2 - 6.625;
                let switchWidthOffset = 4;
                let switchXLocation = lighting.switches == "left" ? ((-frame.width / 2) + switchWidthOffset) : ((frame.width / 2) - switchWidthOffset);
                const lightSwitch = {
                    name: 'PuckLightSwitch',
                    data: {
                        x: switchXLocation,
                        y: y - 0.375,
                        z: switchDepthOffset
                    },
                    build: getNodeForRadiusLightSwitch,
                };
                assets.lightSwitch = lightSwitch;
            }
        }
    }
    if (top) {
      // Radius on top of cab
      const y = height / 2 + 1;
      const panelAsset = { data: { width, depth, x: 0, y, rotateZ: 180 } };
      if (rightExtended) {
        panelAsset.data.width += rightExt.width - 0.09;
        panelAsset.data.x += (rightExt.width - 0.09) / 2;
      } else if (rightAdjoined) {
        panelAsset.data.width += 3.6 - 0.09;
        panelAsset.data.x += (3.6 - 0.09) / 2;
      }
      if (leftExtended) {
        panelAsset.data.width += leftExt.width;
        panelAsset.data.x -= leftExt.width / 2;
      } else if (leftAdjoined) {
        panelAsset.data.width += 3.6 - 0.09;
        panelAsset.data.x -= (3.6 - 0.09) / 2;
      }
      if (
        left ||
        right ||
        (leftExt && leftExt.width) ||
        (rightExt && rightExt.width)
      ) {
        panelAsset.name = 'RadiusPanel';
        panelAsset.build = getNodeForRadiusPanel;

        const z = depth / 2;

        const topRailAsset = {
          name: 'RadiusRail',
          data: {
            length: width,
            x: 0,
            y,
            z,
            leftStretch: 1,
            rightStretch: 1,
            rotateZ: 180,
          },
          build: getNodeForRadiusRail,
        };
        if (left) {
          topRailAsset.data.rightCut = {
            z: 45,
          };
        } else if (leftExtended || leftAdjoined) {
          topRailAsset.data.rightCut = {
            y: -45,
          };
        } else {
          topRailAsset.data.rightStretch = 0;
        }
        if (right) {
          topRailAsset.data.leftCut = {
            z: -45,
          };
        } else if (rightExtended || rightAdjoined) {
          topRailAsset.data.leftCut = {
            y: 45,
          };
        } else {
          topRailAsset.data.leftStretch = 0;
        }

        assets.topRail = topRailAsset;
      } else {
        panelAsset.name = 'RadiusBaseComb';
        panelAsset.build = getNodeForRadiusBase;
      }
      assets.topPanel = panelAsset;
    }
    if (left) {
      // Radius at left side of cab
      const x = -(width / 2 + 1);
      const panelAsset = {
        data: { width: height, depth, x, y: 0, rotateZ: -90 },
      };
      if (top || bottom) {
        panelAsset.name = 'RadiusPanel';
        if (top) {
          panelAsset.data.width += RADIUS_THICHNESS;
          panelAsset.data.y += RADIUS_THICHNESS / 2;
        }
        if (bottom) {
          panelAsset.data.width += RADIUS_THICHNESS;
          panelAsset.data.y -= RADIUS_THICHNESS / 2;
        }
        // Rail
        const z = depth / 2;
        const leftRailAsset = {
          name: 'RadiusRail',
          data: {
            length: height,
            x,
            y: 0,
            z,
            leftStretch: 1,
            rightStretch: 1,
            rotateZ: -90,
          },
          build: getNodeForRadiusRail,
        };
        if (top) {
          leftRailAsset.data.leftCut = {
            z: -45,
          };
        } else {
          leftRailAsset.data.leftStretch = 0;
        }
        if (bottom) {
          leftRailAsset.data.rightCut = {
            z: 45,
          };
        } else {
          leftRailAsset.data.rightStretch = 0;
        }

        if (toekick) {
          panelAsset.data.width += TOE_KICK_HEIGHT;
          panelAsset.data.y -= TOE_KICK_HEIGHT / 2;
          leftRailAsset.data.rightStretch -= TOE_KICK_HEIGHT;
        }
        if (gasketLoc) {
          panelAsset.data.width += RADIUS_GASKET_LOCK_ADJUSTMENT;
          panelAsset.data.y += RADIUS_GASKET_LOCK_ADJUSTMENT / 2;
          leftRailAsset.data.leftStretch += RADIUS_GASKET_LOCK_ADJUSTMENT;
        }
        if (soffitHeight) {
          panelAsset.data.width += soffitHeight;
          panelAsset.data.y += soffitHeight / 2;
          leftRailAsset.data.leftStretch += soffitHeight;
        }
        panelAsset.build = getNodeForRadiusPanel;

        assets.leftRail = leftRailAsset;
      } else {
        panelAsset.name = 'RadiusBaseComb';
        if (toekick) {
          panelAsset.data.width += TOE_KICK_HEIGHT;
          panelAsset.data.y -= TOE_KICK_HEIGHT / 2;
        }
        if (gasketLoc) {
          panelAsset.data.width += RADIUS_GASKET_LOCK_ADJUSTMENT;
          panelAsset.data.y += RADIUS_GASKET_LOCK_ADJUSTMENT / 2;
        }
        if (soffitHeight) {
          panelAsset.data.width += soffitHeight;
          panelAsset.data.y += soffitHeight / 2;
        }
        panelAsset.build = getNodeForRadiusBase;
      }
      assets.leftPanel = panelAsset;
    }
    if (right) {
      // Radius at right side of cab
      const x = width / 2 + 1;
      const panelAsset = {
        data: { width: height, depth, x, y: 0, rotateZ: 90 },
      };
      if (top || bottom) {
        panelAsset.name = 'RadiusPanel';
        if (top) {
          panelAsset.data.width += RADIUS_THICHNESS;
          panelAsset.data.y += RADIUS_THICHNESS / 2;
        }
        if (bottom) {
          panelAsset.data.width += RADIUS_THICHNESS;
          panelAsset.data.y -= RADIUS_THICHNESS / 2;
        }
        // Rail
        const z = depth / 2;
        const rightRailAsset = {
          name: 'RadiusRail',
          data: {
            length: height,
            x,
            y: 0,
            z,
            leftStretch: 1,
            rightStretch: 1,
            rotateZ: 90,
          },
          build: getNodeForRadiusRail,
        };
        if (top) {
          rightRailAsset.data.rightCut = {
            z: 45,
          };
        } else {
          rightRailAsset.data.rightStretch = 0;
        }
        if (bottom) {
          rightRailAsset.data.leftCut = {
            z: -45,
          };
        } else {
          rightRailAsset.data.leftStretch = 0;
        }

        if (toekick) {
          panelAsset.data.width += TOE_KICK_HEIGHT;
          panelAsset.data.y -= TOE_KICK_HEIGHT / 2;
          rightRailAsset.data.leftStretch -= TOE_KICK_HEIGHT;
        }
        if (gasketLoc) {
          panelAsset.data.width += RADIUS_GASKET_LOCK_ADJUSTMENT;
          panelAsset.data.y += RADIUS_GASKET_LOCK_ADJUSTMENT / 2;
          rightRailAsset.data.rightStretch += RADIUS_GASKET_LOCK_ADJUSTMENT;
        }
        if (soffitHeight) {
          panelAsset.data.width += soffitHeight;
          panelAsset.data.y += soffitHeight / 2;
          rightRailAsset.data.rightStretch += soffitHeight;
        }

        panelAsset.build = getNodeForRadiusPanel;

        assets.rightRail = rightRailAsset;
      } else {
        panelAsset.name = 'RadiusBaseComb';
        if (toekick) {
          panelAsset.data.width += TOE_KICK_HEIGHT;
          panelAsset.data.y -= TOE_KICK_HEIGHT / 2;
        }
        if (gasketLoc) {
          panelAsset.data.width += RADIUS_GASKET_LOCK_ADJUSTMENT;
          panelAsset.data.y += RADIUS_GASKET_LOCK_ADJUSTMENT / 2;
        }
        if (soffitHeight) {
          panelAsset.data.width += soffitHeight;
          panelAsset.data.y += soffitHeight / 2;
        }
        panelAsset.build = getNodeForRadiusBase;
      }
      assets.rightPanel = panelAsset;
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
    return this.id;
  }
}

async function getNodeForRadiusPanel(id, values) {
  const stretchX = (values.width * INCH_TO_M - RADIUS_PANEL_MESH_WIDTH) * 50;
  const stretchZ =
    (values.depth * INCH_TO_M - RADIUS_PANEL_MESH_DEPTH - MAT_THICKNESS) * 50;
  const x = (values.x || 0) * INCH_TO_M;
  const y = (values.y || 0) * INCH_TO_M;

  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const panelMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'Panel',
  });

  // 0 Translate & rotation
  window.api.scene.set(
    { id: panelMeshId, plug: 'Transform', property: 'translation' },
    { x, y, z: MAT_THICKNESS / 2 }
  );
  window.api.scene.set(
    { id: panelMeshId, plug: 'Transform', property: 'rotation' },
    { x: 0, y: 0, z: values.rotateZ || 0 }
  );
  // 1 Stretch
  window.api.scene.set(
    {
      id: panelMeshId,
      plug: 'PolyMesh',
      //   properties: { type: 'Stretch' },
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: panelMeshId,
      plug: 'PolyMesh',
      //   properties: { type: 'Stretch' },
      operatorIndex: 3,
      property: 'stretchDistance',
    },
    stretchZ
  );
  // material
  applyMaterialToNode(panelMeshId);
  return id;
}

async function getNodeForRadiusRail(id, values) {
  const stretch =
    ((values.length + Math.max(values.leftStretch, values.rightStretch)) *
      INCH_TO_M -
      RADIUS_RAIL_MESH_WIDTH / 2) *
    100;
  const x = (values.x || 0) * INCH_TO_M;
  const y = (values.y || 0) * INCH_TO_M;
  const z = values.z * INCH_TO_M - RADIUS_RAIL_MESH_DEPTH / 2;
  const defaultCut = { x: 0, y: 0, z: 0 };
  const leftCut = values.leftCut
    ? { ...defaultCut, ...values.leftCut }
    : defaultCut;
  const rightCut = values.rightCut
    ? { ...defaultCut, ...values.rightCut }
    : defaultCut;

  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const railMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'Rail',
  });

  // 0 Translate & rotation
  window.api.scene.set(
    { id: railMeshId, plug: 'Transform', property: 'translation' },
    { x, y, z }
  );
  window.api.scene.set(
    { id: railMeshId, plug: 'Transform', property: 'rotation' },
    { x: 0, y: 0, z: values.rotateZ || 0 }
  );

  // 1 Stretch
  window.api.scene.set(
    {
      id: railMeshId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      //   operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretch
  );

  // 2 Left Cut
  window.api.scene.set(
    {
      id: railMeshId,
      plug: 'PolyMesh',
      // properties: { type: 'Stretch' },
      operatorIndex: 2,
      property: 'center',
    },
    {
      x: -(values.length / 2 + values.leftStretch) * INCH_TO_CM,
      y: 0,
      z: RADIUS_RAIL_CUT_Z_OFFSET,
    }
  );
  window.api.scene.set(
    {
      id: railMeshId,
      plug: 'PolyMesh',
      // properties: { type: 'Stretch' },
      operatorIndex: 2,
      property: 'rotation',
    },
    leftCut
  );
  // 3 Right Cut
  window.api.scene.set(
    {
      id: railMeshId,
      plug: 'PolyMesh',
      // properties: { type: 'Stretch' },
      operatorIndex: 3,
      property: 'center',
    },
    {
      x: (values.length / 2 + values.rightStretch) * INCH_TO_CM,
      y: 0,
      z: RADIUS_RAIL_CUT_Z_OFFSET,
    }
  );
  window.api.scene.set(
    {
      id: railMeshId,
      plug: 'PolyMesh',
      // properties: { type: 'Stretch' },
      operatorIndex: 3,
      property: 'rotation',
    },
    rightCut
  );
  // material
  applyMaterialToNode(railMeshId);
  return id;
}

async function getNodeForRadiusBase(id, values) {
    const stretchX =
        (values.width * INCH_TO_M - RADIUS_BASE_PANEL_MESH_WIDTH) / 2;
    const stretchZ =
        (values.depth * INCH_TO_M - RADIUS_BASE_PANEL_MESH_WIDTH) / 2;
  const x = (values.x || 0) * INCH_TO_M;
  const y = (values.y || 0) * INCH_TO_M;

  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const baseMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'Base',
  });

  // 0 Translate & rotations
  window.api.scene.set(
    { id: baseMeshId, plug: 'Transform', property: 'translation' },
    { x, y, z: 0 }
  );
  window.api.scene.set(
    { id: baseMeshId, plug: 'Transform', property: 'rotation' },
    { x: 0, y: 0, z: values.rotateZ || 0 }
  );
  // 1. Stretch
  window.api.scene.set(
    {
      id: baseMeshId,
      plug: 'PolyMesh',
      //   properties: { type: 'Stretch' },
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: baseMeshId,
      plug: 'PolyMesh',
      //   properties: { type: 'Stretch' },
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    stretchZ
  );

  // material
  applyMaterialToNode(baseMeshId);
  return id;
}

async function getNodeForRadiusLights(id, values) {
    const x = values.x * INCH_TO_M;
    const y = values.y * INCH_TO_M;

    const instanceId = await getAssetInstanceId(window.api, id);

    const puckLightId = window.api.scene.findNode({
        from: instanceId,
        name: 'PuckLight',
    });

    window.api.scene.set(
        { id: puckLightId, plug: 'Transform', property: 'translation' },
        { x, y, z: 0 }
    );

    return id;
}

async function getNodeForRadiusSpotLights(id, values) {
    const x = values.x * INCH_TO_M;
    const y = values.y * INCH_TO_M;

    const instanceId = await getAssetInstanceId(window.api, id);

    const spotLightId = window.api.scene.findNode({
        from: instanceId,
        name: 'PuckLight_SpotLight',
    });

    window.api.scene.set(
        { id: spotLightId, plug: 'Transform', property: 'translation' },
        { x, y, z: 0 }
    );

    return id;
}

async function getNodeForRadiusLightSwitch(id, values) {
    const x = values.x * INCH_TO_M;
    const y = values.y * INCH_TO_M;
    const z = values.z * INCH_TO_M;

    const instanceId = await getAssetInstanceId(window.api, id);

    const switchId = window.api.scene.findNode({
        from: instanceId,
        name: 'PuckLightSwitch',
    });

    window.api.scene.set(
        { id: switchId, plug: 'Transform', property: 'translation' },
        { x, y, z }
    );

    return id;
}
