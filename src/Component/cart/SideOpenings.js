import { reparent } from '../../helper';
import { INCH_TO_M } from '../../constants';
import { RAIL_WIDTH } from '../constants';
import { SideOpening } from './SideOpening';
import { updateAssets } from '../helper';
import { Component } from '../Component';

export class SideOpenings extends Component {
  constructor(
    openings,
    tiedowns,
    chassis,
    sideWidth,
    sideDepth,
    nodeLevel = -1,
    isEndUnit = undefined
  ) {
    super('openings');

    this.reset(openings, tiedowns, chassis, sideWidth, sideDepth, nodeLevel, isEndUnit);
  }

  reset(
    openings,
    tiedowns,
    chassis,
    sideWidth,
    sideDepth,
    nodeLevel = -1,
    isEndUnit = undefined
  ) {
    this.nodeLevel = nodeLevel;
    this.isEndUnit = isEndUnit;

    const assets = {};

    let totalXOffset = (-sideWidth / 2) * INCH_TO_M;

    const zOffset = (-sideDepth / 2) * INCH_TO_M;

    openings.forEach((opening, idx) => {
      let xOffset = 0;
      if (!opening.openings) {
        xOffset = totalXOffset + (opening.width / 2) * INCH_TO_M;
      } else {
        xOffset = (-sideWidth / 2) * INCH_TO_M;
      }

      if (this.nodeLevel % 2 === 0) {
        totalXOffset += INCH_TO_M * (opening.width + RAIL_WIDTH);
      }
      
      const translation = { x: xOffset, y: 0, z: zOffset };
      const assetName = `opening${idx}`;
      assets[assetName] = this.assets[assetName]
        ? this.assets[assetName].reset(
            opening,
            chassis,
            tiedowns,
            idx,
            this.nodeLevel,
            this.isEndUnit,
            translation
          )
        : new SideOpening(
            opening,
            chassis,
            tiedowns,
            idx,
            this.nodeLevel,
            this.isEndUnit,
            translation
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
