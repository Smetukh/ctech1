import { BLOCKS, createSampleBlockBtns } from './blocks';

let withDimensions = false;
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
  const exportStepButton = document.getElementById('exportStep');
  const pdfButton = document.getElementById('get-pdf');

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
  async function handleSubmit() {
    try {
      const obj = JSON.parse(textArea.value);
      await textInputHandler(obj);
      window.threekit.setDimensionNodes();
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
      ).then(() => {
        window.state.changeStage(2);
        window.threekit.setDimensionNodes();
      })    
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
      createBlockInstanceCard(blockSelector, blockObj);
    };
  });

  goBackButton.onclick = () => {
    const newStage = (stage + 2) % 3;
    stageChangeHanlder(newStage);
  };

  goForwardButton.onclick = () => {
    const newStage = (stage + 1) % 3;
    stageChangeHanlder(newStage);
  };

  dimensionsButton.onclick = () => {
    withDimensions = !withDimensions;
    // set dimensions visible: true/false
    window.threekit.showDimensions(withDimensions);
  };

  exportStepButton.onclick = () => {
    // saveConfiguration() causes sceneGraphState to the uploaded to our files-service. There's no other public API on the frontend to handle this at the moment
    window.threekit.showWalls(false);
    window.threekit.api.saveConfiguration().res
      .then(({variant, sceneGraphState}) => fetch('https://preview.threekit.com/api/asset-jobs/2e3d3e2f-863e-4259-ac28-3696eb0647f0/export/stp?bearer_token=02c37e1c-8365-415e-a676-c2b79eb9a00b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync: true,
          settings: { "arExport": true },
          assetId: "2e3d3e2f-863e-4259-ac28-3696eb0647f0",
          orgId: "0f33898b-1ed8-4ae9-ae3f-2699f6380d0e",
          configuration: variant,
          sceneGraphState
        })
      }))
      .then(res => res.json())
      .then(res => {
        const fileId = res.job.runs[0].results.files[0].id;
        console.log(`qqq fileId [null] = `, fileId);
        
        
        const href = `https://preview.threekit.com/api/files/${fileId}/content`;
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        a.href = href;
        a.click();
      })
    window.threekit.showWalls(true);
  };


  pdfButton.onclick = async () => {
    const { showDimensions, buildPdf } = window.threekit;
    if (!withDimensions) showDimensions(true);
    console.log(`qqq textArea.value [null] = `, textArea.value);
    
    const productJson = textArea.value ? JSON.parse(textArea.value) : {}
    console.log(`qqq productJson [null] = `, productJson);
    
    
    
    await buildPdf(productJson); // pass cabinet json data
    if (!withDimensions) showDimensions(false);
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
