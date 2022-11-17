import { reparent } from '../helper';
import { INCH_TO_M } from '../constants';
import { MAT_THICKNESS_INCHES } from './constants';
import { updateAssets } from './helper';
import { setItemFinish } from '../materials';
import { Component } from './Component';
import { Body } from './Body';
import { Top } from './Top';
import { GearGuard } from './cart/GearGuard';
import { ElectronicsCover } from './cart/ElectronicsCover';
import { Side } from './cart/Side';
import { Mount } from './cart/Mount';
import { Chassis } from './cart/Chassis';

export class Cart extends Component {
  constructor() {
    super('Cart');
    this.translation = {};
    this.finish = null;
  }

  async init(json) {
    this.id = await window.poolApi.getObject(this.nullName, 'Null');

    this.reset(json);

    return this.id;
  }

  reset(json) {
    const assets = {};

    const {
      width,
      height,
      depth,
      body,
      finish,
      top,
      left,
      right,
      front,
      rear,
      mount,
      chassis,
    } = json;

    const x = 0;
    const y = body.height / 2 + MAT_THICKNESS_INCHES * 1.25;
    const z = 0;

    this.translation = { x: INCH_TO_M * x, y: INCH_TO_M * y, z: INCH_TO_M * z };

    // TODO add more assets to cart, i.e. top, mount, etc...
    assets.body = this.assets.body
      ? this.assets.body.reset(body)
      : new Body(body);
    assets.top = this.assets.top
      ? this.assets.top.reset(top, body)
      : new Top(top, body);
    if (body.options?.gearGuard) {
      assets.gearGuard = this.assets.gearGuard
        ? this.assets.gearGuard.reset(top, body)
        : new GearGuard(top, body);
    }
    assets.left = this.assets.left
      ? this.assets.left.reset(body.left, body, 'left', chassis)
      : new Side(body.left, body, 'left', chassis);
    assets.right = this.assets.right
      ? this.assets.right.reset(body.right, body, 'right', chassis)
      : new Side(body.right, body, 'right', chassis);
    assets.front = this.assets.front
      ? this.assets.front.reset(body.front, body, 'front', chassis)
      : new Side(body.front, body, 'front', chassis);
    assets.rear = this.assets.rear
      ? this.assets.rear.reset(body.rear, body, 'rear', chassis)
      : new Side(body.rear, body, 'rear', chassis);
    if (mount) {
      assets.mount = this.assets.mount
        ? this.assets.mount.reset(mount)
        : new Mount(mount); 
    } else if (chassis) {
      assets.chassis = this.assets.chassis
        ? this.assets.chassis.reset(chassis, body)
        : new Chassis(chassis, body);
    }
    if(body.options?.elecStorage){
      assets.electronicsCover = this.assets.electronicsCover
        ? this.assets.electronicsCover.reset(body)
        : new ElectronicsCover(body);
    }

    // TODO revise material assignment function
    this.finish = finish ? finish.color : 'RED';

    this.assets = updateAssets(this.assets, assets);

    return this;
  }

  update(json) {
    this.reset(json);
    return this.build();
  }

  async build() {
    await this.fetchObjects();
    console.log('Building ', this.nullName, this);
    const partNodes = await Promise.all(
      Object.values(this.assets)
        .filter((asset) => asset.modified !== false)
        .map((asset) => asset.build(asset.id, asset.data))
    );
    reparent(window.api, this.id, ...partNodes);
    // align cart base to floor
    const baseId = (this.assets.mount || this.assets.chassis || {}).id;
    partNodes.forEach((id) => {
      if (id !== baseId)
        window.api.scene.set(
          { id, plug: 'Transform', property: 'translation' },
          this.translation
        );
    });

    window.poolApi.createObjectsPool(this.id);
    setItemFinish(this.id, this.finish);

    console.log('Cart: ', this.id, ' loaded');

    return this.id;
  }
}