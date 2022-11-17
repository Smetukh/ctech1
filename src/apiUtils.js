function getCurrentPlayer(api) {
  return Object.values(
    api.store
      .get('player')
      ._values.get(0)
      .toJS()
  )[0];
}

function getStageId(api) {
  return getCurrentPlayer(api).stageId;
}

const displaySceneGraph = api => (
  queries = [{ plug: 'Transform', property: 'translation' }],
  optionalId
) => {
  api = api || window.api || window.player || window.threekitPlayer;
  api.enableApi('store');

  const { nodes } = api.store.get('sceneGraph');

  const nodeId = optionalId || getStageId(api);

  const node = nodes[nodeId];
  if (!node) return;

  const group = node.children.length > 0;

  let entry = `${node.name} --- ${node.id}`;

  queries.forEach(query => {
    let value;
    let label;
    if (typeof query === 'string') {
      value = node[query];
      label = query;
    } else {
      label = query.property;
      value = api.scene.get({
        id: nodeId,
        ...query,
      });
    }
    entry = `${entry} --- ${label}: ${JSON.stringify(value)}`;
  });

  if (group) console.groupCollapsed(entry);
  else console.log(entry);

  node.children.forEach(childId => {
    // traverse child's hierarchy
    displaySceneGraph(api)(queries, childId);
  });

  if (group) {
    console.groupEnd(entry);
  }
};

export default function initUtils(api) {
  if (api.utils) {
    console.error('api already has utils');
    return;
  }
  api.utils = { displaySceneGraph: displaySceneGraph(api) };
}
