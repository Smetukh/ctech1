import {
    HANGERBAR_WIDTH,
    HANGERBAR_HEIGHT_OFFSET,
    MAT_THICKNESS_INCHES,
    RAIL_WIDTH,
    SHELF_OFFSET_DEPTH,
    SHELF_DEPTH_ADJUSTMENT,
    MAT_THICKNESS,
} from './constants';
import {
    INCH_TO_M
} from '../constants';
import { getAssetInstanceId, reparent } from '../helper';
import { updateAssets } from './helper';
import { materialAssigner } from '../materials';
import { Component } from './Component';

export class HangerBars extends Component {
    constructor(contents, frame, options) {
        super('hangerbars');

        this.reset(contents, frame, options);
    }

    reset(contents, frame, options) {
        const assets = {};

        const { data, boundry, shelves } = contents;
        const { width, height } = boundry
        const { left, right } = frame;
        const { frameHeight, shelfYOffset } = options;
        const gasSpring =
            data &&
            data.handle &&
            (data.handle.swing === 'top' || data.handle.swing === 'bottom');
        const leftOffset = left === 'end rail' ? 1.410 : 0.7815;
        const rightOffset = right === 'end rail' ? 1.410 : 0.7815;
        const shelfSpacing = frameHeight > 24 ? 2 : 1;
        const numOfSlots = Math.floor((boundry.height - 7) / shelfSpacing) + 1;
        const numOfShelves = shelves
            ? Math.min(shelves.adjustable, Math.floor(numOfSlots / 2))
            : 0;
        const delta = Math.max(Math.floor(numOfSlots / (numOfShelves + 1)), 2);
        
        const firstSlotY =
            shelfYOffset -
            (numOfSlots % 2 === 0
                ? numOfSlots / 2 - 1
                : (numOfSlots - 1) / 2 - (shelfSpacing === 1 ? 1 : 0.5)) *
                shelfSpacing;

        // Width of Hanger Bar Tube
        let actualWidth = width + leftOffset + rightOffset - 0.25;
        actualWidth -= shelves.adjustable > 0 ? 1.929 : 0;

        // Location
        let x = 0;
        x += left === 'center rail' ? 0.6285 / 2 : 0;
        x -= right === 'center rail' ? 0.6285 / 2 : 0;
        if (left === 'center rail' && right === 'center rail') {
            x = 0;
        }
        
        let y = shelves.adjustable > 0
            ? firstSlotY + (delta * numOfShelves * shelfSpacing) - HANGERBAR_HEIGHT_OFFSET - 1.670 - 1.0625
            : (height / 2) - HANGERBAR_HEIGHT_OFFSET + RAIL_WIDTH - (MAT_THICKNESS_INCHES * 2);

        let centerPnlOffset = shelves.adjustable === 0 && right === 'center rail'
            ? MAT_THICKNESS
            : 0;

        let z = shelves.adjustable > 0
            ? -SHELF_OFFSET_DEPTH + (gasSpring ? 0 : SHELF_DEPTH_ADJUSTMENT / 2)
            : 0;
        
        const hangerBarAsset = {
            name: 'HangerBar',
            type: 'HangerBar',
            data: {
                width: actualWidth,
                x,
                y,
                z,
                centerPnlOffset,
            },
            build: getNodeForHangerBarAsset,
        };
        assets.hangerBar = hangerBarAsset;

        this.assets = updateAssets(this.assets, assets);

        return this;
    }

    async build() {
        await this.fetchObjects();
        const partNodes = await Promise.all(
            Object.values(this.assets)
                .filter((asset) => asset.modified !== false || !this.initialized)
                .map((asset) => asset.build(asset.id, asset.data))
        );

        reparent(window.api, this.id, ...partNodes);
        this.initialized = true;
        return this.id;
    }
}

async function getNodeForHangerBarAsset(id, values) {
    const width = values.width;
    const stretchX = (width - HANGERBAR_WIDTH) / 2 * INCH_TO_M;
    const x = INCH_TO_M * values.x;
    const y = INCH_TO_M * values.y;
    const z = INCH_TO_M * values.z;
    const instanceId = await getAssetInstanceId(window.api, id);
    const applyMaterialToNode = materialAssigner(id);
    // Hanger Bar Tube
    const hangerBarId = window.api.scene.findNode({
        from: instanceId,
        name: 'Hanger_Bar',
    });
    // 0. Translate
    window.api.scene.set(
        { id: hangerBarId, plug: 'Transform', property: 'translation' },
        { x: x, y, z }
    );
    // 1. Stretch
    window.api.scene.set(
        {
            id: hangerBarId,
            plug: 'PolyMesh',
            operatorIndex: 1,
            property: 'stretchDistance',
        },
        stretchX
    );
    applyMaterialToNode(hangerBarId, 'steel');

    // Left Hanger Bar Bracket
    const rightBracketId = window.api.scene.findNode({
        from: instanceId,
        name: 'Right_Hanger_Bar_Bracket',
    });
    // 0. Translate
    window.api.scene.set(
        { id: rightBracketId, plug: 'Transform', property: 'translation' },
        { x: stretchX + x, y: y - values.centerPnlOffset, z }
    );
    applyMaterialToNode(rightBracketId);

    // Right Hanger Bar Bracket
    const leftBracketId = window.api.scene.findNode({
        from: instanceId,
        name: 'Left_Hanger_Bar_Bracket',
    });
    // 0. Translate
    window.api.scene.set(
        { id: leftBracketId, plug: 'Transform', property: 'translation' },
        { x: -stretchX + x, y, z }
    );
    applyMaterialToNode(leftBracketId);

    return id;
}
