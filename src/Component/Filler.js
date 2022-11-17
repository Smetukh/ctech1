import { reparent, getAssetInstanceId } from '../helper';
import { INCH_TO_M } from '../constants';
import {
  FILLER_PANEL_MESH_SIZE,
  FILLER_PANEL_MESH_DEPTH,
  RAIL_GROOVE,
} from './constants';
import { materialAssigner } from '../materials';
import { updateAssets } from './helper';
import { Component } from './Component';

export class Filler extends Component {
  constructor(contents) {
    super('filler');

    this.reset(contents);
  }

  reset(contents) {
    const assets = {};

    const { data, boundry } = contents;
    const fillerAsset = getFillerPanel(data, boundry);
    if (this.assets.fillerAsset && this.assets.fillerAsset.id)
      fillerAsset.id = this.assets.fillerAsset.id;

    assets.fillerAsset = fillerAsset;

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

function getFillerPanel(size, boundry) {
  const { width, height } = size;
  const { depth } = boundry;
  const fillerPanelAsset = {
    name: 'FillerPanel',
    data: {
      width,
      height,
      depth: depth - RAIL_GROOVE,
      rotateY: 180,
    },
    build: getFillerPanelAsset,
  };
  return fillerPanelAsset;
}

async function getFillerPanelAsset(id, values) {
  const width = values.width * INCH_TO_M;
  const height = values.height * INCH_TO_M;
  const depth = values.depth * INCH_TO_M;
  const stretchX = (width - FILLER_PANEL_MESH_SIZE) * 50;
  const stretchY = (height - FILLER_PANEL_MESH_SIZE) * 50;
  const z = depth / 2 - FILLER_PANEL_MESH_DEPTH / 2;
  const instanceId = await getAssetInstanceId(window.api, id);
  const panelId = window.api.scene.findNode({
    from: instanceId,
    name: 'Item',
  });
  // 0. Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    { x: 0, y: 0, z }
  );
  // 1.Stretch
  window.api.scene.set(
    {
      id: panelId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      //   properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: panelId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      //   properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchY
  );
  // 2. Rotation
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    { x: 0, y: values.rotateY, z: 0 }
  );

  materialAssigner(id)(panelId);
  return id;
}
