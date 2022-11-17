import { getRootNode } from './helper';

const FINISH_MAPPING = {
  AY: 'ec1f7aa9-fbdb-4e15-8a56-d8445ed84cb5',
  BS: 'a81f5879-43d8-4489-9f38-5af0c2cc397e',
  GY: 'e463c137-bc30-414f-987e-f069d3ff3f46',
  RED: '553a73e5-38f2-4dba-bd80-521c93fa3f53',
  TB: '6654dc63-23d4-44fd-a604-ee556d110f7f',
  LG: 'be68f42f-5b22-4a95-93d5-7565b01e552d',
  MB: 'd487e2a7-5c05-448e-9fe7-51e40cdc1648',
  OR: '94f18d35-69ea-4e00-9d59-5ac1de04e2df',
  GB: '06bf7d0f-d2a7-43fd-bd7a-dd2a165eadc2',
  WH: '5041f86b-02d2-477b-b6a7-a7fc86ace38f',
  SV: 'b4a10efc-585f-4629-ac49-6a49ba629e23',
  CATY: 'ec1f7aa9-fbdb-4e15-8a56-d8445ed84cb5',
};

const MATERIAL_MAPPING = {
  ...FINISH_MAPPING,
  // laminate: 'ee9207fb-6e20-46c1-b02f-50af7379db68',
  laminate: 'b9357059-c114-450e-93ad-3630ea640c55',

  steel: '3ff368c1-f085-42a5-8b1c-6ca5c4bcb2f7',
  plastic: '50e033f3-0609-4337-ad4a-66b1452e6a55',
  // Phase 3:
  BlackPlastic: 'fee9631a-e705-4332-a727-9a3ccbc2ad9a',
  BlackSteel: '37a134c3-4aaa-4f0e-b3a4-5798efe48636',
  GraySteel: '2bdb3704-97f1-4580-8e36-b650e8dfba2c',
  RimMetal: '98600f8f-85e5-48a0-bb74-2ba1f3340636',
  WhitePlastic: '4aed2b6f-f360-4074-8833-38f968421246',
  DRingMetal: 'a6d7abd1-b22d-4e4c-af16-c10688c8c2e3',
  // SandedTopMetal: '798990c8-ea6b-457b-bd47-33125e17b762', // replaced by BrushedSteel
  HandlePlastic: '06912d01-e1a0-4689-a4f7-84561324a4e9',
  StainlessOverlay: '15fa3299-b6eb-4c24-8f61-11c20e7e6cc2',
  Wheel: '1189d364-e97b-4860-89c7-0ede53c66a62',
  BrushedSteel: '2327a0df-0372-4fcb-9301-c7e4b39a3fe3',
};

const FINISH = {};

const parts = {};

const materials = {};

function materialAssigner(id) {
  return (instanceId, name) => {
    const isFinish = !name;
    // Finish color can be changed, keep track of instances
    // and assign later by setItemFinish()
    if (isFinish) {
      if (!parts[id]) parts[id] = new Set();
      if (!parts[id].has(instanceId)) parts[id].add(instanceId);
      return;
    }
    if (parts[id] && parts[id].has(instanceId)) {
      parts[id].delete(instanceId);
    }

    if (!MATERIAL_MAPPING[name]) {
      console.error('Invalid material name');
    } else {
      findMaterial(name).then((matId) => {
        const resp = window.api.scene.set(
          { id: instanceId, plug: 'Material', property: 'reference' },
          matId
        )        
        return resp
      }
      );
      // console.error('Material not initialized');
    }
  };
}

function setItemFinish(cabId, name) {
  const cabPool = window.poolApi.getObjectsPool(cabId);
  if (cabPool && MATERIAL_MAPPING[name]) {
    const instances = Object.values(cabPool).reduce((acc, value) => {
      value.forEach((id) => {
        if (parts[id]) acc = acc.concat(Array.from(parts[id]));
      });
      return acc;
    }, []);
    findMaterial(name).then((matId) =>
      instances.forEach((instanceId) => {
        window.api.scene.set(
          { id: instanceId, plug: 'Material', property: 'reference' },
          matId
        );
      })
    );
    // console.error('Material not initialized');
    FINISH[cabId] = name;
  }
}

async function findMaterial(name) {
  if (materials[name]) return materials[name];
  let meshId;
  // Block materials are `opacity_color`, and others
  // named with '_'
  if (MATERIAL_MAPPING[name]) {
    const nodeName = `_${name}`;
    meshId = await window.api.scene.findNode({
      name: nodeName,
    });
    if (!meshId) {
      const path = {
        name: nodeName,
        type: 'Model',
        plugs: {
          PolyMesh: [{ type: 'Box' }],
          Properties: [
            {
              type: 'ModelProperties',
              visible: false,
            },
          ],
          Transform: [
            {
              type: 'Transform',
              translation: { x: 0, y: -100, z: 0 },
              scale: { x: 0.001, y: 0.001, z: 0.001 },
            },
          ],
          Material: [
            {
              type: 'Reference',
              reference: { assetId: MATERIAL_MAPPING[name] },
            },
          ],
        },
      };
      const rootNode = await getRootNode(window.api); // fixing bug of applying material
      console.log(`rootNode [path] = `, rootNode);
      
      meshId = await window.api.scene.addNode(path, getRootNode(window.api));
    }
  } else {
    meshId = window.api.scene.findNode({
      name,
    });
  }

  const matInstanceId = await window.api.player.getAssetInstance({
    // from: getRootNode(window.api),
    id: meshId,
    plug: 'Material',
    property: 'reference',
  });

  materials[name] = matInstanceId;
  return materials[name];
}

export { materialAssigner, setItemFinish, findMaterial };
