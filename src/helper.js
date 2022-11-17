let cachedRoot = null;
const getRootNode = (api) => {
  if (!cachedRoot) cachedRoot = api.scene.findNode({ name: 'Objects' });
  return cachedRoot;
};

const getAssetInstanceId = (api, nodeId) => {
  return api.player.getAssetInstance({
    // from: getRootNode(api),
    id: nodeId,
    plug: 'Null',
    property: 'asset',
  });
};

const getTransformPaths = (api, id) => {
  const properties = ['translation', 'rotation', 'scale', 'shear'];
  const path = api.scene.find({
    id,
    plug: 'Transform',
    property: properties[0],
  });
  path.pop();
  return properties.map((property) => [...path, property]);
};
const reparent = (api, nodeId, ...args) => {
  args.forEach((childId) => {
    const paths = getTransformPaths(api, childId);
    const values = paths.map(api.scene.get);
    // console.log('pre reparent values', JSON.stringify(values));
    api.scene.reparent(nodeId, [childId]);
    // console.log('post reparent values', JSON.stringify(values));
    paths.forEach((path, idx) => api.scene.set(path, values[idx]));
  });
};

const setEquals = (a, b) => {
  if (a.size !== b.size) return false;
  for (let x of a) if (!b.has(x)) return false;
  return true;
};

export { getRootNode, getAssetInstanceId, reparent, setEquals };
