import '@babel/polyfill'; // needed to transpile async/await in babel-transpiled webpack output
import Rollbar from 'rollbar';
import { jsPDF as JSPdf } from 'jspdf';
import {
  ASSETS,
  THREEKIT_ENVIRONMENTS,
  INCH_TO_M,
  MEASUREMENT_CONFIG,
  MEASUREMENT_NAME,
  pdfHeaderBase64,
  INCH_TO_CM,
  CM_TO_M,
} from './constants';
import { createPools } from './objectPool';
import State from './step1/state';
import initUtils from './apiUtils';
import { animation, Player } from './player';
import { initializeRoom } from './step1/configureRoom';
import Block from './step1/block';
import { setStyle } from './step1/highlight';
import { moveTool, layoutSelectionTool, cameraTool, baseSelectionTool, getAction } from './step1/playerTools';
import { setNodeHighlighting } from './step1/highlight';
import { Cabinet } from './Component/Cabinet';
import { Cart } from './Component/Cart';
import { getRootNode } from './helper';
import { FLOOR_CONSTANTS, WALL_CONSTANTS } from './step1/constants';

const rollbar = new Rollbar({
  accessToken: '1aff9a1a86b6413091030dfd0efc5a75',
  captureUncaught: true,
  captureUnhandledRejections: true,
});

// could use env var for these
const threekitEnv = 'preview'; // process.env.THREEKIT_ENV;
const authToken = '450f9c4f-cdb2-4190-9b12-ba87138ced3d'; // process.env.THREEKIT_AUTH_TOKEN;

console.log(
  `Initializing ${threekitEnv} configurator with auth token`,
  authToken
);

function init(el, room = undefined, onReadyCb) {
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
          player.tools.addTool(layoutSelectionTool);
          player.tools.addTool(cameraTool);
        } else {
          player.setActiveCamera(player.scene.findNode({ name: 'Camera' }));
          player.tools.addTool(baseSelectionTool);
        }

        if (onReadyCb) {
          onReadyCb(player);
        }
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
    baseSceneSelection: (cabId, openingPath) => {
      const { THREE } = window.api;
      var openingId;
      if (openingPath.includes('body.right.openings[0].openings')) {
        var openingNumber = openingPath.charAt(openingPath.lastIndexOf(']') - 1);
        openingId = window.state.cart.assets.right.assets.openings.assets.opening0.assets.openings.assets['opening' + openingNumber].id;
      } else if (openingPath.includes('body.right.openings')) {
        openingId = window.state.cart.assets.right.assets.openings.assets.opening0.id;
      } else if (openingPath.includes('chassis')) {
        var side = openingPath.substring(openingPath.indexOf('.') + 1, openingPath.indexOf('.', openingPath.indexOf('.')+1));
        openingId = window.state.cart.assets.chassis.assets[side + 'Opening'].id;
      } else if (openingPath.includes('openings[0].openings')) {
        var openingNumber = openingPath.charAt(openingPath.lastIndexOf(']') - 1);
        openingId = window.state.cabinets[cabId].assets.openings.assets.opening0.assets.openings.assets['opening' + openingNumber].id;
      } else if (openingPath.includes('openings')) {
        openingId = window.state.cabinets[cabId].assets.openings.assets.opening0.id;
      }
      if (openingId === undefined) {
        window.state.clearSelection();
        return;
      }
      const currentPosition = api.camera.getPosition();
      const currentQuaternion = api.camera.getQuaternion();
      if (!window.state.camera) {
        window.state.camera = {
          id: api.player.cameraController.activeCamera,
          position: currentPosition.clone(),
          quaternion: currentQuaternion.clone(),
          targetNode: api.scene.get({
            id: api.player.cameraController.activeCamera,
            plug: 'Camera',
            property: 'targetNode',
          }),
        };
      }

      const R90 = Math.PI / 2;
      if (openingPath.includes('chassis')) {
        var side = openingPath.replace('.','').split('.')[0];
        const rotationY = (side === 'chassisleft' ? 2 : side === 'chassisrear' ? 1 : 0) * R90;
        api.camera.setQuaternion(
          currentQuaternion
            .clone()
            .setFromEuler(new THREE.Euler(0, rotationY, 0, 'XYZ'))
        );
      } else {
        api.camera.setQuaternion(
          currentQuaternion
            .clone()
            .setFromEuler(new THREE.Euler(0, 0, 0, 'XYZ'))
        );
      }

      api.camera.frameBoundingSphere(cabId);
      const targetPosition = api.camera.getPosition();
      const targetQuaternion = api.camera.getQuaternion();
      api.camera.setPosition(currentPosition);
      api.camera.setQuaternion(currentQuaternion);

      const player = new Player('camera', 'default', 500);
      player.addAction(
        getAction(
          currentPosition,
          currentQuaternion,
          targetPosition,
          targetQuaternion
        )
      );
      player.setStepper('move', (p) => ++p);
      animation.linkPlayer('camera', player);
      animation.playAnimation('move', ['camera'], () =>
        animation.removePlayer('camera')
      );

      api.scene.set(
        {
          id: api.player.cameraController.activeCamera,
          plug: 'Camera',
          property: 'targetNode',
        },
        cabId
      );

      window.state.selectItem(null, cabId, openingPath);
      if (openingId) setNodeHighlighting(openingId, true, true);
      else if (cabId) setNodeHighlighting(cabId, true, true);
    },
  setDimensionNodes: () => {
    const { scene } = window.threekit.api;
    const rootNode = getRootNode(window.api);
    let adjacentBlocks = [];
    const cabinetBlocks = window.state.getBlocks();
    
    if (Array.isArray(cabinetBlocks) && cabinetBlocks.length) { // [ROOM]: create array of arrays of separated (not adjacent) cabinet node ids
      adjacentBlocks = cabinetBlocks.reduce((acc, item) => {
        const [leftAdjacentBlock] = item.adjacency.left;
        const [rightAdjacentBlock] = item.adjacency.right;

        // find index of adjacent cabinet
        const accIndex = acc.findIndex(adjacentBlock => {
          return Object.keys(adjacentBlock).includes(leftAdjacentBlock) || Object.keys(adjacentBlock).includes(rightAdjacentBlock)
        })
        // add to adjacent array
        if (accIndex > -1) {
          acc[accIndex] = { ...acc[accIndex], [item.nodeId]: item.cabsId };
          // or add new separate array
        } else acc[acc.length] = { [item.nodeId]: item.cabsId }
        return acc;
      }, []);      
    } else { // [BASE SCENE]: get cabinet node ids
      const cabinets = window.state.getCabinets() ;
      adjacentBlocks = Object.keys(cabinets).map(nodeId => ({ nodeId }))
    }    
    
    // set Dimension nodes on the cabinets. We set dimensions visible later on show dimension click 
    adjacentBlocks.forEach((adjacentArray) => {
      scene.set(
        {
          id: scene.addNode(MEASUREMENT_CONFIG, rootNode),
          plug: 'Measurement',
          property: `targets`
        }, Object.values(adjacentArray)
      )
    })
  },
  showDimensions: (withDimensions) => { // set dimensions visible: true/false
    const { scene } = window.threekit.api;
    const measurementNodes = scene.filterNodes({ name: MEASUREMENT_NAME });
    measurementNodes.forEach((id) => {
      scene.set(
        {
          id,
          plug: 'Properties',
          property: 'visible',
        }, withDimensions
      );
    });
  },
  showWalls: (isVisible) => {
    const { scene } = window.threekit.api;
    // set visible walls
    const hideWallList = [
      ...Object.values(WALL_CONSTANTS.LOCATIONS).reduce((acc, { NODE_WALL_CHILD, CAMERA_NULL }) => [...acc, NODE_WALL_CHILD, CAMERA_NULL], []).flat(), // ['WALL_RIGHT_CHILD', 'RIGHT_Cam_Null', 'FLOOR']
      FLOOR_CONSTANTS.MESH_NAME
    ];        
    hideWallList.forEach(name => {
      const itemData = scene.getAll({ hierarchical: true, name });
      const itemObj = Object.values(itemData)[0];
      scene.set(
        { id: itemObj.id, plug: 'Properties', property: 'visible' },
        isVisible
      );
    });
    // set visible top signs
    const signData = scene.getAll({ hierarchical: true, name: 'Sign' });
    Object.values(signData).forEach(({ id }) => {          
      scene.set(
        { id, plug: 'Properties', property: 'visible' },
        isVisible
      );
    });
  },
  buildPdf: async (json) => {
    const { scene, snapshotAsync, player } = window.threekit.api;
    const doc = new JSPdf({ orientation: 'l' });
    try {
      const updateCameraTranslation = async ({ name, newX, newY, newZ }) => {          
        const cameraData = scene.getAll({ hierarchical: true, name });      
        const { id } = Object.values(cameraData).find(({ type }) => type === "Camera"); 
        if (newX || newY || newZ) { // upate camera translation
          const { x, y, z } = window.api.scene.get({ id, plug: 'Transform', property: 'translation' });
          window.api.scene.set(
            { id, plug: 'Transform',  property: 'translation' },
            {
              x: newX || x,
              y: newY || y,
              z: newZ || z,
            }
          );
          await player.evaluateSceneGraph();
        }
        return id;
      }

      const buildBaseScenePDF = async () => {
        // adjust snapshot for high cabinets
        let dimensionMultiplier = 1;
        if (json.height > 50) dimensionMultiplier = json.height / 50;

        // compute the X,Z camera distance to have the same product height on snapshot
        const zCameraTransform = 5 - json.depth * INCH_TO_CM / 2 * CM_TO_M; // get camera Z distance from cabinet to camera    
        const newX = zCameraTransform + (json.width - json.depth) * INCH_TO_CM / 2 * CM_TO_M; // set camera X distance from cabinet to camera
        const snapshotCameras = [
          { name: 'Camera Front', newZ: 5 * dimensionMultiplier, property: 'zEnabled' },
          { name: 'Camera Right', newX: newX * dimensionMultiplier, property: 'xEnabled' }
        ];
        // add logo bas64 image
        doc.addImage(pdfHeaderBase64, 'png', 10, 0, 270, 45);
        // add 2 images for 1 pdf page
        for (const [i, camera] of snapshotCameras.entries()) {
          const { property, ...cameraData } = camera;
          // hide measurement line
          if (property) scene.set({ type: 'Measurement', hierarchical: true, plug: 'Measurement', property }, false);
          const cameraId = await updateCameraTranslation(cameraData);
          const snapshotB64 = await snapshotAsync({
            size: { width: 600, height: 600 },
            mimeType: "image/png",
            cameraId,
          });
          doc.addImage(snapshotB64, 'PNG', 10 + 150 * i, 80);
          // show measurement line
          if (property) scene.set({ type: 'Measurement', hierarchical: true, plug: 'Measurement', property }, true);
        }
        doc.save('ctech_configuration.pdf');
      };

      const buildRoomPdf = async () => {
        const snapshotCameras = [
          { name: 'Camera_Snapshot_45' },
          { name: 'Camera_Front_Snapshot' },
          { name: 'Camera_Left', newX: 8, newY: 1, newZ: -2 },
        ];
        window.threekit.showWalls(false); // hide walls

        // build pdf pages
        for (const [i, camera] of snapshotCameras.entries()) {
          if (i) doc.addPage();
          doc.addImage(pdfHeaderBase64, 'png', 10, 0, 270, 45);
          const cameraId = await updateCameraTranslation(camera);
          
          const snapshotB64 = await snapshotAsync({
            size: { width: 900, height: 600 },
            mimeType: "image/png",
            cameraId,
          });
          doc.addImage(snapshotB64, 'PNG', 30, 40);
        }
        window.threekit.showWalls(true);
        doc.save('ctech_configuration.pdf');
      };

      const blocks = window.state.getBlocks();
      if (blocks.length) await buildRoomPdf(); // case for room layout
      else await buildBaseScenePDF(); // base scene
    } catch(err) {
      console.log(`pdf build err = `, err);
    }
  }
};

export { threekitEnv };
