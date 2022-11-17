import { reparent, getAssetInstanceId } from '../../helper';
import { materialAssigner } from '../../materials';
import { Door } from '../Door';
import { Insert } from '../Insert';
import { Filler } from '../Filler';
import { Shelves } from '../Shelves';
import { updateAssets } from '../helper';
import { Component } from '../Component';
import { INCH_TO_CM, INCH_TO_M } from '../../constants';
import {
  END_RAIL_PLANE_HEIGHT,
  MAT_THICKNESS_CM,
  RAIL_MESH_LENGTH,
  RAIL_WIDTH,
} from '../constants';

export class ChassisOpening extends Component {
  constructor(opening, translation, rotation) {
    super('ChassisOpening');

    this.reset(opening, translation, rotation);
  }

  reset(opening, translation, rotation) {
    const assets = {};

    this.translation = translation;
    this.rotation = rotation;
    //
    const { contents, width, height, depth, frame } = opening;

    if (contents) {
      const { type, shelves } = contents;
      const boundry = { width, height, depth };
      const data = { ...contents, boundry };

      if (type === 'door') {
        data.ChassisDoor = true;
        assets.door = this.assets.door
          ? this.assets.door.reset(data)
          : new Door(data);
      } else if (type === 'insert') {
        assets.insert = this.assets.insert
          ? this.assets.insert.reset(data, frame, false)
          : new Insert(data, frame, false);
      } else if (type === 'filler') {
        assets.filler = this.assets.filler
          ? this.assets.filler.reset(data)
          : new Filler(data);
      }
    }

    const hasLeftEndRail = frame.left === 'end rail';
    const hasRightEndRail = frame.right === 'end rail';
    const hasTopRail = frame.top === 'top rail';
    const hasBottomRail = frame.bottom === 'bottom rail';
    const cutTop = !hasTopRail;
    const cutBottom = !hasBottomRail;

    if (hasLeftEndRail) {
      assets.leftEndRail = {
        name: 'LeftEndRail',
        data: {
          translation: {
            x: -(width / 2 + RAIL_WIDTH) * INCH_TO_M,
            y: 0,
            z: (depth / 2) * INCH_TO_M,
          },
          stretch:
            ((height * INCH_TO_M - RAIL_MESH_LENGTH) / 2 +
              ((cutTop ? 1 : 0) + (cutBottom ? 1 : 0)) *
                END_RAIL_PLANE_HEIGHT) *
            100,
          topSlice: cutTop ? END_RAIL_PLANE_HEIGHT * 100 : 0,
          bottomSlice: cutBottom ? END_RAIL_PLANE_HEIGHT * 100 : 0,
        },
        build: getNodeForEndRail,
      };
    }
    if (hasRightEndRail) {
      assets.rightEndRail = {
        name: 'RightEndRail',
        data: {
          translation: {
            x: (width / 2 + RAIL_WIDTH) * INCH_TO_M,
            y: 0,
            z: (depth / 2) * INCH_TO_M,
          },
          stretch:
            ((height * INCH_TO_M - RAIL_MESH_LENGTH) / 2 +
              ((cutTop ? 1 : 0) + (cutBottom ? 1 : 0)) *
                END_RAIL_PLANE_HEIGHT) *
            100,
          topSlice: cutTop ? END_RAIL_PLANE_HEIGHT * 100 : 0,
          bottomSlice: cutBottom ? END_RAIL_PLANE_HEIGHT * 100 : 0,
        },
        build: getNodeForEndRail,
      };
    }
    if (hasBottomRail) {
      assets.bottomRail = {
        name: 'BottomRail',
        data: {
          translation: {
            x: 0,
            y: -(height / 2 + RAIL_WIDTH) * INCH_TO_M,
            z: (depth / 2) * INCH_TO_M,
          },
          stretch:
            ((width +
              (hasLeftEndRail ? RAIL_WIDTH : 0) +
              (hasRightEndRail ? RAIL_WIDTH : 0)) *
              INCH_TO_CM -
              RAIL_MESH_LENGTH * 100) /
              2 -
            MAT_THICKNESS_CM,
        },
        build: getNodeForHorizontalRail,
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
        .map((asset) => asset.build(asset.id, asset.data))
    );

    reparent(window.api, this.id, ...partNodes);
    this.initialized = true;
    window.api.scene.set(
      { id: this.id, plug: 'Transform', property: 'translation' },
      this.translation
    );
    window.api.scene.set(
      { id: this.id, plug: 'Transform', property: 'rotation' },
      this.rotation
    );

    return this.id;
  }
}

async function getNodeForEndRail(id, values) {
  const { translation, stretch, topSlice, bottomSlice } = values;
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const railMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'Item',
  });
  // 0. Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );
  // 1. Stretch
  window.api.scene.set(
    {
      id: railMeshId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretch
  );
  // 2. Cut top
  window.api.scene.set(
    {
      id: railMeshId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      property: 'center',
    },
    {
      x: 0,
      y: stretch + RAIL_MESH_LENGTH * 50 - topSlice,
      z: 0,
    }
  );
  // 3. Cut bottom
  window.api.scene.set(
    {
      id: railMeshId,
      plug: 'PolyMesh',
      operatorIndex: 3,
      property: 'center',
    },
    {
      x: 0,
      y: -(stretch + RAIL_MESH_LENGTH * 50 - bottomSlice),
      z: 0,
    }
  );
  applyMaterialToNode(railMeshId);
  return id;
}

async function getNodeForHorizontalRail(id, values) {
  const { translation, stretch } = values;
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const railMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'Item',
  });
  // 0. Translate
  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    translation
  );
  // 1. stretch
  window.api.scene.set(
    {
      id: railMeshId,
      plug: 'PolyMesh',
      properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretch
  );
  applyMaterialToNode(railMeshId);
  return id;
}