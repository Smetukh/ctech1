function deepEqual(object1, object2) {
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    const val1 = object1[key];
    const val2 = object2[key];
    const areObjects = isObject(val1) && isObject(val2);
    if (
      (areObjects && !deepEqual(val1, val2)) ||
      (!areObjects && val1 !== val2)
    ) {
      return false;
    }
  }

  return true;
}

export function updateAssets(oldAssets, assets) {
  Object.keys(oldAssets).forEach((key) => {
    if (
      assets[key] &&
      oldAssets[key].id &&
      assets[key].name === oldAssets[key].name
    ) {
      if (!oldAssets[key].assets) {
        if (deepEqual(assets[key].data, oldAssets[key].data))
          assets[key].modified = false;
        assets[key].id = oldAssets[key].id;
      }
    } else if (oldAssets[key].id) {
      if (oldAssets[key].destroy) oldAssets[key].destroy();
      else window.poolApi.removeObject(oldAssets[key].id, oldAssets[key].name);
    }
  });
  return assets;
}

function isObject(object) {
  return object != null && typeof object === 'object';
}
