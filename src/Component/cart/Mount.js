import { getAssetInstanceId, reparent } from '../../helper';
import { INCH_TO_M, INCH_TO_CM } from '../../constants';
import { updateAssets } from '../helper';
import { materialAssigner } from '../../materials';
import { Component } from '../Component';

const MOUNT_DEFAULTS = {
  Tahoe: {
    WIDTH: 47,
    HEIGHT: 1.75,
    DEPTH: 39.62,
    SIT_BACK: 0.09,
  },
  Explorer: {
    WIDTH: 40,
    HEIGHT: 1.75,
    DEPTH: 36.254,
    SIT_BACK: -0.036,
  },
  Durango: {
    WIDTH: 40,
    HEIGHT: 11.125,
    DEPTH: 51.732,
    SIT_BACK: -0.07635,
  },
  Expedition: {
    WIDTH: 47.25,
    HEIGHT: 5.491,
    DEPTH: 26.172,
    SIT_BACK: 0,
  },
};

const getNodeForMount = async (id, values) => {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const mountMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'Object',
  });

  const { xStretch, zStretch, sitBack } = values;

  window.api.scene.set(
    { id: mountMeshId, plug: 'Transform', property: 'translation' },
    { x: 0, y: 0, z: -sitBack }
  );

  window.api.scene.set(
    {
      id: mountMeshId,
      plug: 'PolyMesh',
      //   properties: { type: 'Stretch' },
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    xStretch
  );

  window.api.scene.set(
    {
      id: mountMeshId,
      plug: 'PolyMesh',
      //   properties: { type: 'Stretch' },
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    zStretch
  );
  applyMaterialToNode(mountMeshId);
  return id;
};

const getNodeForDurango = async (id, values) => {
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);

  const nullId = window.api.scene.findNode({
    from: instanceId,
    name: 'Null',
  });
  const { xStretch, zStretch, sitBack } = values;

  window.api.scene.set(
    { id: nullId, plug: 'Transform', property: 'translation' },
    { x: 0, y: 0, z: -sitBack }
  );

  // Parts
  const railId = window.api.scene.findNode({
    from: instanceId,
    name: 'Durango_1',
  });
  window.api.scene.set(
    [railId, 'plugs', 'PolyMesh', 1, 'stretchDistance'],
    xStretch
  );
  window.api.scene.set(
    [railId, 'plugs', 'PolyMesh', 2, 'stretchDistance'],
    zStretch
  );
  //
  const panelId = window.api.scene.findNode({
    from: instanceId,
    name: 'Durango_2',
  });
  window.api.scene.set(
    [panelId, 'plugs', 'PolyMesh', 1, 'stretchDistance'],
    xStretch
  );
  window.api.scene.set(
    [panelId, 'plugs', 'PolyMesh', 2, 'stretchDistance'],
    zStretch
  );
  //
  const backBaseId = window.api.scene.findNode({
    from: instanceId,
    name: 'Durango_3',
  });
  window.api.scene.set(
    [backBaseId, 'plugs', 'PolyMesh', 1, 'stretchDistance'],
    xStretch
  );
  window.api.scene.set(
    { id: backBaseId, plug: 'Transform', property: 'translation' },
    {
      x: 0,
      y: 0,
      z: -zStretch,
    }
  );
  //
  const frontBarId = window.api.scene.findNode({
    from: instanceId,
    name: 'Durango_4',
  });
  window.api.scene.set(
    [frontBarId, 'plugs', 'PolyMesh', 1, 'stretchDistance'],
    xStretch
  );
  window.api.scene.set(
    { id: frontBarId, plug: 'Transform', property: 'translation' },
    {
      x: 0,
      y: 0,
      z: zStretch,
    }
  );
  //
  const leftScrewId = window.api.scene.findNode({
    from: instanceId,
    name: 'Screw_1',
  });
  window.api.scene.set(
    { id: leftScrewId, plug: 'Transform', property: 'translation' },
    {
      x: -xStretch,
      y: 0,
      z: zStretch,
    }
  );
  const rightScrewId = window.api.scene.findNode({
    from: instanceId,
    name: 'Screw_2',
  });
  window.api.scene.set(
    { id: rightScrewId, plug: 'Transform', property: 'translation' },
    {
      x: xStretch,
      y: 0,
      z: zStretch,
    }
  );
  //
  const handleId = window.api.scene.findNode({
    from: instanceId,
    name: 'Durango_Handle',
  });
  window.api.scene.set(
    { id: handleId, plug: 'Transform', property: 'translation' },
    {
      x: 0,
      y: 0,
      z: zStretch,
    }
  );
  applyMaterialToNode(railId);
  applyMaterialToNode(panelId);
  applyMaterialToNode(backBaseId);
  applyMaterialToNode(frontBarId);
  applyMaterialToNode(leftScrewId, 'BlackSteel');
  applyMaterialToNode(rightScrewId, 'BlackSteel');
  applyMaterialToNode(handleId, 'BlackPlastic');

  return id;
};

export class Mount extends Component {
  constructor(mount) {
    super('mount');

    this.reset(mount);
  }

  reset(mount) {
    const { width, depth, height, model } = mount;

    const assets =
      model && MOUNT_DEFAULTS[model]
        ? {
            [model]: {
              name: model,
              data: {
                xStretch:
                  ((width - MOUNT_DEFAULTS[model].WIDTH) * INCH_TO_CM) / 2,
                zStretch:
                  ((depth - MOUNT_DEFAULTS[model].DEPTH) * INCH_TO_CM) / 2,
                sitBack: MOUNT_DEFAULTS[model].SIT_BACK,
              },
              build: model === 'Durango' ? getNodeForDurango : getNodeForMount,
            },
          }
        : {};

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