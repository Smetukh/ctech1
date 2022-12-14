export const blockJK = [
  {
    width: 96,
    height: 40,
    depth: 24,
    finish: { color: 'RED', customColor: null, shelves: false },
    options: { shelfLiner: false },
    frame: {
      width: 72,
      height: 34.25,
      depth: 24,
      finish: { color: 'Clear Anodized', openingColor: 'Clear Anodized' },
      bottomRail: false,
      gasketLoc: 'laminate',
    },
    shell: {
      backPanel: true,
      topPanel: false,
      bottomPanel: false,
      toekick: { adjustableFeet: false, venting: false },
      internalBracing: { left: false, right: false },
    },
    extensions: {
      left: null,
      right: { type: 'adjoined', width: 24 },
    },
    soffit: { height: 0, left: false, right: false, front: false },
    radius: {
      left: false,
      right: false,
      top: false,
      bottom: false,
      lighting: {
        switches: 'none',
        wiring: 'left',
        lights: 0,
        voltage: null,
        lightType: 'none',
      },
    },
    openings: [
      {
        frame: {
          left: 'end rail',
          right: 'end rail',
          top: 'gasketLoc',
          bottom: 'toekick',
          finish: { color: 'Clear Anodized' },
        },
        width: 69,
        height: 32.25,
        depth: 24,
        openings: [
          {
            frame: {
              left: 'end rail',
              right: 'center rail',
              top: 'gasketLoc',
              bottom: 'toekick',
              finish: { color: 'Clear Anodized' },
            },
            width: 33.75,
            height: 32.25,
            depth: 24,
            contents: {
              type: 'door',
              data: {
                width: 33.5,
                height: 32,
                finish: { color: 'RED' },
                handle: {
                  type: 'MotionLatch',
                  swing: 'left',
                  locking: false,
                  finish: { color: 'Clear Anodized' },
                },
                support: 'none',
                steel: false,
                venting: {
                  top: { height: 0, offset: 0 },
                  bottom: { height: 0, offset: 0 },
                },
              },
              shelves: {
                adjustable: 1,
                slideOut: 0,
                hangerBar: 0,
                liner: false,
              },
            },
          },
          {
            frame: {
              left: 'center rail',
              right: 'end rail',
              top: 'gasketLoc',
              bottom: 'toekick',
              finish: { color: 'Clear Anodized' },
            },
            width: 33.75,
            height: 32.25,
            depth: 24,
            contents: {
              type: 'door',
              data: {
                width: 33.5,
                height: 32,
                finish: { color: 'RED' },
                handle: {
                  type: 'MotionLatch',
                  swing: 'right',
                  locking: false,
                  finish: { color: 'Clear Anodized' },
                },
                support: 'none',
                steel: false,
                venting: {
                  top: { height: 0, offset: 0 },
                  bottom: { height: 0, offset: 0 },
                },
              },
              shelves: {
                adjustable: 1,
                slideOut: 0,
                hangerBar: 0,
                liner: false,
              },
            },
          },
        ],
      },
    ],
  },
  {
    width: 72,
    height: 40,
    depth: 24,
    finish: { color: 'RED', customColor: null, shelves: false },
    options: { shelfLiner: false },
    frame: {
      width: 48,
      height: 34.25,
      depth: 24,
      finish: { color: 'Clear Anodized', openingColor: 'Clear Anodized' },
      bottomRail: false,
      gasketLoc: 'laminate',
    },
    shell: {
      backPanel: true,
      topPanel: false,
      bottomPanel: false,
      toekick: { adjustableFeet: false, venting: false },
      internalBracing: { left: false, right: false },
    },
    extensions: {
      left: { type: 'extended', width: 24 },
      right: null,
    },
    soffit: { height: 0, left: false, right: false, front: false },
    radius: {
      left: false,
      right: false,
      top: false,
      bottom: false,
      lighting: {
        switches: 'none',
        wiring: 'left',
        lights: 0,
        voltage: null,
        lightType: 'none',
      },
    },
    openings: [
      {
        frame: {
          left: 'end rail',
          right: 'end rail',
          top: 'gasketLoc',
          bottom: 'toekick',
          finish: { color: 'Clear Anodized' },
        },
        width: 45,
        height: 32.25,
        depth: 24,
        openings: [
          {
            frame: {
              left: 'end rail',
              right: 'center rail',
              top: 'gasketLoc',
              bottom: 'toekick',
              finish: { color: 'Clear Anodized' },
            },
            width: 21.75,
            height: 32.25,
            depth: 24,
            contents: {
              type: 'door',
              data: {
                width: 21.5,
                height: 32,
                finish: { color: 'RED' },
                handle: {
                  type: 'MotionLatch',
                  swing: 'left',
                  locking: false,
                  finish: { color: 'Clear Anodized' },
                },
                support: 'none',
                steel: false,
                venting: {
                  top: { height: 0, offset: 0 },
                  bottom: { height: 0, offset: 0 },
                },
              },
              shelves: {
                adjustable: 1,
                slideOut: 0,
                hangerBar: 0,
                liner: false,
              },
            },
          },
          {
            frame: {
              left: 'center rail',
              right: 'end rail',
              top: 'gasketLoc',
              bottom: 'toekick',
              finish: { color: 'Clear Anodized' },
            },
            width: 21.75,
            height: 32.25,
            depth: 24,
            contents: {
              type: 'door',
              data: {
                width: 21.5,
                height: 32,
                finish: { color: 'RED' },
                handle: {
                  type: 'MotionLatch',
                  swing: 'right',
                  locking: false,
                  finish: { color: 'Clear Anodized' },
                },
                support: 'none',
                steel: false,
                venting: {
                  top: { height: 0, offset: 0 },
                  bottom: { height: 0, offset: 0 },
                },
              },
              shelves: {
                adjustable: 1,
                slideOut: 0,
                hangerBar: 0,
                liner: false,
              },
            },
          },
        ],
      },
    ],
  },
];
