import { INCH_TO_CM, INCH_TO_M } from '../constants';
import { materialAssigner } from '../materials';
import { getAssetInstanceId, reparent } from '../helper';
import { updateAssets } from './helper';
import { Component } from './Component';

// In inches
const SOFFIT_MESH_LENGTH = 48;
const SOFFIT_MESH_HEIGHT = 3;
const SOFFIT_Z_OFFSET = -0.01; // Center is at center of mesh's bottom

export class Soffit extends Component {
  constructor(soffit, frame, radius) {
    super('soffits');
    this.initialized = false;

    this.reset(soffit, frame, radius);
  }

  reset(soffit, frame, radius) {
    const assets = {};

    if (soffit && soffit.height > 0) {
      const soffitHeight = soffit.height;
      const { width, height, depth } = frame;
      const { left, right, front } = soffit;

      const y = ((height - SOFFIT_MESH_HEIGHT + soffitHeight) / 2) * INCH_TO_M;

      if (left && !radius.left)
        assets.left = {
          name: 'Soffit',
          data: {
            stretchOperators: [
              ((depth - SOFFIT_MESH_LENGTH) / 2) * INCH_TO_CM +
                SOFFIT_Z_OFFSET * 50,
              ((soffitHeight - SOFFIT_MESH_HEIGHT) / 2) * INCH_TO_CM,
            ],
            translate: {
              x: -(width / 2) * INCH_TO_M - SOFFIT_Z_OFFSET,
              y,
              z: SOFFIT_Z_OFFSET / 2,
            },
            rotate: {
              x: 0,
              y: -90,
              z: 0,
            },
          },
        };
      if (front)
        assets.front = {
          name: 'Soffit',
          data: {
            stretchOperators: [
              ((width - SOFFIT_MESH_LENGTH) / 2) * INCH_TO_CM,
              ((soffitHeight - SOFFIT_MESH_HEIGHT) / 2) * INCH_TO_CM,
            ],
            translate: {
              x: 0,
              y,
              z: (depth / 2) * INCH_TO_M + SOFFIT_Z_OFFSET,
            },
          },
        };
      if (right && !radius.right)
        assets.right = {
          name: 'Soffit',
          data: {
            stretchOperators: [
              ((depth - SOFFIT_MESH_LENGTH) / 2) * INCH_TO_CM +
                SOFFIT_Z_OFFSET * 50,
              ((soffitHeight - SOFFIT_MESH_HEIGHT) / 2) * INCH_TO_CM,
            ],
            translate: {
              x: (width / 2) * INCH_TO_M + SOFFIT_Z_OFFSET,
              y,
              z: SOFFIT_Z_OFFSET / 2,
            },
            rotate: {
              x: 0,
              y: 90,
              z: 0,
            },
          },
        };
    }

    this.assets = updateAssets(this.assets, assets);

    return this;
  }

  async build() {
    await this.fetchObjects();
    const partNodes = await Promise.all(
      Object.values(this.assets)
        .filter((asset) => asset.modified !== false || !this.initialized)
        .map((asset) => {
          return getNodeForAsset(asset.id, asset.data);
        })
    );

    reparent(window.api, this.id, ...partNodes);
    this.initialized = true;
    return this.id;
  }
}

async function getNodeForAsset(id, values) {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const meshId = window.api.scene.findNode({
    from: instanceId,
    name: 'Item',
  });

  if (values.translate)
    window.api.scene.set(
      { id, plug: 'Transform', property: 'translation' },
      values.translate
    );
  if (values.rotate)
    window.api.scene.set(
      { id, plug: 'Transform', property: 'rotation' },
      values.rotate
    );
  values.stretchOperators.forEach((stretch, idx) => {
    window.api.scene.set(
      {
        id: meshId,
        plug: 'PolyMesh',
        operatorIndex: idx + 1,
        property: 'stretchDistance',
      },
      stretch
    );
  });

  applyMaterialToNode(meshId);
  return id;
}
