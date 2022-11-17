import { TOEKICK_Y_OFFSET, INCH_TO_M } from '../constants';
import { getAssetInstanceId, reparent } from '../helper';
import { Component } from './Component';
import { updateAssets } from './helper';

export class ToekickFeet extends Component {
  constructor(frame, openings) {
    super('toekickfeet');

    this.reset(frame, openings);
  }

  reset(frame, openings) {
    const assets = {};
    const frontFootAssets = [];
    const rearFootAssets = [];

    //
    /* const LeftOffsetToInitialFaceFrame = -0.09;//in
    const LeftExtensionDistance = 0;//for future reference
    const RightOffsetToInitialFaceFrame = -0.09;//in
    const RightExtensionDistance = 0;//for future reference
    const LeftFeetWidthOffset = 4.34 + LeftOffsetToInitialFaceFrame + LeftExtensionDistance;
    const RightFeetWidthOffset = 4.34 + RightOffsetToInitialFaceFrame + RightExtensionDistance; */
    const protectionZoneSize = 7.75; // in
    const { width, depth, height } = frame;
    const pairsOfOutsideFeet = 2;
    const cabinetEdgeX = -(width - 0.16) / 2;
    let internalFeetCount = 0;
    let internalFeetSpacing = 0;
    let possibleFeetPosition = 0;
    let protectionZoneStart = 0;
    let protectionZoneEnd = 0;
    const feetDepthOffset = depth / 2 - 0.738 - 4.25; // in
    const outsideFeetWidthOffset = width / 2 - 0.08 - 4.25;
    const panelHeight = height - TOEKICK_Y_OFFSET;

    // outside feet
    for (let i = 0; i < pairsOfOutsideFeet; i++) {
      const frontFootAsset = {
        name: 'ToeKickFootAssy',
        data: {
          translate: {
            x: outsideFeetWidthOffset * INCH_TO_M * (i === 1 ? -1 : 1),
            y: (-(panelHeight - TOEKICK_Y_OFFSET + 0.16) / 2) * INCH_TO_M,
            z: -feetDepthOffset * INCH_TO_M,
          },
        },
      };
      frontFootAssets.push(frontFootAsset);

      const rearFootAsset = {
        name: 'ToeKickFootAssy',
        data: {
          translate: {
            x: outsideFeetWidthOffset * INCH_TO_M * (i === 1 ? -1 : 1),
            y: (-(panelHeight - TOEKICK_Y_OFFSET + 0.16) / 2) * INCH_TO_M,
            z: feetDepthOffset * INCH_TO_M,
          },
        },
      };
      rearFootAssets.push(rearFootAsset);
    }

    // inside feet
    const mainOpn = openings[0];
    const subOpenings = mainOpn.openings ? mainOpn.openings : ''; // won't need in the future
    const numOpenings = mainOpn.openings ? subOpenings.length : '';
    const openingsOnToekick = [];
    const internalFeetPosition = [];

    if (width >= 96) {
      internalFeetCount = 2;
      internalFeetSpacing = (width - 0.16 - 8.5) / (internalFeetCount + 1); // in
    } else if (width >= 48) {
      internalFeetCount = 1;
    }

    if (internalFeetCount > 0) {
      if (mainOpn.openings) {
        for (let i = 0; i < numOpenings; i++) {
          if (subOpenings.bottom === 'toekick') {
            openingsOnToekick.push(subOpenings[i]);
          }
        }
      } else {
        openingsOnToekick.push(mainOpn);
      }

      if (mainOpn.openings) {
        for (let i = 0; i < internalFeetCount; i++) {
          possibleFeetPosition = (internalFeetSpacing / 2) * (i === 0 ? -1 : 1);
          internalFeetPosition.push(possibleFeetPosition);
        }
      } else {
        possibleFeetPosition = internalFeetSpacing / 2;
        internalFeetPosition.push(possibleFeetPosition);
      }

      let startOfOpening = cabinetEdgeX + 1.5;
      for (let i = 0; i < openingsOnToekick.length; i++) {
        const centerPanelPosition =
          startOfOpening + openingsOnToekick[i].width + 0.75;
        protectionZoneStart = centerPanelPosition - protectionZoneSize / 2;
        protectionZoneEnd = centerPanelPosition + protectionZoneSize / 2;
        for (let j = 0; j < internalFeetPosition.length; j++) {
          if (
            internalFeetPosition[j] > protectionZoneStart &&
            internalFeetPosition[j] < protectionZoneEnd
          ) {
            if (internalFeetPosition[j] - centerPanelPosition > 0) {
              internalFeetPosition[j] = protectionZoneEnd;
            } else {
              internalFeetPosition[j] = protectionZoneStart;
            }
          }
        }
        startOfOpening +=
          openingsOnToekick[i].width +
          (openingsOnToekick[i].frame.right === 'center rail' ? 1.5 : 0);
      }

      for (let i = 0; i < internalFeetCount; i++) {
        const frontFootAsset = {
          name: 'ToeKickFootAssy',
          data: {
            translate: {
              x: internalFeetPosition[i] * INCH_TO_M,
              y: (-(panelHeight - TOEKICK_Y_OFFSET + 0.16) / 2) * INCH_TO_M,
              z: -feetDepthOffset * INCH_TO_M,
            },
          },
        };
        frontFootAssets.push(frontFootAsset);

        const rearFootAsset = {
          name: 'ToeKickFootAssy',
          data: {
            translate: {
              x: internalFeetPosition[i] * INCH_TO_M,
              y: (-(panelHeight - TOEKICK_Y_OFFSET + 0.16) / 2) * INCH_TO_M,
              z: feetDepthOffset * INCH_TO_M,
            },
          },
        };
        rearFootAssets.push(rearFootAsset);
      }
    }

    frontFootAssets.forEach((asset, index) => {
      assets[`front${asset.name}${index}`] = asset;
    });
    rearFootAssets.forEach((asset, index) => {
      assets[`rear${asset.name}${index}`] = asset;
    });

    this.assets = updateAssets(this.assets, assets);

    return this;
  }

  async build() {
    await this.fetchObjects();
    const partNodes = await Promise.all(
      Object.values(this.assets)
        .filter((asset) => asset.modified !== false || !this.initialized)
        .map((asset) => getNodeForFootAsset(asset.id, asset.data))
    );

    reparent(window.api, this.id, ...partNodes);
    this.initialized = true;
    return this.id;
  }
}

async function getNodeForFootAsset(id, values) {
  const instanceId = await getAssetInstanceId(window.api, id);
  const toekickFootId = window.api.scene.findNode({
    from: instanceId,
    name: 'FootAssy',
  });

  window.api.scene.set(
    { id: toekickFootId, plug: 'Transform', property: 'translation' },
    values.translate
  );

  return id;
}
