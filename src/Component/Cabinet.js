import { Frame } from './Frame';
import { Shell } from './Shell';
import { reparent } from '../helper';
import { INCH_TO_M } from '../constants';
import { Openings } from './Openings';
import { Radius } from './Radius';
import { Soffit } from './Soffit';
import { setItemFinish } from '../materials';
import { TOE_KICK_HEIGHT, RADIUS_THICHNESS } from './constants';
import { updateAssets } from './helper';
import { Component } from './Component';

export class Cabinet extends Component {
  constructor() {
    super('Cabinet');
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
      depth,
      frame,
      shell,
      radius,
      openings,
      finish,
      extensions,
      soffit,
    } = json;

    const x = 0;
    let y = frame.height / 2;
    let z = 0;

    if (shell.toekick) {
      y += TOE_KICK_HEIGHT;
    } else if (radius.bottom) {
      y += RADIUS_THICHNESS;
    }

    // this translation calculation makes sure the
    if (extensions) {
      frame.extensions = extensions;
      z = depth / 2;
    }

    this.translation = { x: INCH_TO_M * x, y: INCH_TO_M * y, z: INCH_TO_M * z };

    assets.frame = this.assets.frame
      ? this.assets.frame.reset(frame)
      : new Frame(frame);
    assets.shell = this.assets.shell
      ? this.assets.shell.reset(shell, frame, openings)
      : new Shell(shell, frame, openings);
    assets.radius = this.assets.radius
      ? this.assets.radius.reset(radius, frame, shell.toekick, soffit)
      : new Radius(radius, frame, shell.toekick, soffit);
    assets.openings = this.assets.openings
      ? this.assets.openings.reset(openings, frame, shell.backPanel)
      : new Openings(openings, frame, shell.backPanel);

    if (soffit && soffit.height > 0) {
      assets.soffit = this.assets.soffit
        ? this.assets.soffit.reset(soffit, frame, radius)
        : new Soffit(soffit, frame, radius);
    }

    this.finish = finish.color;

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
    // align cabinet base to floor
    partNodes.forEach((id) => [
      window.api.scene.set(
        { id, plug: 'Transform', property: 'translation' },
        this.translation
      ),
    ]);

    window.poolApi.createObjectsPool(this.id);
    setItemFinish(this.id, this.finish);

    console.log('Cabnet: ', this.id, ' loaded');

    return this.id;
  }
}
