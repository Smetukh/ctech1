import { getAssetInstanceId, reparent } from '../../helper';
import { INCH_TO_M, INCH_TO_CM } from '../../constants';
import { updateAssets } from '../helper';
import { materialAssigner } from '../../materials';
import { Component } from '../Component';

const ELECTRONICS_COVER_Y_ADJ = 0.5; // in Inches

export class ElectronicsCover extends Component {
  constructor(body) {
    super('electronicsCover');
    this.reset(body);
  }

  reset(body) {
    const { height, depth } = body;

    const assets = {};

    console.log('height for electronics cover - ' + height);
    assets.electronicsCover = {

        name: 'ElectronicsCover',

        data: {

            translation: {
                x: 0,
                y: (-(height / 2) + ELECTRONICS_COVER_Y_ADJ) * INCH_TO_M, 
                //y: 0,
                z: -(depth/2) * INCH_TO_M,
            },
            rotation: { x: 0, y: 0, z: 0 },

        },
        build: getNodeForElectronicsCover,
    };

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



const getNodeForElectronicsCover = async (id, values) => {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const { translation, rotation } = values;
  const coverMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'CoverMesh',
  });
  const bottomMountMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'BottomMount',
  });
  console.log('translate for electronics cover - ' + translation);
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

 
  applyMaterialToNode(coverMeshId);
  applyMaterialToNode(bottomMountMeshId);

  return id;
};