import { getAssetInstanceId, reparent } from '../../helper';
import { INCH_TO_M, INCH_TO_CM } from '../../constants';
import { MAT_THICKNESS_INCHES, RADIUS_THICHNESS } from '../constants';
import { updateAssets } from '../helper';
import { materialAssigner } from '../../materials';
import { Component } from '../Component';


export class GearGuard extends Component {
  constructor(top, body) {
    super('gearGuard');
    this.reset(top, body);
  }

  reset(top, body) {
    const { height, surface} = body;
    const bodyWidth = body.width;
    const guardHeight = body.options.gearGuard;
    const { depth } = top;

    const assets = {};
    // Map material from json to material name in constants.js
    const bodyMat = getTopSurfaceMat(surface);

    
    assets.gearGuard = {
        // name tells which mesh to use, we could reuse same asset
        // for all posts by applying y-rotation (90*n degree)
        name: 'GearGuard' + bodyWidth + guardHeight,
        // An id will be added to this object after fetchObjects()
        // id: undefined,
        data: {
            // right now in inches
            translation: {
                x: 0,
                y: (height / 2 + MAT_THICKNESS_INCHES) * INCH_TO_M, // Use post mesh as that is the driver of height
                z: -(depth/2) * INCH_TO_M,
            },
            rotation: { x: 0, y: 0, z: 0 },
            //mat: surface === 'painted' ? finish && finish.color : traySurfaceMat,
        },
        build: getNodeForGearGuard,
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



const getNodeForGearGuard = async (id, values) => {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const { translation, rotation } = values;
  const gearGuardMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'gearGuard',
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

 
  applyMaterialToNode(gearGuardMeshId);

  //* need to return id so after build mesh the
  //* caller can reparent this to caller's null
  return id;
};

function getTopSurfaceMat(topSurface) {
  switch (topSurface) {
    case 'sanded':
      return 'SandedTopMetal';
    case 'painted':
      return 'laminate';
    case 'stainless':
      return 'steel';
    default:
      return null;
  }
}
