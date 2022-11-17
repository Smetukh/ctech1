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

    /* var centerRailOffset = 0;
    
    // Add handling for multiple openings
    if(openings.openings !== undefined){
      openings.forEach((opening, idx) => {
        // Build Center rails by measuring right side of each opening
        if(opening.frame.right === "center rail"){
            // Offset will measure from left of opening. The measurements start at 0 (flush with left end post), but will include 1/2 center rail width for all further adjustments
            centerRailOffset = (centerRailOffset == 0 ? centerRailOffset + opening.width + RAIL_WIDTH/2 : centerRailOffset + opening.width + RAIL_WIDTH/2);
            const centerRail = {
                name: 'CartCenterRail',

                data: {
                    translation: {
                    x: -((width/2) + centerRailOffset) * INCH_TO_M,
                    y: 0,
                    z: 0,
                    },
                    rotation: { x: 0, y: 0, z: 0 },
                    stretch: height * INCH_TO_M,
                },
                build: getNodeForPart,
            };
            assets.push(centerRail);
        }
      });
    } */

    assets.openings = this.assets.openings
      ? this.assets.openings.reset(
          openings,
          body,
          chassis,
          side.openings ? side.openings[0].width : side.width,
          side.openings ? side.openings[0].depth : side.depth
        )
      : new SideOpenings(
          openings,
          body,
          chassis,
          side.openings ? side.openings[0].width : side.width,
          side.openings ? side.openings[0].depth : side.depth
        );

    this.assets = updateAssets(this.assets, assets);

    return this;
  }

  /* async build() {
    await this.fetchObjects();
    const partNodes = await Promise.all(
      Object.values(this.assets)
        .filter((asset) => asset.modified !== false || !this.initialized)
        .map((asset) => asset.build(asset.id, asset.data))
    );

    reparent(window.api, this.id, ...partNodes);
    this.initialized = true;
    return this.id;
  } */

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
