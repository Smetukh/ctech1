import { reparent } from '../../helper';
import { INCH_TO_M } from '../../constants';
import { RAIL_WIDTH } from '../constants';
import { SideOpening } from './SideOpening';
import { updateAssets } from '../helper';
import { Component } from '../Component';
import { SideOpenings } from './SideOpenings';

export class Side extends Component {
  constructor(side, body, sideName, chassis) {
    super('side');
    this.translation = {};
    this.reset(side, body, sideName, chassis);
  }

  reset(side, body, sideName, chassis) {
    const assets = {};

    const { openings } = side;
    const bodyWidth = body.width;
    const bodyDepth = body.depth;
    const tiedowns = body.front.options ? body.front.options.tiedowns : null;

    if (sideName === 'left') {
      this.translation = { x: 0, y: 0, z: -(bodyDepth / 2) * INCH_TO_M };
      this.rotation = { x: 0, y: 180, z: 0 };
    } else if (sideName === 'right') {
      this.translation = { x: 0, y: 0, z: (bodyDepth / 2) * INCH_TO_M };
      // this.translation = {x: 0, y: 0, z: 0};
      this.rotation = { x: 0, y: 0, z: 0 };
    } else if (sideName === 'front') {
      this.translation = { x: -(bodyWidth / 2) * INCH_TO_M, y: 0, z: 0 };
      this.rotation = { x: 0, y: 270, z: 0 };
    } else if (sideName === 'rear') {
      this.translation = { x: (bodyWidth / 2) * INCH_TO_M, y: 0, z: 0 };
      this.rotation = { x: 0, y: 90, z: 0 };
    }

    assets.openings = this.assets.openings
      ? this.assets.openings.reset(
          openings,
          (sideName === 'front' || sideName === 'rear') ? tiedowns : null,
          chassis,
          side.openings ? side.openings[0].width : side.width,
          side.openings ? side.openings[0].depth : side.depth
        )
      : new SideOpenings(
          openings,
          (sideName === 'front' || sideName === 'rear') ? tiedowns : null,
          chassis,
          side.openings ? side.openings[0].width : side.width,
          side.openings ? side.openings[0].depth : side.depth
        );

    this.assets = updateAssets(this.assets, assets);

    return this;
  }

  async build() {
    await this.fetchObjects();
    const partNodes = await Promise.all(
      Object.values(this.assets)
        .filter((asset) => asset.modified !== false)
        .map((asset) => asset.build(asset.id, asset.data))
    );
    reparent(window.api, this.id, ...partNodes);
    // align cabinet base to floor
    partNodes.forEach((id) => [
      window.api.scene.set(
        { id, plug: 'Transform', property: 'translation' },
        this.translation
      ),
      window.api.scene.set(
        { id, plug: 'Transform', property: 'rotation' },
        this.rotation
      ),
    ]);

    window.poolApi.createObjectsPool(this.id);

    return this.id;
  }
}
