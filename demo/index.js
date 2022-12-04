import { BLOCKS, createSampleBlockBtns } from './blocks';
const MEASUREMENT_NAME = 'Box Dimensions';
const data = {
  category: null,
  isOpen: false,
  showDimensions: false,
}
const rulerSettings = {
  active: true,
  color: {r: 0, g: 0, b: 0},
  decimals: 0,
  endEndcapShape: 3,
  endcapRatio: 4,
  fontCSSSpecifier: "Frutiger LT Std",
  fontSize: 3,
  fontType: 3,
  includeChildren: true,
  labelHorizontal: 1,
  labelRotation: 0,
  labelVertical: 0,
  labelWorldRelative: false,
  lineStyle: 0,
  lineThickness: 0.17,
  space: "local",
  startEndcapShape: 3,
  unit: "in",
  xEnabled: true,
  xLabel: "$L in",
  xOffset: {x: 0, y: 0.1, z: 0.1},
  xPositioning: "top",
  yEnabled: true,
  yLabel: "$L in",
  yOffset: {x: 0.1, y: 0, z: 0.1},
  yPositioning: "left",
  zEnabled: true,
  zLabel: "$L in",
  zOffset: {x: 0.1, y: 0.1, z: 0},
  zPositioning: "top",
}




const ADD_BLOCK_STAGE = 0;
const SELECT_BLOCK_STAGE = 1;
const SELECT_CABINET_STAGE = 2;

const stageUIHandlers = {
  [ADD_BLOCK_STAGE]: [],
  [SELECT_BLOCK_STAGE]: [],
  [SELECT_CABINET_STAGE]: [],
};

const initTestPage = () => {
  let stage = ADD_BLOCK_STAGE;
  let wall;
  let selectedBlock;
  let selectedCab;
  let cabIndex;
  let xValue = 0;
  let yValue = 0;
  let zValue = 0;
  let blocksCounter = 0;

  // - Elements
  const headerMessage = document.getElementById('header-message');
  const step1Container = document.getElementById('step1-containder');
  const inputAreaContainer = document.getElementById('input-area');

  const blockOptionBtns = createSampleBlockBtns(
    document.getElementById('block-options')
  );

  const blocksContainer = document.getElementById('blocks-container');
  const wallsContainer = document.getElementById('wall-options-container');
  const blockSelector = document.getElementById('block-selector');
  const cabinetSelector = document.getElementById('cabinet-selector');

  const goBackButton = document.getElementById('go-back');
  const goForwardButton = document.getElementById('go-forward');
  const dimensionsButton = document.getElementById('dimensions');

  // Input related
  const [cab1Btn, cab2Btn, cabsBtn] = [
    'btn-cabinet-1',
    'btn-cabinet-2',
    'btn-cabinets',
  ].map((id) => document.getElementById(id));

  ['Front', 'Right', 'Back', 'Left'].reduce((containder, position) => {
    const label = document.createElement('label');
    label.classList.add('column', 'column-25');
    const input = document.createElement('input');
    label.appendChild(input);
    input.setAttribute('type', 'radio');
    input.setAttribute('name', 'wall');
    label.append(position);
    input.onclick = (ev) => {
      wall = position.toUpperCase();
      window.state.room[wall] && window.state.room[wall].frame();
    };
    if (!wall) {
      const span = document.createElement('span');
      span.innerHTML = 'Wall:';
      wallsContainer.appendChild(span);
      wallsContainer.appendChild(containder);
      input.click();
    }

    containder.appendChild(label);
    return containder;
  }, document.createElement('div'));

  const textArea = document.getElementById('textInput');
  const textSubmit = document.getElementById('render');
  
  const fileInputElem = document.getElementById('productJSON');
  const doorSwitch = document.getElementById('doorswitch');
  const dropbox = document.getElementById('dataSource');

  const overlay = document.getElementById('overlay');
  // position updates
  const xInput = document.getElementById('xInput');
  const xRange = document.getElementById('xRange');
  const yInput = document.getElementById('yInput');
  const yRange = document.getElementById('yRange');
  const zInput = document.getElementById('zInput');
  const zRange = document.getElementById('zRange');

  // - Handlers
  // Common UI handlers
  const disablePositionInput = () => {
    xInput.setAttribute('disabled', true);
    yInput.setAttribute('disabled', true);
    zInput.setAttribute('disabled', true);
    xRange.setAttribute('disabled', true);
    yRange.setAttribute('disabled', true);
    zRange.setAttribute('disabled', true);
  };
  const enablePositionInput = () => {
    xInput.removeAttribute('disabled');
    yInput.removeAttribute('disabled');
    zInput.removeAttribute('disabled');
    xRange.removeAttribute('disabled');
    yRange.removeAttribute('disabled');
    zRange.removeAttribute('disabled');
  };
  const updatePosition = () => {
    window.threekit.moveObject(selectedCab, {
      x: xValue,
      y: yValue,
      z: zValue,
    });
  };
  const updatePositionInputs = (translation = {}) => {
    let { x, y, z } = translation;
    if (!x) x = 0;
    xInput.value = x;
    xRange.value = x;
    xValue = x;
    if (!y) y = 0;
    yInput.value = y;
    yRange.value = y;
    yValue = y;
    if (!z) z = 0;
    zInput.value = z;
    zRange.value = z;
    zValue = z;
  };

  const textInputHandler = async (obj) => {
    disablePositionInput();
    doorSwitch.setAttribute('disabled', true);
    doorSwitch.checked = false;
    if (Array.isArray(obj)) {
      const block = window.state.blocks[selectedBlock];
      await block.setCabinets(obj);
    } else if (stage === SELECT_CABINET_STAGE) {
      const blocks = window.threekit.getBlocks();
      await window.threekit.setConfiguration(
        obj,
        blocks[selectedBlock].items[cabIndex]
      );
    } else {
      selectedCab = await window.threekit.setConfiguration(obj);
    }
    doorSwitch.removeAttribute('disabled');
    updatePosition(); // set cabinet position to match inputs
    enablePositionInput();
  };

  function readFile(file) {
    const reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    reader.onload = (data) => {
      try {
        const text = data.target.result;
        const obj = JSON.parse(text);
        textArea.value = text;
        textSubmit.removeAttribute('disabled');
        // textInputHandler(obj);
        return obj;
      } catch (error) {
        return null;
      }
    };
  }
  function handleFile() {
    const file = this.files[0];
    readFile(file);
  }
  function handleSubmit() {
    try {
      const obj = JSON.parse(textArea.value);
      textInputHandler(obj);
    } catch (error) {
      console.error(error);
    }
  }

  const stageChangeHanlder = (newStage) => {
    // UI
    stage = newStage;
    stageUIHandlers[stage].forEach((func) => {
      func();
    });
    if (stage === ADD_BLOCK_STAGE) {
      headerMessage.innerHTML =
        'Blocks configurator - Select a block to start...';
      inputAreaContainer.classList.remove('hide');
      blocksContainer.classList.remove('hide');
      cabinetSelector.classList.add('hide');

      goBackButton.setAttribute('disabled', true);
      goForwardButton.removeAttribute('disabled');
      step1Container.classList.remove('hide');

      selectedCab = null;

      window.state.changeStage(1);
    } else if (stage === SELECT_BLOCK_STAGE) {
      headerMessage.innerHTML =
        'Blocks configurator - Edit an existing block...';
      inputAreaContainer.classList.add('hide');
      blocksContainer.classList.remove('hide');
      cabinetSelector.classList.add('hide');

      selectedCab = null;

      goBackButton.removeAttribute('disabled');
      goForwardButton.setAttribute('disabled', true);
      step1Container.classList.add('hide');

      // For all blocks created replace with sample cab
      const { blocks } = window.state;
      Promise.all(
        Object.values(blocks).map((block) => {
          let obj = block.data;
          if (!obj) {
            const layout = block.layout === 'Straight' ? 'joined' : 'corner';
            const type = block.type === 'Overhead' ? 'Wall' : block.type;
            obj = BLOCKS[`${layout}${type}`];
          }

          return block.setCabinets(obj);
        })
      ).then(() => window.state.changeStage(2));
    } else if (stage === SELECT_CABINET_STAGE) {
      const block = window.threekit.getBlock(selectedBlock);
      headerMessage.innerHTML = `Blocks configurator - Edit cabinets of ${block.nodeId}`;
      inputAreaContainer.classList.remove('hide');
      blocksContainer.classList.add('hide');
      cabinetSelector.classList.remove('hide');

      goBackButton.removeAttribute('disabled');
      goForwardButton.setAttribute('disabled', true);
      cabsBtn.click();
    }
  };

  cabsBtn.onclick = async () => {
    const block = window.threekit.getBlock(selectedBlock);
    cabIndex = undefined;
    cabsBtn.classList.add('active');
    cab1Btn.classList.remove('active');
    cab2Btn.classList.remove('active');
    doorSwitch.parentNode.classList.add('hide');
    selectedCab = null;
    if (!block.data) {
      const layout = block.layout === 'Straight' ? 'joined' : 'corner';
      const type = block.type === 'Overhead' ? 'Wall' : block.type;
      const obj = BLOCKS[`${layout}${type}`];
      block.data = obj;
      await textInputHandler(block.data);
    }
    const { data } = block;
    textArea.value = JSON.stringify(data);
    textSubmit.removeAttribute('disabled');
  };
  cab1Btn.onclick = () => {
    const block = window.threekit.getBlock(selectedBlock);
    cabIndex = 0;
    cab1Btn.classList.add('active');
    cabsBtn.classList.remove('active');
    cab2Btn.classList.remove('active');
    doorSwitch.parentNode.classList.remove('hide');
    selectedCab = block.items[cabIndex];
    doorSwitch.checked = window.state.cabinets[selectedCab].doors === 'open';
    if (!block.data) {
      block.data = BLOCKS[block.type];
    }
    const { data } = block;
    textArea.value = JSON.stringify(data[cabIndex]);
    textSubmit.removeAttribute('disabled');
  };
  cab2Btn.onclick = () => {
    const block = window.threekit.getBlock(selectedBlock);
    cabIndex = 1;
    cab2Btn.classList.add('active');
    cabsBtn.classList.remove('active');
    cab1Btn.classList.remove('active');
    doorSwitch.parentNode.classList.remove('hide');
    selectedCab = block.items[cabIndex];
    doorSwitch.checked = window.state.cabinets[selectedCab].doors === 'open';
    if (!block.data) {
      block.data = BLOCKS[block.type];
    }
    const { data } = block;
    textArea.value = JSON.stringify(data[cabIndex]);
    textSubmit.removeAttribute('disabled');
  };

  const createBlockInstanceCard = (el, block) => {
    const { nodeId, type, layout } = block;
    const div = document.createElement('div');
    div.classList.add('block-card');
    el.appendChild(div);
    const h3 = document.createElement('h3');
    const label = `${type + layout}${++blocksCounter}`;
    h3.innerHTML = label;
    div.appendChild(h3);
    const edit = document.createElement('a');
    const remove = document.createElement('a');
    edit.classList.add('card-option');
    remove.classList.add('card-option');
    edit.innerHTML = 'Edit';
    remove.innerHTML = 'Remove';
    div.appendChild(edit);
    div.appendChild(remove);

    stageUIHandlers[ADD_BLOCK_STAGE].push(() => {
      edit.classList.add('hide');
      remove.classList.remove('hide');
    });
    stageUIHandlers[SELECT_BLOCK_STAGE].push(() => {
      remove.classList.add('hide');
      edit.classList.remove('hide');
    });
    if (stage === ADD_BLOCK_STAGE) {
      edit.classList.add('hide');
      remove.classList.remove('hide');
    } else {
      remove.classList.add('hide');
      edit.classList.remove('hide');
    }

    edit.onclick = () => {
      selectedBlock = nodeId;
      stageChangeHanlder(SELECT_CABINET_STAGE);
    };
    remove.onclick = () => {
      if (confirm('Do you want to remove this block?')) {
        el.removeChild(div);
        threekit.removeBlock(nodeId);
      }
    };
  };

  // - Register handlers
  // Stage/Phase related
  blockOptionBtns.forEach((block) => {
    block.onclick = async () => {
      const [type, layout] = block.innerHTML.split(' ');
      // TODO Determine size
      const height = type === 'Closet' ? 70 : type === 'Wall' ? 25 : 37.75;

      const data =
        BLOCKS[
          `${layout === 'Straight' ? 'joined' : 'corner'}${
            type === 'Overhead' ? 'Wall' : type
          }`
        ];
      const blockObj = await window.threekit.addBlock({
        type,
        layout,
        location: wall,
        dimensions: {
          width: 50,
          length: 50,
          height,
          mainThickness: 10,
          legThickness: 10,
        },
        // data,
      });
      console.log(`qqq blockObj [${block}] = `, blockObj);
      console.log(`qqq blockSelector [${block}] = `, blockSelector);
      
      
      
      createBlockInstanceCard(blockSelector, blockObj);
    };
  });

  goBackButton.onclick = () => {
    const newStage = (stage + 2) % 3;
    stageChangeHanlder(newStage);
  };

  async function getRootId () {
    const { api } = window.threekit;
    let rootSceneId;
  
    const instanceNode = api.scene.get({ id: api.instanceId });
  
    if (instanceNode.type === 'Item') {
      rootSceneId = await api.player.getAssetInstance({
        id: api.instanceId,
        plug: 'Proxy',
        property: 'asset',
      });
    } else rootSceneId = api.instanceId; // it is a direct scene asset
    return api.scene.findNode({ from: rootSceneId, type: 'Objects' });
  };
  function addBoxDimensions(targets, parentId) {
    console.log(`qqq targets [addBoxDimensions] = `, targets);
    console.log(`qqq parentId [addBoxDimensions] = `, parentId);
    
    
    
    const { scene } = window.threekit.api;
  
    const t = targets.map((id) => {
      const child = window.threekit.api.scene.get({
        from: id,
        tags: ['Measurement'],
        hierarchical: true,
      });
      if (child) {
        return child.id;
      }
      return id;
    });
  
    const id = scene.addNode(
      {
        type: 'Measurement',
        name: MEASUREMENT_NAME,
        plugs: {
          Measurement: [
            {
              type: 'BoundingBox',
              targets: t,
              ...rulerSettings,
            },
          ],
          Properties: [
            {
              type: 'Default',
              visible: true, // data.showDimensions,
            },
          ],
        },
      },
      parentId
    );
  
    // scene.set({id, plug: 'Properties', property: 'visible'}, data.showDimensions);
    return id;
  }
  async function addBoxDimensionsToRoot(targets) {
    const parentId = await getRootId();
    return addBoxDimensions(targets, parentId);
  }
  function traverseAttachedItems(itemId) {
    const itemSet = new Set();
    const traversalQueue = [itemId];
    while (traversalQueue.length) {
      const id = traversalQueue.shift();
      if (!itemSet.has(id)) {
        itemSet.add(id);
        // const itemAttachments = getAttachmentsForItem(id).map((attachmentId) => {
        //   const attachment = getAttachment(attachmentId);
        //   if (attachment.itemA.itemId === id) {
        //     return attachment.itemB.itemId;
        //   }
        //   return attachment.itemA.itemId;
        // });
        // traversalQueue.push(...itemAttachments);
      }
    }
    return [...itemSet.values()];
  }
  function getAllItemGroups() {
    const children = getMeasurableTargets();
    console.log(`qqq children [getAllItemGroups] = `, children);
    
    
    const set = new Set(children);
    console.log(`qqq set [getAllItemGroups] = `, set);
    
    
    const groups = [];
    while (set.size > 0) {
      const id = set.values().next().value;
      set.delete(id);
      const attachedItems = traverseAttachedItems(id);
      groups.push(attachedItems);
      attachedItems.forEach((attachedItemId) => set.delete(attachedItemId));
    }
    groups.sort((a, b) => b.length - a.length);
    return groups;
  }

  function updateMainSet() {
    const { scene } = window.threekit.api;
    const dimensionIds = scene.filterNodes({ name: MEASUREMENT_NAME });
    console.log(`qqq dimensionIds [updateMainSet] = `, dimensionIds);
    
    
    dimensionIds.forEach((id) => {
      scene.deleteNode(id);
    });
    const sortedGroups = getAllItemGroups();
    console.log(`qqq sortedGroups [updateMainSet] = `, sortedGroups);
    
    
    sortedGroups.map((group) => {
      return addBoxDimensionsToRoot(group);
    });
    // if (data.category === 'Bed') {
      // updateMeasureTargets();
    // }
  }


  goForwardButton.onclick = () => {
    const newStage = (stage + 1) % 3;
    stageChangeHanlder(newStage);
  };

  

  
  function nodeIsChildOf(node, parentId) {
    const { player } = window.threekit.api;
  
    if (!node || !node.parent) {
      return false;
    }
  
    if (node.parent === parentId) {
      return true;
    }
  
    return nodeIsChildOf(player.sceneGraph.nodes[node.parent], parentId);
  }

  function filterChilren(predicate, parent) {
    console.log(`qqq parent [null] = `, parent);
  
    const { player } = window.threekit.api;
    console.log(
      `qqq player.sceneGraph.nodes [null] = `,
      player.sceneGraph.nodes
    );
    return Object.values(player.sceneGraph.nodes)
      .filter((node) => nodeIsChildOf(node, parent))
      .filter(predicate)
      .filter(node => node.name === 'EndPanel_inch_Top')
      .map((node) => {
        console.log(`qqq node [filterChilren] = `, node);
        
        
        return node.id
      });
  }

  function getMeasurableTargets() {
    const { player } = window.threekit.api;
    console.log(
      `qqq player.sceneGraph.evaluatedNodes [null] = `,
      player.sceneGraph.evaluatedNodes
    );
  
    const models = Object.values(player.sceneGraph.evaluatedNodes)
      .map((en) => en.node)
      .filter((node) => node.type === 'Model' && node.name.includes('EndPanel 1'));
    console.log(`qqq models [null] = `, models);
  
    const rawMeshes = models
      .map((node) => {
        console.log(`qqq node [meshes] = `, node);
        
        
        return filterChilren((node) => node.type === 'PolyMesh', node.id)}) 
    console.log(`qqq rawMeshes [null] = `, rawMeshes);
    
    
    const meshes = rawMeshes.flat();
    console.log(`qqq meshes [null] = `, meshes);
  
      return meshes;
  
  
  }

  async function updateMeasureTargets() {
    const { scene } = window.threekit.api;
    // const meshes = getMeasurableTargets()
    // console.log(`qqq meshes [updateMeasureTargets] = `, meshes);
    // const meshes1 = [meshes[1]]
    // console.log(`qqq  [null] = `, );
    
    // const ids = window.threekit.api.selectionSet.ids
    
    // console.log(`qqq ids [null] = `, ids);
    
    

    
    //   scene.set(
    //     { name: MEASUREMENT_NAME, plug: 'Measurement', property: 'targets' },
    //     meshes
    //     // [meshes[0]]
    //     // meshes1
    //   );

    const parentId = await getRootId();
    const id = scene.addNode(
      {
        type: 'Measurement',
        name: MEASUREMENT_NAME,
        plugs: {
          Measurement: [
            {
              type: 'BoundingBox',
              // targets: t,
              // ...rulerSettings,
            },
          ],
          Properties: [
            {
              type: 'Default',
              visible: true, // data.showDimensions,
            },
          ],
        },
      },
      parentId
    );

    const targets = scene.filterNodes({ type: 'PolyMesh'} );
    console.log(`qqq targets [updateMeasureTargets] = `, targets);
    
    // scene.set({ id, plug: 'Measurement', property: 'targets' }, targets)

    const blocks = window.state.getBlocks()

    console.log(`qqq blocks [null] = `, blocks);

    const blockNodeIds = blocks.map(i => i.nodeId);
    console.log(`qqq blockNodeIds [null] = `, blockNodeIds);
    
    const adjacentBlocks = blocks.reduce((acc, item, i, arr) => {
      const isAdjacent = item.adjacency.left.size > 0 || item.adjacency.right.size > 0

      // if (isAdjacent) {
        const [leftAdjacentBlock] = item.adjacency.left;
        const [rightAdjacentBlock] = item.adjacency.right;

        console.log(`qqq leftAdjacentBlock [null] = `, leftAdjacentBlock);
        console.log(`qqq rightAdjacentBlock [null] = `, rightAdjacentBlock);
        
        
        
        const accIndex = acc.findIndex(adjacentBlock => {
          return adjacentBlock.includes(leftAdjacentBlock) || adjacentBlock.includes(rightAdjacentBlock)
        })
        console.log(`qqq accIndex [null] = `, accIndex);
        
        
        console.log(`qqq accIndex [null] = `, accIndex);
        // const currentAccumulatorIndex = accIndex > -1 ? accIndex : acc.length;
        if (accIndex > -1) {
          acc[accIndex] = [...acc[accIndex], item.nodeId];
        } else acc[acc.length] = [item.nodeId]
        console.log(`qqq NEW acc [${i}] = `, acc);
        
        
        
      // }



      return acc;
    }, [])
    console.log(`qqq adjacentBlocks [null] = `, adjacentBlocks);
    
    
    // scene.set({ id, plug: 'Measurement', property: 'targets' }, blockNodeIds)

    adjacentBlocks.forEach((adjacentArray, i) => {

      scene.set({ id: scene.addNode(
        {
          type: 'Measurement',
          name: MEASUREMENT_NAME,
          plugs: {
            Measurement: [
              {
                type: 'BoundingBox',
                // targets: t,
                ...rulerSettings,
              },
            ],
            Properties: [
              {
                type: 'Default',
                visible: true, // data.showDimensions,
              },
            ],
          },
        },
        parentId
      ), plug: 'Measurement', property: `targets` }, adjacentArray)
    })
    
  }

  dimensionsButton.onclick = async () => {
    const { scene } = window.threekit.api;
    console.log(`qqq dimensionsButton[null] = `);
    // await updateMainSet();

    await updateMeasureTargets();
    const measurementNodes = scene.filterNodes({ name: MEASUREMENT_NAME });
  console.log(`qqq measurementNodes [null] = `, measurementNodes);
    console.log(`qqq measurementNodes[0] [null] = `, measurementNodes[0]);
    
    
  // measurementNodes.forEach((id, index) => {
  //   scene.set(
  //     {
  //       id,
  //       plug: 'Properties',
  //       property: 'visible',
  //     },
  //     index === 1 // TODO: add toggle
  //       ? false
  //       : true
  //   );
  // });



//   const { scene } = window.threekit.api;
//   const parentId1 = await api.scene.findNode();
//   console.log(`qqq parentId1 [null] = `, parentId1);
  
  
//   const parentId = await getRootId();
//   console.log(`qqq parentId [null] = `, parentId);
  
  
//   const measureId = await scene.addNode({
//       type: 'Measurement',
//       name: 'Box Dimensions',
//       plug: {
//           Measurement: [{
//               type: 'BoundingBox'
//           }]
//       }
//   }, parentId);
  
// console.log(`qqq measureId [null] = `, measureId);

// const allPolymesh = await api.scene.getAll({ type: "PolyMesh" });
// console.log(`qqq allPolymesh [null] = `, allPolymesh);

// const removedIds = Object.keys(allPolymesh).reduce((sum, item) => {
//   return allPolymesh[item].name === 'FLOOR' || allPolymesh[item].name === 'ground world position ' ? [...sum, allPolymesh[item].id] : sum
// }, [])
// console.log(`qqq removedIds [null] = `, removedIds);


// const targets = await api.scene.filterNodes({ type: "PolyMesh" }); // .filter(id=> !removedIds.includes(id))

//     console.log(`qqq targets [null] = `, targets);
    
// await api.scene.set({name: MEASUREMENT_NAME, plug: 'Measurement', property: 'targets'}, targets);
    
    
























    // const blocks1 = window.threekit.getBlocks();
    // console.log(`qqq blocks1 [null] = `, blocks1);
    // const blockTargets = Object.keys(blocks1)
    
    // function addBoxDimensions(targets, parentId) {
    //   const {scene} = window.threekit.api;
    //   console.log(`qqq scene [addBoxDimensions] = `, scene);
    //   console.log(`qqq targets [addBoxDimensions] = `, targets);
      
      
    //   const t = targets.map((id) => {
    //     const child = window.threekit.api.scene.get({
    //       from: id,
    //       tags: ['Measurement'],
    //       hierarchical: true,
    //     });
    //     if (child) {
    //       console.log(`qqq child [null] = `, child);
          
          
    //       return child.id;
    //     }
    //     return id;
    //   });
    //   console.log(`qqq t [null] = `, t);
      
      
    //   const id = scene.addNode({
    //     type: 'Measurement',
    //     name: MEASUREMENT_NAME,
    //     plugs: {
    //       Measurement: [{
    //         type: 'BoundingBox',
    //         targets: t,
    //         ...rulerSettings,
    //       }],
    //       Properties: [{
    //         type: 'Default',
    //         visible: data.showDimensions,
    //       }],
    //     },
    //   }, parentId);
    //   // scene.set({id, plug: 'Properties', property: 'visible'}, data.showDimensions);
    //   console.log(`qqq id [addBoxDimensions] = `, id);
      
      
    //   return id;
    // }
    
    // // async function addBoxDimensionsToRoot(targets) {
    //   const parentId = await getRootId();
    //   const dimensionsId = addBoxDimensions(blockTargets, parentId);
    //   // return addBoxDimensions(targets, parentId);
    // // }
    // console.log(`qqq dimensionsId [null] = `, dimensionsId);
    
    
    // console.log(`qqq parentId [null] = `, parentId);











    // const resultPromise = await Promise.all(
    //   [
    //     ['Block', 'Null'],
    //     ['Cabinets', 'Null'],
    //     ['Straight', 'Block'],
    //   ].map((args) => window.poolApi.getObject(...args))
    // );
    //   console.log(`qqq resultPromise [Promise] = `, resultPromise);
      
      
    // console.log(`qqq thisblockId [null] = `, thisblockId);
    // console.log(`qqq thiscabsId [null] = `, thiscabsId);
    // console.log(`qqq thisnodeId [null] = `, thisnodeId);
    
    
    
    // [thisnodeId, thiscabsId, thisblockId]
    // const instanceId = await getAssetInstanceId(window.api, thisblockId);
    //   console.log(`qqq this.instanceId [init111] = `, instanceId);
      
    
    
    // export {
    //   addBoxDimensionsToRoot,
    //   addBoxDimensions,
    // }
    
  };

  fileInputElem.addEventListener('change', handleFile, false);
  fileInputElem.removeAttribute('disabled');
  textSubmit.addEventListener('click', handleSubmit, false);
  textArea.addEventListener('input', () => {
    try {
      const text = textArea.value;
      JSON.parse(text);
      textSubmit.removeAttribute('disabled');
    } catch (error) {
      textSubmit.setAttribute('disabled', true);
    }
  });

  function dragenter(e) {
    e.stopPropagation();
    e.preventDefault();
    overlay.style.display = 'block';
  }
  function dragover(e) {
    e.stopPropagation();
    e.preventDefault();
  }
  function dragleave(e) {
    e.stopPropagation();
    e.preventDefault();
    overlay.style.display = 'none';
  }
  function drop(e) {
    e.stopPropagation();
    e.preventDefault();
    overlay.style.display = 'none';

    const dt = e.dataTransfer;
    const file = dt.files[0];

    readFile(file);
  }
  dropbox.addEventListener('dragenter', dragenter, false);
  dropbox.addEventListener('dragover', dragover, false);
  dropbox.addEventListener('drop', drop, false);
  overlay.addEventListener('dragleave', dragleave, false);

  const xListner = (ev) => {
    const value = Number.parseFloat(ev.target.value);
    xValue = value;
    if (ev.type === 'input') xInput.value = value;
    else xRange.value = value;
    updatePosition();
  };
  const yListner = (ev) => {
    const value = Number.parseFloat(ev.target.value);
    yValue = value;
    if (ev.type === 'input') yInput.value = value;
    else yRange.value = value;

    updatePosition();
  };
  const zListner = (ev) => {
    const value = Number.parseFloat(ev.target.value);
    zValue = value;
    if (ev.type === 'input') zInput.value = value;
    else zRange.value = value;

    updatePosition();
  };
  xRange.oninput = xListner;
  yRange.oninput = yListner;
  zRange.oninput = zListner;
  xInput.onblur = xListner;
  yInput.onblur = yListner;
  zInput.onblur = zListner;

  const switchHandler = (e) => {
    if (e.target.checked) {
      window.threekit.openDoors(selectedCab);
    } else {
      window.threekit.closeDoors(selectedCab);
    }
  };
  doorSwitch.onchange = switchHandler;

  disablePositionInput();
  stageChangeHanlder(ADD_BLOCK_STAGE);
  window.state.listeners.push((id) => {
    if (window.state.blocks[id]) {
      const block = window.state.blocks[id];
      if (window.state.cabinets[window.state.selectedCabId]) {
        const index = block.items.findIndex(
          (i) => i === window.state.selectedCabId
        );
        if (index !== -1) cabIndex = index;
        selectedBlock = block.nodeId;
        stageChangeHanlder(SELECT_CABINET_STAGE);
      }
    }
  });
};

window.initTestPage = initTestPage;
