import {
  SHELF_OFFSET_DEPTH,
  SHELF_DEPTH_ADJUSTMENT,
  SHELF_WIDTH,
  SHELF_DEPTH,
  RAIL_WIDTH,
  MAT_THICKNESS_INCHES,
  CENTER_RAIL_ATTACH_PLATE_OFFSET,
} from './constants';
import {
  INCH_TO_M,
  FIRST_OPENING,
  SINGLE_OPENING,
  INCH_TO_CM,
} from '../constants';
import { getAssetInstanceId, reparent } from '../helper';
import { calcSlotDepthSpacing } from './Shell';
import { updateAssets } from './helper';
import { materialAssigner } from '../materials';
import { Component } from './Component';

const CLIP_Z_OFFSET = 0.36;
const CLIP_DEFAULT_Z = 2.44;

export class Shelves extends Component {
  constructor(contents, options) {
    super('shelves');

    this.reset(contents, options);
  }

  reset(contents, options) {
    const assets = {};

    const { data, boundry, shelves } = contents;
    const { leftExt, rightExt } = boundry;
    const extensionLength = leftExt || rightExt || 0;
    const { isEndUnit, frameHeight, shelfYOffset } = options;
    const gasSping =
      data &&
      data.handle &&
      (data.handle.swing === 'top' || data.handle.swing === 'bottom');
    const shelfSpacing = frameHeight > 24 ? 2 : 1;
    const numOfSlots = Math.floor((boundry.height - 7) / shelfSpacing) + 1;
    const slotDepthSpacing = calcSlotDepthSpacing(boundry.depth);

    // Make sure numOfShelves visible not exceed capability
    const numOfShelves = shelves
      ? Math.min(shelves.adjustable, Math.floor(numOfSlots / 2))
      : 0;

    const delta = Math.max(Math.floor(numOfSlots / (numOfShelves + 1)), 2);
    let indexOfSlot = delta === 2 ? 0 : delta - 1;

    const firstSlotY =
      shelfYOffset -
      (numOfSlots % 2 === 0
        ? numOfSlots / 2 - 1
        : (numOfSlots - 1) / 2 - (shelfSpacing === 1 ? 1 : 0.5)) *
        shelfSpacing;

    let actualWidth =
      boundry.width +
      extensionLength +
      RAIL_WIDTH +
      CENTER_RAIL_ATTACH_PLATE_OFFSET * 2 +
      MAT_THICKNESS_INCHES * 2;
    let x = (extensionLength / 2) * (leftExt ? -1 : 1);

    if (isEndUnit) {
      const difference =
        (0.7 - MAT_THICKNESS_INCHES) * (isEndUnit === SINGLE_OPENING ? 2 : 1);
      actualWidth += difference;
      x +=
        (difference / 2) *
        (isEndUnit === FIRST_OPENING
          ? -1
          : isEndUnit === SINGLE_OPENING
          ? 0
          : 1);
    }

    for (let i = 0; i < numOfShelves; i++) {
      const shelfAsset = {
        name: 'Shelf',
        type: 'Shelf',
        data: {
          width: actualWidth,
          depth:
            boundry.depth -
            (SHELF_DEPTH_ADJUSTMENT + (gasSping ? SHELF_DEPTH_ADJUSTMENT : 0)),
          x,
          y: firstSlotY + indexOfSlot * shelfSpacing,
          z: -SHELF_OFFSET_DEPTH + (gasSping ? 0 : SHELF_DEPTH_ADJUSTMENT / 2),
          slotDepthSpacing,
          clipZAdjustment:
            ((gasSping ? 1 : 0) - MAT_THICKNESS_INCHES) * INCH_TO_CM,
        },
        build: getNodeForShelfAsset,
      };
      assets[`shelf${i}`] = shelfAsset;
      indexOfSlot += delta;
    }

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

async function getNodeForShelfAsset(id, values) {
  const width = INCH_TO_M * values.width;
  const depth = INCH_TO_M * values.depth;
  const x = INCH_TO_M * values.x;
  const y = INCH_TO_M * values.y;
  const z = INCH_TO_M * values.z;
  const stretchX = (width - SHELF_WIDTH) * 50;
  const stretchZ = (depth - SHELF_DEPTH) * 50;
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  // Shelf body
  const shelfId = window.api.scene.findNode({
    from: instanceId,
    name: 'Shelf_Body',
  });
  // 0. Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    { x, y, z }
  );
  // 1. Stretch
  window.api.scene.set(
    {
      id: shelfId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      // properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: shelfId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      // properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchZ
  );
  applyMaterialToNode(shelfId, 'steel');

  // Clips
  for (let i = 1; i < 5; i++) {
    const clipId = window.api.scene.findNode({
      from: instanceId,
      name: `ShelfClips${i}`,
    });
    const clipZ = (values.slotDepthSpacing * INCH_TO_CM) / 2 - CLIP_DEFAULT_Z;
    // 0. Translate
    window.api.scene.set(
      { id: clipId, plug: 'Transform', property: 'translation' },
      {
        x: (i < 3 ? -1 : 1) * stretchX,
        y: 0,
        z:
          (i % 2 === 0 ? 1 : -1) * clipZ +
          CLIP_Z_OFFSET +
          values.clipZAdjustment,
      }
    );
    applyMaterialToNode(clipId, 'steel');
  }
  return id;
}
