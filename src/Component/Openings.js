import { reparent } from '../helper';
import { INCH_TO_M } from '../constants';
import { RAIL_WIDTH } from './constants';
import { Opening } from './Opening';
import { updateAssets } from './helper';
import { Component } from './Component';

export class Openings extends Component {
  constructor(openings, frame, backPanel, nodeLevel = -1, isEndUnit = undefined) {
    super('openings');

    this.reset(openings, frame, backPanel, nodeLevel, isEndUnit);
  }

  reset(openings, frame, backPanel, nodeLevel = -1, isEndUnit = undefined) {
    this.nodeLevel = nodeLevel;
    this.isEndUnit = isEndUnit;

    const assets = {};

    const { extensions, leftExt, rightExt } = frame;

    const left = extensions && extensions.left;
    const right = extensions && extensions.right;

    let totalXOffset =
      (-frame.width / 2 + (this.nodeLevel === -1 ? RAIL_WIDTH : 0)) * INCH_TO_M;
    let totalYOffset =
      (frame.height / 2 -
        (this.nodeLevel === -1 ? RAIL_WIDTH : 0) -
        (frame.gasketLoc ? 0.5 : 0)) *
      INCH_TO_M;

    openings.forEach((opening, idx) => {
      const xOffset = totalXOffset + (opening.width / 2) * INCH_TO_M;

      const yOffset = totalYOffset - (opening.height / 2) * INCH_TO_M;

      if (this.nodeLevel % 2 === 0) {
        totalXOffset += INCH_TO_M * (opening.width + RAIL_WIDTH);
      } else if (this.nodeLevel % 2 === 1) {
        totalYOffset -=
          INCH_TO_M *
          (opening.height +
            (opening.frame.bottom.indexOf('rail') !== -1 ? RAIL_WIDTH : 0));
      }
      if (idx === 0) {
        if (leftExt) {
          opening.leftExt = leftExt;
        } else if (left && left.type === 'extended') {
          opening.leftExt = left.width;
        }
      }
      if (idx === openings.length - 1) {
        if (rightExt) {
          opening.rightExt = rightExt;
        } else if (right && right.type === 'extended') {
          opening.rightExt = right.width;
        }
      }
      const translation = { x: xOffset, y: yOffset, z: 0 };
      const assetName = `opening${idx}`;
      assets[assetName] = this.assets[assetName]
        ? this.assets[assetName].reset(
            opening,
            idx,
            this.nodeLevel,
            this.isEndUnit,
            translation,
            backPanel
          )
        : new Opening(
            opening,
            idx,
            this.nodeLevel,
            this.isEndUnit,
            translation,
            backPanel
          );
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
