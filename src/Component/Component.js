export class Component {
  constructor(name) {
    this.nullName = name;
    this.id = null;
    this.assets = {};
  }

  async fetchObjects() {
    if (!this.id)
      this.id = await window.poolApi.getObject(this.nullName, 'Null');
    return Promise.all(
      Object.values(this.assets).map(async (asset) => {
        if (asset.fetchObjects) return asset.fetchObjects();
        if (!asset.id) asset.id = await window.poolApi.getObject(asset.name);
        return asset.id;
      })
    );
  }

  destroy() {
    Object.keys(this.assets).forEach((key) => {
      if (this.assets[key].destroy) this.assets[key].destroy();
      else
        window.poolApi.removeObject(this.assets[key].id, this.assets[key].name);
    });
    window.poolApi.removeObject(this.id, this.nullName);
  }
}
