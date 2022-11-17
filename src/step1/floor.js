import { FLOOR_CONSTANTS } from './constants';
import { INCH_TO_M } from '../constants';
import { getRootNode, getAssetInstanceId } from '../helper';

export default class Floor {
  constructor(width, depth) {
    this.dimensions = {
      width,
      depth,
    };
    this.nodeId = this.getNodeId();
  }
  getNodeId() {
    return window.api.scene.findNode({
      from: getRootNode(window.api),
      name: FLOOR_CONSTANTS.MESH_NAME,
    });
  }

  update({ width, length } = {}) {
    if (width) this.dimensions.width = width;
    if (length) this.dimensions.depth = length;
    const widthM = this.dimensions.width * INCH_TO_M;
    const depthM = this.dimensions.depth * INCH_TO_M;
    window.api.scene.set(
      {
        id: this.nodeId,
        plug: 'PolyMesh',
        properties: { type: 'Box' },
        property: 'depth',
      },
      depthM
    );
    window.api.scene.set(
      {
        id: this.nodeId,
        plug: 'PolyMesh',
        properties: { type: 'Box' },
        property: 'width',
      },
      widthM
    );
    const widthFeetRemainder = this.dimensions.width % 24;
    const depthFeetRemainder = this.dimensions.depth % 24;
    window.api.scene.set(
      {
        id: this.nodeId,
        plug: 'PolyMesh',
        properties: { type: 'UVMap' },
        property: 'center',
      },
      {
        x: -((widthFeetRemainder - 12) * INCH_TO_M) / 2,
        y: 0,
        z: -((depthFeetRemainder - 12) * INCH_TO_M) / 2,
      }
    );
  }
}
