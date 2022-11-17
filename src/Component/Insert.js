import { reparent, getAssetInstanceId } from '../helper';
import { INCH_TO_M } from '../constants';
import {
  DRAWER_GAP,
  DRAWER_SIDE_GAP,
  FIRST_DRAWER_OFFSET,
  DRAWER_RACK_SET_WIDTH,
  DRAWER_RACK_SET_HEIGHT,
  DRAWER_RACK_SET_DEPTH,
  DRAWER_MSEH_WIDTH,
  DRAWER_MESH_HEIGHT,
  DRAWER_HEIGHT_DIFF,
  DRAWER_MESH_DEPTH,
  LOCK_WIDTH
} from './constants';
import { materialAssigner } from '../materials';
import { updateAssets } from './helper';
import { Component } from './Component';

export class Insert extends Component {
  constructor(contents, frame, backPanel) {
    super('insert');

    this.reset(contents, frame, backPanel);
  }

  reset(contents, frame, backPanel) {
    const assets = {};
      
    const { boundry, data, isCart } = contents;

    let cartZOffset = isCart ? 0.12 : 0;
    assets.drawerRackAsset = getDrawerRack(data.insert, cartZOffset, backPanel);

    let yOffset = boundry.height / 2 - FIRST_DRAWER_OFFSET;
    let drawerYOffset = yOffset;
    let lockYOffset = yOffset;
      const drawerAssets = data.drawers.map((drawer, index) => {
          const width = data.insert.width - DRAWER_SIDE_GAP * 2;
          const { height } = drawer;
          const { depth } = data.insert;
          const translation = {
              x: 0,
              //y: yOffset * INCH_TO_M,
              y: drawerYOffset * INCH_TO_M,
              z: ((boundry.depth / 2) + cartZOffset) * INCH_TO_M,
          };
          
          let btmSpace = boundry.height - (data.topSpace - 0.25);
          let extDistance = 0.0;
          let extCover = (index + 1) === data.drawers.length ? true : false;
          if (extCover) {
              // Calculate Bottom Space
              if (frame.top === 'center rail' || frame.top === 'zee rail') {
                  btmSpace -= 0.423;
              } else {
                  btmSpace -= 0.298
              }

              if (frame.bottom === 'toekick') {
                  btmSpace -= 1
              }

              for (let i = 0; i <= index; i++){
                  btmSpace -= data.drawers[i].height;
              }
              btmSpace = Math.round(btmSpace * 1000) / 1000;
              // Calculate Extension Distance
              switch (frame.bottom) {
                  case 'bottom rail':
                  case 'center rail':
                  case 'zee rail':
                      if (btmSpace < 0.875) {
                          extDistance = 0;
                      } else {
                          extDistance = btmSpace - 0.250;
                      }
                      break;
                  case 'toekick':
                      if (btmSpace < -0.375) {
                          extDistance = 0;
                      } else {
                          extDistance = btmSpace + 1;
                      }
                      break;
                  case 'removed split':
                      if (btmSpace < 0.75) {
                          extDistance = 0;
                      } else {
                          extDistance = btmSpace - 0.125;
                      }
                      break;
              }
        }
        // Only turn on extended cover when the drawer stack is almost full
        if (extCover) extCover = btmSpace <= (frame.bottom === 'toekick' ? 1.452 : 1.952);

      const drawerAsset = {
        name: 'Drawer',
        data: {
          width,
          height,
          depth,
          translation,
          extCover,
          extDistance
          },
        build: getDrawer,
      };

      //yOffset -= height + DRAWER_GAP;
      drawerYOffset -= height + DRAWER_GAP;

      return drawerAsset;
    });

    const lockAssets = data.drawers.map((drawer, index) => {
      let drawerLockAssets = [];
      const { height } = drawer;
      if(drawer.locking === 'individual'){ 
        let drawerLockAssetLeft; 
        const width = data.insert.width - DRAWER_SIDE_GAP * 2;
        const { depth } = data.insert;
        const translationLeft = {
          x: - 1/2 * width * INCH_TO_M,
          //y: yOffset * INCH_TO_M,
          y: lockYOffset * INCH_TO_M - .003,
          z: (boundry.depth / 2) * INCH_TO_M - .0012,
        };
        drawerLockAssetLeft = {
          name: 'DrawerLock',
          data: {
            width,
            height,
            depth,
            translation: translationLeft,
          },
          build: getDrawerLock,
        };
        drawerLockAssets.push(drawerLockAssetLeft);
        if(width > 24){
          const translationRight= {
            x: ((1/2 * width) - LOCK_WIDTH) * INCH_TO_M,
            //y: yOffset * INCH_TO_M,
            y: lockYOffset * INCH_TO_M - .003,
            z: (boundry.depth / 2) * INCH_TO_M - .0012,
          };
          let drawerLockAssetRight = {
            name: 'DrawerLock',
            data: {
              width,
              height,
              depth,
              translation: translationRight,
            },
            build: getDrawerLock,
          };
          drawerLockAssets.push(drawerLockAssetRight);
        }
      }
      //yOffset -= height + DRAWER_GAP;
      lockYOffset -= height + DRAWER_GAP;

      return drawerLockAssets;
    });

    if (data.drawers[data.drawers.length - 1].height === 3 && (frame.bottom === 'bottom rail' || frame.bottom === 'center rail' || frame.bottom === 'zee rail')) {
        var width = data.insert.width - 0.0625;
        var btmSpace = boundry.height - (data.topSpace - 0.25);
        if (frame.top === 'center rail' || frame.top === 'zee rail') {
            btmSpace -= 0.423;
        } else {
            btmSpace -= 0.298;
        }

        if (frame.bottom === 'toekick') {
            btmSpace -= 1;
        }

        for (let i = 0; i <= data.drawers.length - 1; ++i) {
            btmSpace -= data.drawers[i].height;
        }
        btmSpace = Math.round(btmSpace * 1000) / 1000;

        var height = frame.bottom === 'bottom rail' ? btmSpace - 0.125 : btmSpace - 0.25;
        var translation = {
            x: 0,
            y: isCart ? (-boundry.height / 2 + height / 2) * INCH_TO_M : (-boundry.height / 2 + height / 2 - 0.153) * INCH_TO_M,
            z: (boundry.depth / 2 - 1.43 + 1.046) * INCH_TO_M,
        };
        // Only turn on the filler strip when the drawer stack is almost full
        if (btmSpace <= 1.952) {
          const fillerStripAsset = {
              name: 'FillerStrip',
              data: {
                  width,
                  height,
                  translation,
              },
              build: getDrawerFillerStrip,
          };
          assets.fillerStrip = fillerStripAsset;
        }
    }

    drawerAssets.forEach((asset, index) => {
      assets[`drawer${index}`] = asset;
    });
    lockAssets.forEach((assetSet, drawerIndex) => {
      if(assetSet){
        assetSet.forEach((asset, lockIndex) => {
          let lockLabel = lockIndex === 0 ? 'Left':'Right';
          assets[`lock${drawerIndex}${lockLabel}`] = asset;
        });
      }
    });

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

async function getDrawer(id, values) {
    const width = INCH_TO_M * values.width;
    const height = INCH_TO_M * values.height;
    const depth = INCH_TO_M * values.depth;
    const stretchX = (width - DRAWER_MSEH_WIDTH) * 50;
    // Drawer body mesh is 1 inch taller
    const stretchY = (height - DRAWER_MESH_HEIGHT) * 50 - DRAWER_HEIGHT_DIFF;
    const stretchZ = (depth - DRAWER_MESH_DEPTH) * 50;
    const instanceId = await getAssetInstanceId(window.api, id);
    const applyMaterialToNode = materialAssigner(id);
    const rightHandleCapId = window.api.scene.findNode({
        from: instanceId,
        name: 'HandleCap_RS',
    });
    const leftHandleCapId = window.api.scene.findNode({
        from: instanceId,
        name: 'HandleCap_LS',
    });
    const drawerFaceId = window.api.scene.findNode({
        from: instanceId,
        name: 'DrawerFace',
    });
    const drawerHandleId = window.api.scene.findNode({
        from: instanceId,
        name: 'Drawer_Handle',
    });
    const drawerBodyId = window.api.scene.findNode({
        from: instanceId,
        name: 'Drawer_Body',
    });
    const drawerCoverId = window.api.scene.findNode({
        from: instanceId,
        name: 'Drawer_Cover',
    });
    const drawerExtCoverId = window.api.scene.findNode({
        from: instanceId,
        name: 'Drawer_Extended_Cover',
    });
    const drawerExtCoverBracketId = window.api.scene.findNode({
        from: instanceId,
        name: 'Drawer_Extended_Cover_Bracket',
    });
    // 0 Translate
    window.api.scene.set(
        { id, plug: 'Transform', property: 'translation' },
        values.translation
    );
    // 1 handle Caps
    window.api.scene.set(
        { id: rightHandleCapId, plug: 'Transform', property: 'translation' },
        { x: -stretchX, y: 0, z: 0 }
    );
    window.api.scene.set(
        { id: leftHandleCapId, plug: 'Transform', property: 'translation' },
        { x: stretchX, y: 0, z: 0 }
    );
    applyMaterialToNode(rightHandleCapId, 'plastic');
    applyMaterialToNode(leftHandleCapId, 'plastic');
    // 2 drawer face
    window.api.scene.set(
        {
            id: drawerFaceId,
            plug: 'PolyMesh',
            properties: { type: 'Stretch' },
            property: 'stretchDistance',
        },
        stretchX
    );
    applyMaterialToNode(drawerFaceId);
    // 3 drawer handle
    window.api.scene.set(
        {
            id: drawerHandleId,
            plug: 'PolyMesh',
            properties: { type: 'Stretch' },
            property: 'stretchDistance',
        },
        stretchX
    );
    applyMaterialToNode(drawerHandleId, 'steel');
    // 4 drawer body
    window.api.scene.set(
        {
            id: drawerBodyId,
            plug: 'PolyMesh',
            operatorIndex: 1,
            // properties: { type: 'Stretch' },
            property: 'stretchDistance',
        },
        stretchX
    );
    window.api.scene.set(
        {
            id: drawerBodyId,
            plug: 'PolyMesh',
            operatorIndex: 2,
            // properties: { type: 'Stretch' },
            property: 'stretchDistance',
        },
        stretchY
    );
    window.api.scene.set(
        {
            id: drawerBodyId,
            plug: 'PolyMesh',
            operatorIndex: 3,
            // properties: { type: 'Stretch' },
            property: 'stretchDistance',
        },
        stretchZ
    );
    window.api.scene.set(
        { id: drawerBodyId, plug: 'Transform', property: 'translation' },
        { x: 0, y: -stretchY, z: -stretchZ }
    );
    applyMaterialToNode(drawerBodyId, 'steel');
    // 5 drawer Cover
    if (values.height > 3) {
        // #Don't have many samples but it seems drawer higher than 3 inches have it
        window.api.scene.set(
            { id: drawerCoverId, plug: 'Properties', property: 'visible' },
            !values.extCover
        );
        window.api.scene.set(
            { id: drawerExtCoverId, plug: 'Properties', property: 'visible' },
            values.extCover
        );
        window.api.scene.set(
            { id: drawerExtCoverBracketId, plug: 'Properties', property: 'visible' },
            values.extCover
        );
        window.api.scene.set(
            {
                id: drawerCoverId,
                plug: 'PolyMesh',
                operatorIndex: 1,
                // properties: { type: 'Stretch' },
                property: 'stretchDistance',
            },
            stretchX
        );
        window.api.scene.set(
            {
                id: drawerCoverId,
                plug: 'PolyMesh',
                operatorIndex: 2,
                // properties: { type: 'Stretch' },
                property: 'stretchDistance',
            },
            stretchY
        );
        window.api.scene.set(
            { id: drawerCoverId, plug: 'Transform', property: 'translation' },
            { x: 0, y: -stretchY, z: 0 }
        );
        applyMaterialToNode(drawerCoverId);
        window.api.scene.set(
            {
                id: drawerExtCoverId,
                plug: 'PolyMesh',
                operatorIndex: 1,
                property: 'stretchDistance',
            },
            stretchX
        );
        window.api.scene.set(
            {
                id: drawerExtCoverId,
                plug: 'PolyMesh',
                operatorIndex: 2,
                property: 'stretchDistance',
            },
            stretchY + ((values.extDistance - 0.952) * INCH_TO_M * 50)
        );
        window.api.scene.set(
            { id: drawerExtCoverId, plug: 'Transform', property: 'translation' },
            { x: 0, y: -(stretchY + ((values.extDistance - 0.952) * INCH_TO_M * 50)), z: 0 }
        );
        window.api.scene.set(
            {
                id: drawerExtCoverBracketId,
                plug: 'PolyMesh',
                operatorIndex: 1,
                property: 'stretchDistance',
            },
            stretchX
        );
        window.api.scene.set(
            { id: drawerExtCoverBracketId, plug: 'Transform', property: 'translation' },
            { x: 0, y: -stretchY, z: 0 }
        );
        applyMaterialToNode(drawerExtCoverId);
        applyMaterialToNode(drawerExtCoverBracketId);
    } else {
        window.api.scene.set(
            { id: drawerCoverId, plug: 'Properties', property: 'visible' },
            false
        );
        window.api.scene.set(
            { id: drawerExtCoverId, plug: 'Properties', property: 'visible' },
            false
        );
        window.api.scene.set(
            { id: drawerExtCoverBracketId, plug: 'Properties', property: 'visible' },
            false
        );
    }
    return id;
}

async function getDrawerLock(id, values) {
  const width = INCH_TO_M * values.width;
  const height = INCH_TO_M * values.height;
  const depth = INCH_TO_M * values.depth;
  const stretchX = (width - DRAWER_MSEH_WIDTH) * 50;
  // Drawer body mesh is 1 inch taller
  const stretchY = (height - DRAWER_MESH_HEIGHT) * 50 - DRAWER_HEIGHT_DIFF;
  const stretchZ = (depth - DRAWER_MESH_DEPTH) * 50;
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);

  window.api.scene.set(
    { id, plug: 'Transform', property: 'translation' },
    values.translation
  );
  const lockMeshId = window.api.scene.findNode({
    from: instanceId,
    name: 'MetalLock',
  });
  const coverId = window.api.scene.findNode({
    from: instanceId,
    name: 'Cover',
  });
  applyMaterialToNode(lockMeshId, 'steel');
  applyMaterialToNode(coverId, 'plastic')
  return id;
}

function getDrawerRack(size, cartZOffset, backPanel) {
  const { width, height, depth } = size;

  const drawRackAsset = {
    name: 'DrawerRack',
    data: {
      width,
      height,
      depth,
      cartZOffset,
      backPanel
    },
    build: getNodeForDrawRackAsset,
  };

  return drawRackAsset;
}

async function getNodeForDrawRackAsset(id, values) {
  const DRAWER_RACK_DEPTH_ADJUSTMENT = 0.27; // Inch
  const width = INCH_TO_M * values.width;
  const height = INCH_TO_M * values.height;
  const depth = INCH_TO_M * (values.depth - (values.backPanel ? 0.66 : 0));
  const cartZOffset = values.cartZOffset;
  const stretchX = (width - DRAWER_RACK_SET_WIDTH) * 50;
  const stretchY = (height - DRAWER_RACK_SET_HEIGHT) * 50;
  const stretchZ = (depth - DRAWER_RACK_SET_DEPTH) * 50;
  const y = values.cartZOffset === 0 ? 0:(0.25 * INCH_TO_M); // If is a cart (which will have the offset), adjust upwards 0.25"
  const z = -(stretchZ / 100 + 1 * INCH_TO_M);
  const instanceId = await getAssetInstanceId(window.api, id);
  const applyMaterialToNode = materialAssigner(id);
  const leftRackId = window.api.scene.findNode({
    from: instanceId,
    name: 'Drawer_Rack_LS',
  });
  const rightRackId = window.api.scene.findNode({
    from: instanceId,
    name: 'Drawer_Rack_RS',
  });
  const backRackId = window.api.scene.findNode({
    from: instanceId,
    name: 'Drawer_Rack_Back',
  });

  // Left rack
  window.api.scene.set(
    {
      id: leftRackId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      // properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchY
  );
  window.api.scene.set(
    {
      id: leftRackId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      // properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchZ
  );
  window.api.scene.set(
    { id: leftRackId, plug: 'Transform', property: 'translation' },
    { x: -stretchX / 100, y, z: -(DRAWER_RACK_DEPTH_ADJUSTMENT - cartZOffset) * INCH_TO_M }
  );
  applyMaterialToNode(leftRackId, 'steel');

  // Right rack
  window.api.scene.set(
    {
      id: rightRackId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      // properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchY
  );
  window.api.scene.set(
    {
      id: rightRackId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      // properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchZ
  );
  window.api.scene.set(
    { id: rightRackId, plug: 'Transform', property: 'translation' },
    {
      x: stretchX / 100,
      y,
      z: -(DRAWER_RACK_DEPTH_ADJUSTMENT + 0.055 - cartZOffset) * INCH_TO_M,
    }
  );
  applyMaterialToNode(rightRackId, 'steel');

  // Back rack
  window.api.scene.set(
    {
      id: backRackId,
      plug: 'PolyMesh',
      operatorIndex: 1,
      // properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchX
  );
  window.api.scene.set(
    {
      id: backRackId,
      plug: 'PolyMesh',
      operatorIndex: 2,
      // properties: { type: 'Stretch' },
      property: 'stretchDistance',
    },
    stretchY
  );
  window.api.scene.set(
    { id: backRackId, plug: 'Transform', property: 'translation' },
    { x: 0, y, z: z + (cartZOffset * INCH_TO_M) }
  );
  applyMaterialToNode(backRackId, 'steel');
  return id;
}

async function getDrawerFillerStrip(id, values) {
    const width = values.width - 1;
    const height = values.height - 0.875;
    const y = values.translation.y;
    const z = values.translation.z;
    const stretchY = height / 2 * INCH_TO_M;
    const stretchX = width / 2 * INCH_TO_M;
    const instanceId = await getAssetInstanceId(window.api, id);
    const fillerStripId = window.api.scene.findNode({
        from: instanceId,
        name: 'Filler_Strip',
    });
    const applyMaterialToNode = materialAssigner(id);
    window.api.scene.set(
        { id: fillerStripId, plug: 'Transform', property: 'translation' },
        { x: 0, y, z }
    );
    window.api.scene.set(
        {
            id: fillerStripId,
            plug: 'PolyMesh',
            operatorIndex: 1,
            property: 'stretchDistance',
        },
        stretchX
    );
    window.api.scene.set(
        {
            id: fillerStripId,
            plug: 'PolyMesh',
            operatorIndex: 2,
            property: 'stretchDistance',
        },
        stretchY
    );
    applyMaterialToNode(fillerStripId);

    return id;
}