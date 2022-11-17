import { ASSETS, NODE_TYPE } from './constants';
import { getRootNode, reparent } from './helper';

export const createPools = (
  api,
  env,
  usedPool = {}, // either prefetched or in use
  availablePool = {},
  usedBlocks = {}
) => {
  const rootNode = getRootNode(api);

  // cabNullId as key
  const objectPools = {};

  function addToPool(pool, type, assetId) {
    if (!pool[type]) pool[type] = [];
    pool[type].push(assetId);
    return assetId;
  }
  function getCount(type, ...args) {
    return (
      args.reduce((count, pool) => {
        count += pool[type] ? pool[type].length : 0;
        return count;
      }, 0) + 1
    );
  }

  function updateVisibility(pool, visibility) {
    Object.values(pool).forEach((idArray) => {
      idArray.forEach((id) => {
        api.scene.set(
          { from: rootNode, id, plug: 'Properties', property: 'visible' },
          visibility
        );
      });
    });
  }
  const getObject = async (assetType, nodeType = 'Model') => {
    let assetId;
    if (availablePool[assetType] && availablePool[assetType].length > 0) {
      assetId = availablePool[assetType].pop();
    } else {
      const count = getCount(assetType, usedPool, availablePool);
      // console.log('Count:', count);
      const path = {
        name: `${assetType} ${count}`,
        type: NODE_TYPE[nodeType],
      };
      if (NODE_TYPE[nodeType] === 'Model')
        path.plugs = {
          Null: [{ type: 'Model', asset: { assetId: ASSETS[env][assetType] } }],
          Properties: [
            {
              type: 'ModelProperties',
              visible: nodeType !== 'Model',
            },
          ],
        };
      assetId = await api.scene.addNode(path, rootNode);
    }
    if (nodeType === 'Block') addToPool(usedBlocks, assetType, assetId);
    else addToPool(usedPool, assetType, assetId);
    return assetId;
  };

  const cleanupObject = (id, type) => {
    reparent(api, rootNode, id);
    api.scene.set(
      { from: rootNode, id, plug: 'Properties', property: 'visible' },
      false
    );
    api.scene.set(
      { from: rootNode, id, plug: 'Transform', property: 'translation' },
      { x: 0, y: 0, z: 0 }
    );
    api.scene.set(
      { from: rootNode, id, plug: 'Transform', property: 'rotation' },
      { x: 0, y: 0, z: 0 }
    );
  };

  const createObjectsPool = (nodeId) => {
    const { nodes } = api.store.get('sceneGraph');
    if (!nodes[nodeId]) throw new Error('Cannot reset pool - Invalid nodeId');
    const pool = {};
    const traverseNodes = (node) => {
      const { name, children, id } = node;
      const type = name.split(' ')[0];
      addToPool(pool, type, id);
      children.forEach((child) => traverseNodes(nodes[child]));
    };
    traverseNodes(nodes[nodeId]);
    objectPools[nodeId] = pool;
    return pool;
  };

  const getObjectsPool = (cabId) => objectPools[cabId];
  const removeObjectsPool = (cabId) => {
    updateVisibility(objectPools[cabId], false);
    delete objectPools[cabId];
  };

  const removeObject = (id, type) => {
    cleanupObject(id, type);
    // Update usedPool/usedBlocks
    let obj;
    if (usedPool[type]) {
      const index = usedPool[type].findIndex((item) => id === item);
      if (index !== -1) {
        obj = usedPool[type][index];
        usedPool[type][index] = usedPool[type][usedPool[type].length - 1];
        usedPool[type].pop();
      }
    } else if (usedBlocks[type]) {
      const index = usedBlocks[type].findIndex((item) => id === item);
      if (index !== -1) {
        obj = usedBlocks[type][index];
        usedBlocks[type][index] = usedBlocks[type][usedBlocks[type].length - 1];
        usedBlocks[type].pop();
      }
    }
    if (obj) {
      if (!availablePool[type]) availablePool[type] = [];
      availablePool[type].push(obj);
    }
  };

  const reset = (nodeId) => {
    if (nodeId) {
      // Should reset all nodes that are children of nodeId
      const pool = objectPools[nodeId];
      Object.keys(pool).forEach((type) => {
        pool[type].forEach((id) => {
          cleanupObject(id, type);
          // Update usedPool/usedBlocks
          if (usedPool[type]) {
            const index = usedPool[type].findIndex((item) => id === item);
            if (index !== -1) usedPool[type][index] = null;
          } else if (usedBlocks[type]) {
            const index = usedBlocks[type].findIndex((item) => id === item);
            if (index !== -1) usedBlocks[type][index] = null;
          }
        });
        if (usedBlocks[type])
          usedBlocks[type] = usedBlocks[type].filter((item) => !!item);
        if (usedPool[type])
          usedPool[type] = usedPool[type].filter((item) => !!item);
        if (!availablePool[type]) availablePool[type] = [];
        availablePool[type].push(...pool[type].splice(0, pool[type].length));
      });
    } else {
      for (const pool of [usedPool, usedBlocks])
        Object.keys(pool).forEach((type) => {
          pool[type].forEach((id) => cleanupObject(id, type));

          if (!availablePool[type]) availablePool[type] = [];
          availablePool[type].push(...pool[type].splice(0, pool[type].length));
        });
    }
    // console.log('Used Pool:', usedPool, 'Available Pool:', availablePool);
  };

  const showAndHide = (key = 'items') => {
    updateVisibility(availablePool, false);
    if (key === 'items') {
      Object.values(objectPools).forEach((pool) =>
        updateVisibility(pool, true)
      );
      updateVisibility(usedBlocks, false);
    } else if (key === 'both') {
      Object.values(objectPools).forEach((pool) =>
        updateVisibility(pool, true)
      );
      updateVisibility(usedBlocks, true);
    } else if (key === 'blocks') {
      Object.values(objectPools).forEach((pool) =>
        updateVisibility(pool, false)
      );
      updateVisibility(usedBlocks, true);
    } else {
      // cabId
      const cabPool = objectPools[key];
      if (cabPool) updateVisibility(cabPool, true);
    }
  };

  const displayPools = () => {
    console.log('Used Pool: ', usedPool);
    console.log('Available Pool: ', availablePool);
    console.log('ObjectPools: ', objectPools);
    console.log('Blocks', usedBlocks);
  };
  return {
    getObject,
    reset,
    showAndHide,
    createObjectsPool,
    getObjectsPool,
    removeObjectsPool,
    removeObject,
    displayPools,
  };
};
