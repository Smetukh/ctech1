const THREEKIT_ENVIRONMENTS = {
  Master: 'Master',
  Dev: 'preview',
  Admin: 'admin-fts',
};

const assetIds = {
  Room: '2e3d3e2f-863e-4259-ac28-3696eb0647f0',
  BaseScene: '2329bf6e-d3d4-4741-ae88-3f564a49c2c9',
  LeftEndRail: '8a2be83c-b011-4fc0-a1c0-eea546f9e784',
  RightEndRail: 'db08f332-25f3-4954-947a-cf1343cc687c',
  SupportedEndRail: '106d5f06-94b5-4abe-af69-cb664a96be60',
  TopRail: 'a56aa4e3-0964-46aa-b9e8-752399b3cc51',
  BottomRail: 'fcf73d0b-f4ab-4ca7-8c58-40ae339445ab',
  EndPanel: '14a74bf9-dd06-4404-a12f-68923a5e97f5',
  EndPanelNoCut: 'f0c581f3-c9c4-4396-9400-1ddee263cc5c',
  TopPanel: '4834e971-cb45-4b47-9260-e313fcba7033',
  BackPanel: 'b108bb60-7830-4459-adfc-9eabb495c2dc',
  Toekick: 'df4ffce5-a490-4855-a748-e06a068556e2',
  CenterRail: '27ecf794-3d7a-4f9d-8b23-bb44dfadf792',
  CenterPanel: 'ebe81de4-f844-4a34-8e99-42e85b93e7d7',
  Drawer: 'c490a821-a087-4f8e-9619-5a8eaa76366a',
  DrawerLock: 'ed545ec9-39e1-42a1-b9be-6ae719a7eefd',
  DrawerRack: 'ee14c14f-0c72-4eb7-a22f-abd674e3750e',
  FillerStrip: 'b1319c66-bf6f-4a7c-86c2-e562770ffd98',
  Door: '4e5c56e9-b5ae-4639-a67e-66591cba9514',
  Shelf: '25c1ff2c-e9e1-47bf-aa97-a11fb419ab95',
  HangerBar: '982c4a3f-eb31-44eb-931c-5349876e2791',
  FillerPanel: 'e0ff709c-3f80-4fd6-8988-c27652f9f2b0',
  GasSpringLeft: '25141766-ce1c-4877-9752-8222a1ad4979',
  GasSpringRight: '683cbbc4-2e45-419c-9b45-34376f4e0ec0',
  RadiusPanel: '424d7d69-443c-484b-8ec9-d211de3aff89',
  RadiusRail: 'baab6d75-6d32-43fc-bf02-bc39cd6bd98e',
  RadiusBaseComb: '6f9ffe36-bbf8-4877-a5dc-b0761bd62599',
  // RadiusBaseComb: '4c8ed15c-1b75-4e59-8979-6255fa264ec7',
  PuckLight: 'f2cccbe2-a1fe-47bb-a5cd-6c54c9316547',
  PuckLight_SpotLight: '67dcacb0-92d7-47fd-9ac4-1fcb121df144',
  PuckLightSwitch: '28755fd5-1b6b-462b-ae0b-0e661a2f6e11',
  GasketLoc: 'b4a6167e-147e-4a94-8d3a-c4b32de13b19',
  ToeKickFootAssy: '91f3b222-d75b-43c8-952d-9ade7346626d',
  BottomMountingBracket: 'c52b3232-dadd-44f6-97f8-0861ad728720',
  Soffit: '6151af6c-5793-4b01-bbb0-88e0aa463ead',
  // Blocks
  Straight: '6e722940-ab95-4a95-ae9d-68c9026c2a57',
  Left: 'c8912f3c-1d7b-498d-9d7f-72c82d8fb99f',
  Right: 'b45abfcf-03dd-4a90-9d95-e6e35a436803',
  // Cart
  RightPost: '6e8e1881-8479-4d17-bff6-5e07f9c56215',
  LeftPost: '02284834-c9e0-45fb-bc76-c7a3a9071e27',
  ZeeRail: 'dd446f18-2d01-4807-bea5-17901c409902',
  invertedTop: '3c568d59-0064-4231-a2fc-827f6999dbd4',
  fixedTop: '1e38c828-7a33-49c9-8edf-e5484b393cc1',
  hingedTop: '908feebb-1f86-4204-ae50-4bf2210dfa78',
  FixedHinge: '20ea4ef8-1841-4a27-ae54-a45d6fc84e48',
  TopHydraulic: 'c1683db2-0740-4d8a-b958-8be4cf2c780c',
  CartCenterRail: '92a15c72-963c-4e96-b46e-73b0f2b5b41c',
  HydraulicMount: 'b175679e-3dfc-4214-af4a-69437cc32878',
  Tahoe: '8b6acdb3-8601-447d-bd75-4c4399d5e154',
  Explorer: '9b6cf5a3-a59c-4a3a-8307-3f8c96d63b50',
  Expedition: 'd0c22d1b-1eb6-4bc5-8696-c5e2269eb8d9',
  Durango: '69ab9f59-87ce-4943-a868-d5cbc3333820',
  ChassisPanel: '2cc2bb6e-3646-43d5-aea6-823bec7c9694',
  CasterBeam: '92853269-2772-45d2-8ee5-b847a5f88f37',
  CasterSwivel: '9cae1fb7-6068-4078-b644-de81ef24d783',
  CasterRigid: 'f7bdff09-b893-4bdc-9d5f-b360726e327e',
  BadassCasterSwivel: 'f76ea7d3-986a-49d0-b1ad-e22f4b517173',
  BadassCasterRigid: 'fc289609-2b37-4485-8344-d8ba047cbd80',
  BadassCasterBrakes: '7dd8fc49-ddd2-4bf9-94e3-3261c70042a5',
  HotRodMount: '6cbbbd56-49a6-42ab-82ba-4fa056227e9a',
  HotRodWheelsSwivel: 'd839a29c-e5a7-4494-a77a-68b19cac740e',
  HotRodWheelBrakes: '1dda8ca8-166a-41b3-977c-ac213322f29a',
  HotRodWheelsRigid: '5e348b57-4654-478d-99b0-df3159fca9e0',
  InvertedTray: '59958af2-09e1-4cf2-b206-c874038d3aa7',
  MiniMount: '27b19e42-39f3-40ba-862b-69325a3705bd',
  MiniWheelsSwivel: '499235dd-0874-4106-9bb4-caca32c4d85a',
  MiniWheelBrakes: '01883b36-ae85-4902-b39a-436525152427',
  MiniWheelsRigid: 'e8d6bfda-74aa-4e71-87f5-17f8f499cd91',
  StandardChassisMount: '00abcc66-6ef7-4a91-bb6a-5c17be072132',
  StandardWheelsSwivel: 'a47faee8-7c3b-44f3-b4ff-a8a4baeda2df',
  StandardWheelBrakes: '6872aaba-84ae-4fa8-a1d9-107cba82b9d9',
  StandardWheelsRigid: 'ee9bf0f8-5ca6-42ac-9931-a7795e7c8f56',
  PushPullHandle: '97c87dc9-304f-447c-ab60-43d5f2efbe95',
  TeeHandle: 'd544556c-6f26-4a22-a5f9-ff85faf057ed',
  HeimJointTeeHandle: 'e36ac412-f6ce-4db9-883b-df4d745eab8f',
  ChassisTriggerLatchDoor: '70c5ba83-178d-4bde-8838-18d4b05fa53f',
  TriggerLatchDoor: '9860f28f-fe5a-4cd1-80f0-285ce98bb03e',
  FoldingHandle: '8badc9cc-881f-4ee7-9c90-cb4b6da1b9ed',
  DropInTray: '0152536e-1fa8-48e1-a177-0db59a18e26b',
  StainlessSteelOverlay: '0db10fc4-8763-4b47-81ec-2b353fcf8f67',
  CartCenterPanel: '7a5130db-f53d-4090-82be-93bc008bbd04',
  InternalBracing: '63847073-1909-454c-99e8-1fb620913013',
  ElectronicsCover: '5cb09997-9ddc-4892-bfac-09b3e270e67b',
  GearGuard408: 'de0d536d-978d-44a4-95e8-cbebb13bccca',
  GearGuard4010: 'c0074d11-8b95-46e1-9ec3-c50be3013257',
  GearGuard4012: '4812547f-0104-4a3e-b47e-5653a1c01ccd',
  GearGuard4014: 'db1f4917-1717-4d4b-8985-3d5502924759',
  GearGuard4016: '84c0a7eb-410e-4181-8572-f28e382f7cd1',
  GearGuard4018: '3c172641-9124-4486-88d7-8958d9946330',
  GearGuard4020: 'af0efcef-2cd6-4585-a76d-d5f5649d9c83',
  GearGuard4022: '42bd89d6-0d34-499c-9b13-e947c047143d',
  GearGuard4024: '189db934-0bce-4bb3-94f8-35239f7fb317',
  GearGuard4724: 'a27cc535-8211-420b-8a55-3b14782bf585',
  GearGuard4722: 'e64f978a-0f90-436f-90a2-d3b7ca45af98',
  GearGuard4720: 'bbbded94-a08b-4623-bc66-36f664aa3cba',
  GearGuard4718: '293e2f61-d31f-48ac-9e11-87fb7ddfa6fc',
  GearGuard4716: '1d8efb84-292b-40eb-b67a-466c66a9e47e',
  GearGuard4714: '500b542c-8da3-4bf6-bfce-640f616871d2',
  GearGuard4712: 'bbde3ff1-5b31-4d2a-b5ab-73415c297d57',
  GearGuard4710: '99bee0a6-f336-4b82-a0c9-624bffac8b41',
  GearGuard478: '763b7c1e-5f35-4773-ada2-851992107d88',
};

const ASSETS = {
  [THREEKIT_ENVIRONMENTS.Dev]: assetIds,
  [THREEKIT_ENVIRONMENTS.Admin]: assetIds,
};

const NODE_TYPE = {
  Model: 'Model',
  Null: 'Null',
  Block: 'Model',
};

const FIRST_OPENING = 1;
const LAST_OPENING = 2;
const MIDDLE_OPENING = 0;
const SINGLE_OPENING = 3;

const END_RAIL_THICKNESS = 0.28;
const END_RAIL_INSERTION = 3.81;
const TOEKICK_Y_OFFSET = 1;
const INCH_TO_CM = 2.54;
const INCH_TO_M = 0.0254;
const CM_TO_M = 0.01;
const ASSET_DIMENSIONS = {
  Toekick: {
    x: 10,
    y: 11.4,
    z: 16,
  },
  EndPanel: {
    x: 3.72,
    y: 16,
    z: 8.84,
  },
  TopPanel: {
    x: 10,
    y: 3.81,
    z: 5,
  },
  BackPanel: {
    x: 10,
    y: 10,
    z: 0.16,
  },
  TopMountingBracket: {
    x: 14.375,
    y: 1,
    z: 2,
  },
  BottomMountingBracket: {
    x: 14.375,
    y: 2.32,
    z: 0,
  },
};

export {
  ASSETS,
  THREEKIT_ENVIRONMENTS,
  NODE_TYPE,
  ASSET_DIMENSIONS,
  INCH_TO_CM,
  INCH_TO_M,
  CM_TO_M,
  END_RAIL_THICKNESS,
  END_RAIL_INSERTION,
  TOEKICK_Y_OFFSET,
  FIRST_OPENING,
  LAST_OPENING,
  MIDDLE_OPENING,
  SINGLE_OPENING,
};
