import { SELECTION_COLOR } from './constants';

const setStyle = () =>
  window.api.selectionSet.setStyle({
    outlineColor: SELECTION_COLOR,
  });

const setNodeHighlighting = async (
  nodeId,
  highlight,
  highlightChildren = false
) => {
  const node = window.api.player.sceneGraph.nodes[nodeId];
  const { type, children } = node;
  if (node) {
    if (type === 'PolyMesh') {
      if (highlight) window.api.selectionSet.add(nodeId);
      else window.api.selectionSet.remove(nodeId);
    } else if (type === 'Model') {
      let instanceId;

      const assetQuery = {
        id: nodeId,
        plug: 'Null',
        property: 'asset',
      };
      const asset = window.api.scene.get(assetQuery);
      if (typeof asset === 'string') instanceId = asset;
      else {
        instanceId = await window.api.player.getAssetInstance({
          id: nodeId,
          plug: 'Null',
          property: 'asset',
        });
      }
      await setNodeHighlighting(instanceId, highlight, true);
    } else if (type === 'Item') {
      const instanceId = await window.api.player.getAssetInstance({
        id: nodeId,
        plug: 'Proxy',
        property: 'asset',
      });
      await setNodeHighlighting(instanceId, highlight, true);
    }
  }
  if (highlightChildren)
    return Promise.all(
      children.map(async (id) => setNodeHighlighting(id, highlight, true))
    );
};

export { setStyle, setNodeHighlighting };
