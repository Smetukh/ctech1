import { getAssetInstanceId, reparent } from '../helper';
import { INCH_TO_M, INCH_TO_CM } from '../constants';
import { updateAssets } from './helper';
import { materialAssigner } from '../materials';
import { Component } from './Component';

const POST_MESH_LENGTH = 12; // In inches
const RAIL_MESH_LENGTH = 12; // In inches
const POST_MESH_RADIUS = 1.3875;
const RAIL_SIT_BACK = 1.31;

const RAIL_LENGTH_ADJ = 0.0508;

const getNodeForPiece = async (id, values) => {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const { translation, rotation, stretch } = values;
  const postMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'Item',
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
  // 2. Stretch
  window.api.scene.set(
    {
      id: postMeshId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretch
  );

  applyMaterialToNode(postMeshId);

  //* need to return id so after build mesh the
  //* caller can reparent this to caller's null
  return id;
};

export class Body extends Component {
  constructor(body) {
    super('body');

    this.reset(body);
  }

  reset(body) {
    // TODO Build posts, centre rails, toprail
    const { width, height, depth } = body;

    const leftFrontPost = {
      // name tells which mesh to use, we could reuse same asset
      // for all posts by applying y-rotation (90*n degree)
      name: 'LeftPost',
      // An id will be added to this object after fetchObjects()
      // id: undefined,
      data: {
        // right now in inches
        translation: {
          x: -(width / 2 - POST_MESH_RADIUS) * INCH_TO_M,
          y: 0,
          z: (depth / 2 - POST_MESH_RADIUS) * INCH_TO_M,
        },
        rotation: { x: 0, y: 0, z: 0 },
        stretch: ((height - POST_MESH_LENGTH) / 2) * INCH_TO_CM,
      },
      build: getNodeForPiece,
    };
    const rightFrontPost = {
      name: 'LeftPost',
      data: {
        translation: {
          x: (width / 2 - POST_MESH_RADIUS) * INCH_TO_M,
          y: 0,
          z: (depth / 2 - POST_MESH_RADIUS) * INCH_TO_M,
        },
        rotation: { x: 0, y: 90, z: 0 },
        stretch: ((height - POST_MESH_LENGTH) / 2) * INCH_TO_CM,
      },
      build: getNodeForPiece,
    };
    const leftRearPost = {
      name: 'LeftPost',
      data: {
        translation: {
          x: -(width / 2 - POST_MESH_RADIUS) * INCH_TO_M,
          y: 0,
          z: -(depth / 2 - POST_MESH_RADIUS) * INCH_TO_M,
        },
        rotation: { x: 0, y: 270, z: 0 },
        stretch: ((height - POST_MESH_LENGTH) / 2) * INCH_TO_CM,
      },
      build: getNodeForPiece,
    };
    const rightRearPost = {
      name: 'LeftPost',
      data: {
        translation: {
          x: (width / 2 - POST_MESH_RADIUS) * INCH_TO_M,
          y: 0,
          z: -(depth / 2 - POST_MESH_RADIUS) * INCH_TO_M,
        },
        rotation: { x: 0, y: 180, z: 0 },
        stretch: ((height - POST_MESH_LENGTH) / 2) * INCH_TO_CM,
      },
      build: getNodeForPiece,
    };
    // Rails
    const topFrontRail = {
      name: 'ZeeRail',
      data: {
        translation: {
          x: 0,
          y: (height / 2) * INCH_TO_M,
          z: (depth / 2 - RAIL_SIT_BACK) * INCH_TO_M,
        },
        rotation: { x: 0, y: 0, z: 0 },
        stretch: ((width - RAIL_MESH_LENGTH) / 2) * INCH_TO_M - RAIL_LENGTH_ADJ, // The *.01 because rail transform scale is 1 vs post scale of .01
      },
      build: getNodeForPiece,
    };

    const topRearRail = {
      name: 'ZeeRail',
      data: {
        translation: {
          x: 0,
          y: (height / 2) * INCH_TO_M,
          z: -(depth / 2 - RAIL_SIT_BACK) * INCH_TO_M,
        },
        rotation: { x: 0, y: 180, z: 0 },
        stretch: ((width - RAIL_MESH_LENGTH) / 2) * INCH_TO_M - RAIL_LENGTH_ADJ,
      },
      build: getNodeForPiece,
    };

    const topLeftRail = {
      name: 'ZeeRail',
      data: {
        translation: {
          x: -(width / 2 - RAIL_SIT_BACK) * INCH_TO_M,
          y: (height / 2) * INCH_TO_M,
          z: 0,
        },
        rotation: { x: 0, y: -90, z: 0 },
        stretch: ((depth - RAIL_MESH_LENGTH) / 2) * INCH_TO_M - RAIL_LENGTH_ADJ,
      },
      build: getNodeForPiece,
    };

    const topRightRail = {
      name: 'ZeeRail',
      data: {
        translation: {
          x: (width / 2 - RAIL_SIT_BACK) * INCH_TO_M,
          y: (height / 2) * INCH_TO_M,
          z: 0,
        },
        rotation: { x: 0, y: 90, z: 0 },
        stretch: ((depth - RAIL_MESH_LENGTH) / 2) * INCH_TO_M - RAIL_LENGTH_ADJ,
      },
      build: getNodeForPiece,
    };

    const bottomFrontRail = {
      name: 'ZeeRail',
      data: {
        translation: {
          x: 0,
          y: -(height / 2) * INCH_TO_M,
          z: (depth / 2 - RAIL_SIT_BACK) * INCH_TO_M,
        },
        rotation: { x: 0, y: 0, z: 180 },
        stretch: ((width - RAIL_MESH_LENGTH) / 2) * INCH_TO_M - RAIL_LENGTH_ADJ,
      },
      build: getNodeForPiece,
    };

    const bottomRearRail = {
      name: 'ZeeRail',
      data: {
        translation: {
          x: 0,
          y: -(height / 2) * INCH_TO_M,
          z: -(depth / 2 - RAIL_SIT_BACK) * INCH_TO_M,
        },
        rotation: { x: 0, y: 180, z: 180 },
        stretch: ((width - RAIL_MESH_LENGTH) / 2) * INCH_TO_M - RAIL_LENGTH_ADJ,
      },
      build: getNodeForPiece,
    };

    const bottomLeftRail = {
      name: 'ZeeRail',
      data: {
        translation: {
          x: -(width / 2 - RAIL_SIT_BACK) * INCH_TO_M,
          y: -(height / 2) * INCH_TO_M,
          z: 0,
        },
        rotation: { x: 0, y: 90, z: 180 },
        stretch: ((depth - RAIL_MESH_LENGTH) / 2) * INCH_TO_M - RAIL_LENGTH_ADJ,
      },
      build: getNodeForPiece,
    };

    const bottomRightRail = {
      name: 'ZeeRail',
      data: {
        translation: {
          x: (width / 2 - RAIL_SIT_BACK) * INCH_TO_M,
          y: -(height / 2) * INCH_TO_M,
          z: 0,
        },
        rotation: { x: 0, y: -90, z: 180 },
        stretch:
          ((depth - RAIL_MESH_LENGTH) / 2) * INCH_TO_CM * 0.01 -
          RAIL_LENGTH_ADJ,
      },
      build: getNodeForPiece,
    };

    const assets = {
      leftFrontPost,
      rightFrontPost,
      leftRearPost,
      rightRearPost,
      topFrontRail,
      topLeftRail,
      topRightRail,
      topRearRail,
      bottomFrontRail,
      bottomLeftRail,
      bottomRightRail,
      bottomRearRail,
    };

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
