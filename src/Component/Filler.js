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

    const { data, boundry, tiedowns } = contents;
    const fillerAsset = getFillerPanel(data, boundry, tiedowns);
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

function getFillerPanel(size, boundry, tiedowns) {
  const { width, height } = size;
  const { depth } = boundry;
  const fillerPanelAsset = {
    name: 'FillerPanel',
    data: {
      width,
      height,
      depth: depth - RAIL_GROOVE,
      rotateY: 180,
      tiedowns,
    },
    build: getFillerPanelAsset,
  };
  return fillerPanelAsset;
}

async function getFillerPanelAsset(id, values) {
  const width = values.width * INCH_TO_M;
  const height = values.height * INCH_TO_M;
  const depth = values.depth * INCH_TO_M;
  const stretchX = (width - (30 * INCH_TO_M)) / 2;//(width - FILLER_PANEL_MESH_SIZE) * 50;
  const stretchY = (height - (20 * INCH_TO_M)) / 2;//(height - FILLER_PANEL_MESH_SIZE) * 50;
  const z = depth / 2;// - FILLER_PANEL_MESH_DEPTH / 2;
  const instanceId = await getAssetInstanceId(window.api, id);
  /* The below region is related to the old Filler Panel asset --> Before DRing Cutouts were added
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
  materialAssigner(id)(panelId);*/

  // Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    { x: 0, y: 0, z },
  );
  // Rotation
  window.api.scene.set(
    { id, plug: 'Transform', property: 'rotation' },
    { x: 0, y: values.rotateY, z: 0, },
  );

  // Gather Node Ids
  const topPanelId = window.api.scene.findNode({
    from: instanceId,
    name: 'Filler_Panel_Top',
  });
  const middlePanelId = window.api.scene.findNode({
    from: instanceId,
    name: 'Filler_Panel_Middle',
  });
  const bottomLeftId = window.api.scene.findNode({
    from: instanceId,
    name: 'Filler_Panel_L',
  });
  const bottomRightId = window.api.scene.findNode({
    from: instanceId,
    name: 'Filler_Panel_R',
  });
  const standardLeftId = window.api.scene.findNode({
    from: instanceId,
    name: 'Filler_Panel_SCL',
  });
  const standardRightId = window.api.scene.findNode({
    from: instanceId,
    name: 'Filler_Panel_SCR',
  });
  const billetLeftId = window.api.scene.findNode({
    from: instanceId,
    name: 'Filler_Panel_BCL',
  });
  const billetRightId = window.api.scene.findNode({
    from: instanceId,
    name: 'Filler_Panel_BCR',
  });

  // Stretch
  window.api.scene.set(
    {
      id: topPanelId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX,
  );
  window.api.scene.set(
    {
      id: topPanelId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'stretchDistance',
    },
    stretchY,
  );
  window.api.scene.set(
    {
      id: middlePanelId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      property: 'stretchDistance',
    },
    stretchX
  );

  // Translate Individual Nodes
  window.api.scene.set(
    { id: middlePanelId, plug: 'Transform', property: 'translation' },
    { x: 0, y: -stretchY, z: 0 },
  );
  window.api.scene.set(
    { id: bottomLeftId, plug: 'Transform', property: 'translation' },
    { x: stretchX, y: -stretchY, z: 0 },
  );
  window.api.scene.set(
    { id: bottomRightId, plug: 'Transform', property: 'translation' },
    { x: -stretchX, y: -stretchY, z: 0 },
  );
  window.api.scene.set(
    { id: standardLeftId, plug: 'Transform', property: 'translation' },
    { x: stretchX, y: -stretchY, z: 0 },
  );
  window.api.scene.set(
    { id: standardRightId, plug: 'Transform', property: 'translation' },
    { x: -stretchX, y: -stretchY, z: 0 },
  );
  window.api.scene.set(
    { id: billetLeftId, plug: 'Transform', property: 'translation' },
    { x: stretchX, y: -stretchY, z: 0 },
  );
  window.api.scene.set(
    { id: billetRightId, plug: 'Transform', property: 'translation' },
    { x: -stretchX, y: -stretchY, z: 0 },
  );

  // Change Visibility of Nodes based on TieDowns
  window.api.scene.set(
    { id: bottomLeftId, plug: 'Properties', property: 'visible' },
    (values.tiedowns === undefined || values.tiedowns === null || values.tiedowns === 'none' || values.tiedowns === 'macsTieDown')
  );
  window.api.scene.set(
    { id: bottomRightId, plug: 'Properties', property: 'visible' },
    (values.tiedowns === undefined || values.tiedowns === null || values.tiedowns === 'none' || values.tiedowns === 'macsTieDown')
  );
  window.api.scene.set(
    { id: standardLeftId, plug: 'Properties', property: 'visible' },
    values.tiedowns === 'standard'
  );
  window.api.scene.set(
    { id: standardRightId, plug: 'Properties', property: 'visible' },
    values.tiedowns === 'standard'
  );
  window.api.scene.set(
    { id: billetLeftId, plug: 'Properties', property: 'visible' },
    values.tiedowns === 'billet'
  );
  window.api.scene.set(
    { id: billetRightId, plug: 'Properties', property: 'visible' },
    values.tiedowns === 'billet'
  );

  materialAssigner(id)(topPanelId);
  materialAssigner(id)(middlePanelId);
  materialAssigner(id)(bottomLeftId);
  materialAssigner(id)(bottomRightId);
  materialAssigner(id)(standardLeftId);
  materialAssigner(id)(standardRightId);
  materialAssigner(id)(billetLeftId);
  materialAssigner(id)(billetRightId);
  return id;
}