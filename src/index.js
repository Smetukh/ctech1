import '@babel/polyfill'; // needed to transpile async/await in babel-transpiled webpack output
import Rollbar from 'rollbar';
import {
  ASSETS,
  THREEKIT_ENVIRONMENTS,
  INCH_TO_M,
} from './constants';
import { createPools } from './objectPool';
import State from './step1/state';
import initUtils from './apiUtils';
import { animation } from './player';
import { initializeRoom } from './step1/configureRoom';
import Block from './step1/block';
import { setStyle } from './step1/highlight';
import { moveTool, selectionTool, cameraTool } from './step1/playerTools';
import { Cabinet } from './Component/Cabinet';
import { Cart } from './Component/Cart';

const rollbar = new Rollbar({
  accessToken: '1aff9a1a86b6413091030dfd0efc5a75',
  captureUncaught: true,
  captureUnhandledRejections: true,
});

// could use env var for these
const threekitEnv = 'preview'; // 'admin-fts'; // process.env.THREEKIT_ENV;
const authToken = 'f33f2b85-1960-449e-aa3e-13155547483a'; // process.env.THREEKIT_AUTH_TOKEN;
console.log(
  `Initializing ${threekitEnv} configurator with auth token`,
  authToken
);

function init(el, room = undefined, onReady) {
  const bundle = document.createElement('script');
  bundle.setAttribute(
    'src',
    `https://${threekitEnv}.threekit.com/app/js/threekit-player.js`
  );

  bundle.setAttribute('type', 'text/javascript');
  bundle.onload = () => {
    const assetName = room ? 'Room' : 'BaseScene';
    const assetId = ASSETS[threekitEnv][assetName];

    return window
      .threekitPlayer({
        authToken,
        el,
        assetId,
        initialConfiguration: {},
        showConfigurator: true,
        showAR: true
      })
      .then(async (player) => {
        window.api = player; // full player api exposed for dev purposes
        player.enableApi('player');
        player.enableApi('store');
        player.tools.setTool('orbit', {
          options: { turnTableMobileOnly: false },
        });
        window.threekit.api = player;
        await player.when('preloaded');
        window.poolApi = createPools(player, threekitEnv);
        initUtils(window.api);
        setStyle();
        window.state = new State();
        if (room) {
          const { width, length, height } = room;
          await initializeRoom(width || 250, length || 250, height || 100);
          player.tools.addTool(moveTool);
          player.tools.addTool(selectionTool);
          player.tools.addTool(cameraTool);
        } else {
          player.setActiveCamera(player.scene.findNode({ name: 'Camera' }));
        }

        onReady(player);
        return player;
      });
  };

  document.getElementsByTagName('head')[0].appendChild(bundle)
};

window.threekit = {
  init,
  addBlock: async (blockJS) => {
    const { type, layout, location, dimensions, data, translations } = blockJS;
    const block = new Block(
      type,
      layout,
      location,
      dimensions,
      translations,
      data
    );
    await block.init();
    window.state.addBlock(block);
    block.update();

    window.poolApi.showAndHide('blocks');

    return block;
  },
  removeBlock: (nodeId, notifySelectionChanged = false) => {
    const block = window.state.blocks[nodeId];
    if (window.state.getSelection() === nodeId)
      window.state.clearSelection(notifySelectionChanged);
    if (block) {
      window.state.removeBlock(nodeId);
      window.poolApi.showAndHide('blocks');
    } else throw new Error('Cannot find block');
    return block;
  },
  getBlock: (nodeId) => {
    return window.state.blocks[nodeId];
  },
  getBlocks: () => {
    return window.state.blocks;
  },
  setCart: async (json, cartId) => {
    let { cart } = window.state;
    if (!cart) {
      cart = new Cart();
      const id = await cart.init(json);
      window.state.cart = cart;
    } else {
      cart.reset(json);
    }
    await cart.build();
    window.poolApi.showAndHide();
    return cart;
  },
  setConfiguration: async (json, cabId) => {
    if (json.body) {
      console.log('Configuring cart data', json);
      return threekit.setCart(json);
    }
    console.log('Configuring cabinet data:', json);

    let cabinet =
      window.state.cabinets[cabId] || Object.values(window.state.cabinets)[0];
    if (cabinet) {
      cabinet.reset(json);
    } else {
      cabinet = new Cabinet();
      const id = await cabinet.init(json);
      window.state.cabinets[id] = cabinet;
    }
    await cabinet.build();

    animation.resetPlayers();

    window.poolApi.showAndHide(cabinet.id);

    // window.api.camera.frameBoundingSphere(cabinet.id);
    return cabinet.id;
  },
  moveObject: (id, { x, y, z }) => {
    // Values in inches
    window.api.scene.set(
      { id, plug: 'Transform', property: 'translation' },
      {
        x: x * INCH_TO_M,
        y: y * INCH_TO_M,
        z: z * INCH_TO_M,
      }
    );
  },
  openDoors: (cabId) => {
    const pool = window.poolApi.getObjectsPool(cabId);
    if (pool) {
      const playerIds = ['Door', 'GasSpringLeft', 'GasSpringRight'].reduce(
        (acc, asset) => {
          if (pool[asset]) {
            acc = acc.concat(pool[asset].map((id) => id));
          }
          return acc;
        },
        []
      );
      animation.playAnimation('open', playerIds);
      window.state.cabinets[cabId].doors = 'open';
    } else animation.playAnimation('open');
  },
  closeDoors: (cabId) => {
    const pool = window.poolApi.getObjectsPool(cabId);
    if (pool) {
      const playerIds = ['Door', 'GasSpringLeft', 'GasSpringRight'].reduce(
        (acc, asset) => {
          if (pool[asset]) {
            acc = acc.concat(pool[asset].map((id) => id));
          }
          return acc;
        },
        []
      );
      animation.playAnimation('close', playerIds);
      window.state.cabinets[cabId].doors = 'close';
    } else animation.playAnimation('close');
  },
    lightsOn: (cabId) => {
        const pool = window.poolApi.getObjectsPool(cabId);
        if (pool) {
            const playerIds = ['PuckLight_SpotLight'].reduce(
                (acc, asset) => {
                    if (pool[asset]) {
                        acc = acc.concat(pool[asset].map((id) => id));
                    }
                    return acc;
                },
                []
            );
            playerIds.forEach(p => {
                window.api.scene.set(
                    { id: p, plug: 'Properties', property: 'visible' },
                    true
                );
            }
            );
        } else{
          const cabinetIds = Object.keys(window.state.getCabinets());
          cabinetIds.forEach(c => {
            const objPool = window.poolApi.getObjectsPool(c);
            const playerIds = ['PuckLight_SpotLight'].reduce(
              (acc, asset) => {
                if (objPool[asset]){
                  acc = acc.concat(objPool[asset].map((id) => id));
                }
                return acc;
              },
              []
            );
            playerIds.forEach(p => {
              window.api.scene.set(
                { id: p, plug: 'Properties', property: 'visible' },
                true
              )
            }
            );
          });
        }
    },
    lightsOff: (cabId) => {
        const pool = window.poolApi.getObjectsPool(cabId);
        if (pool) {
            const playerIds = ['PuckLight_SpotLight'].reduce(
                (acc, asset) => {
                    if (pool[asset]) {
                        acc = acc.concat(pool[asset].map((id) => id));
                    }
                    return acc;
                },
                []
            );
            playerIds.forEach(p => {
                window.api.scene.set(
                    { id: p, plug: 'Properties', property: 'visible' },
                    false
                );
            }
            );
        } else{
          const cabinetIds = Object.keys(window.state.getCabinets());
          cabinetIds.forEach(c => {
            const objPool = window.poolApi.getObjectsPool(c);
            const playerIds = ['PuckLight_SpotLight'].reduce(
              (acc, asset) => {
                if (objPool[asset]){
                  acc = acc.concat(objPool[asset].map((id) => id));
                }
                return acc;
              },
              []
            );
            playerIds.forEach(p => {
              window.api.scene.set(
                { id: p, plug: 'Properties', property: 'visible' },
                false
              )
            }
            );
          });
        }
    },
};

export { threekitEnv };
