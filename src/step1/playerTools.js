import { animation, Player } from '../player';
import { setNodeHighlighting } from './highlight';

const getAction = (
  currectPosition,
  currectQuaternion,
  targetPosition,
  targetQuaternion
) => {
  const positionDelta = targetPosition.add(currectPosition.clone().negate());
  return (progress, frames) => {
    api.camera.setPosition(
      currectPosition.add(positionDelta.clone().multiplyScalar(1 / frames))
    );
    api.camera.setQuaternion(
      currectQuaternion.clone().slerp(targetQuaternion, progress / frames)
    );
  };
};

const selectionTool = {
  key: 'ctech',
  label: 'Select',
  active: true,
  enabled: true,
  handlers: {
    click: (ev) => {
      // we hit nothing in the scene, let's clear the selction and notify listeners
      if (ev.hitNodes && ev.hitNodes.length === 0) {
        window.state.clearSelection(true);
        return;
      }

      if (!ev.hitNodes || !ev.hitNodes.length) return;

      const hit = ev.hitNodes[0]; // for now always just check first hit - do we care about clicking objects behind the first hit?

      let hitBlock;
      let hitCab;
      let opening;
      const openingPath = hit.hierarchy.reduce((acc, { nodeId, name }) => {
        if (window.state.blocks[nodeId]) {
          hitBlock = nodeId;
        } else if (window.state.cabinets[nodeId]) {
          hitCab = nodeId;
        } else if (/openings/.test(name)) {
          if (acc) acc = acc.concat('.');
          acc = acc.concat('openings');
        } else if (/opening\d+/.test(name)) {
          const number = Number.parseInt(
            name.split(' ')[0].replace('opening', '')
          );
          acc = acc.concat(`[${number}]`);
          opening = nodeId;
        }
        return acc;
      }, '');
      const { THREE } = window.api;

      // the mouse clicked something, but it is not a selectable showroom item
      // (could be floor plane, etc)
      if (!hitBlock) {
        // we hit a non-selectable item, let's clear the selection and notify listeners
        window.state.clearSelection(true);
        if (
          window.state.camera &&
          window.state.camera.id === api.player.cameraController.activeCamera
        ) {
          api.scene.set(
            {
              id: api.player.cameraController.activeCamera,
              plug: 'Camera',
              property: 'targetNode',
            },
            window.state.camera.targetNode
          );

          const player = new Player('camera', 'default', 500);
          player.addAction(
            getAction(
              api.camera.getPosition(),
              api.camera.getQuaternion(),
              window.state.camera.position.clone(),
              window.state.camera.quaternion.clone()
            )
          );
          player.setStepper('move', (p) => ++p);
          animation.linkPlayer('camera', player);
          animation.playAnimation('move', ['camera'], () =>
            animation.removePlayer('camera')
          );

          delete window.state.camera;
        }
        return;
      }
      if (hitCab) {
        const currectPosition = api.camera.getPosition();
        const currectQuaternion = api.camera.getQuaternion();
        if (!window.state.camera) {
          window.state.camera = {
            id: api.player.cameraController.activeCamera,
            position: currectPosition.clone(),
            quaternion: currectQuaternion.clone(),
            targetNode: api.scene.get({
              id: api.player.cameraController.activeCamera,
              plug: 'Camera',
              property: 'targetNode',
            }),
          };
        }

        // get facing of cabinet, rotate when necessary
        const R90 = Math.PI / 2;
        const { side } = state.cabinets[hitCab];
        const i = ['FRONT', 'RIGHT', 'BACK', 'LEFT'].findIndex(
          (e) => e === state.lookAt
        );
        const rotationY =
          (side === 'Left' ? 1 : side === 'Right' ? -1 : 0) * R90 - i * R90;
        api.camera.setQuaternion(
          currectQuaternion
            .clone()
            .setFromEuler(new THREE.Euler(0, rotationY, 0, 'XYZ'))
        );
        api.camera.frameBoundingSphere(hitCab);
        const targetPosition = api.camera.getPosition();
        const targetQuaternion = api.camera.getQuaternion();
        api.camera.setPosition(currectPosition);
        api.camera.setQuaternion(currectQuaternion);

        const player = new Player('camera', 'default', 500);
        player.addAction(
          getAction(
            currectPosition,
            currectQuaternion,
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
          hitCab
        );
      }

      window.state.selectItem(hitBlock, hitCab, openingPath);
      if (opening) setNodeHighlighting(opening, true, true);
      else if (hitCab) setNodeHighlighting(hitCab, true, true);
    },
  },
};
const moveTool = {
  active: true,
  enabled: true,
  key: 'dragging',
  handlers: {
    drag: (ev) => {
      if (!moveTool.enabled) return false;
      // window.state.clearSelection();

      if (!ev.hitNodes || !ev.hitNodes.length) return false;

      const hit = ev.hitNodes[0]; // for now always just check first hit - do we care about clicking objects behind the first hit?
      const hitItem = hit.hierarchy.find(
        ({ nodeId }) => window.state.blocks[nodeId]
      );
      const hitCab = hit.hierarchy.find(
        ({ nodeId }) => window.state.cabinets[nodeId]
      );

      // the mouse clicked something, but it is not a block
      if (!hitItem) return false;

      window.state.selectItem(hitItem.nodeId, hitCab && hitCab.nodeId);
      const { THREE } = window.api;
      const block = window.state.getBlock(hitItem.nodeId);
      const wall = window.state.getWall(block.location);
      const rayIntersection = new THREE.Vector3();
      const wallPlane = wall.getPlane();
      const intersect = ev.eventRay.ray.intersectPlane(
        wallPlane,
        rayIntersection
      );
      if (!intersect) return false;
      block.startedMoving();
      const axis = wall.getAxis();
      const initialAxisPosition = intersect[axis];
      const initialBlockPosition = block.getPosition();
      const element = ev.originalEvent.srcElement;
      return {
        handle(event) {
          const currentElement = event.originalEvent.srcElement;
          if (element != currentElement) return;
          const targetWorldPos = event.eventRay.ray.intersectPlane(
            wallPlane,
            rayIntersection
          );
          if (targetWorldPos) {
            const deltaPos = targetWorldPos[axis] - initialAxisPosition;
            block.move(initialBlockPosition + deltaPos);
          }
        },
        onEnd: () => {
          block.finishedMoving();
        },
      };
    },
  },
};
const cameraTool = {
  active: true,
  enabled: true,
  key: 'map',
  handlers: {
    drag: (ev) => {
      if (!cameraTool.enabled || ev.which !== 3) return false;

      const wall = window.state.getWall(window.state.lookAt);
      const { cameraNull } = wall;
      const alterXZ = !/FRONT|BACK/.test(window.state.lookAt);
      const sign = /FRONT|RIGHT/.test(window.state.lookAt) ? 1 : -1;

      const { THREE } = window.api;

      // Get camera's direction to adjust movements
      const vector = new THREE.Vector3(0, 0, -1);
      vector.applyQuaternion(window.api.camera.getQuaternion());
      const sinA = vector.x;
      const cosA = vector.z;

      return {
        handle(event) {
          const camNullPosi = window.api.scene.get({
            id: cameraNull,
            plug: 'Transform',
            property: 'translation',
          });
          const curCamPosi = window.api.camera.getPosition().clone();
          const { deltaX, deltaY } = event;

          const x = deltaX * cosA + deltaY * sinA;
          const z = deltaY * cosA - deltaX * sinA;
          window.api.camera.setPosition(
            curCamPosi.add(new THREE.Vector3(x / 200, 0, z / 200))
          );
          window.api.scene.set(
            {
              id: cameraNull,
              plug: 'Transform',
              property: 'translation',
            },
            {
              ...camNullPosi,
              x: camNullPosi.x + (sign * (alterXZ ? z : x)) / 200,
            }
          );
          return false;
        },
      };
    },
  },
};

export { moveTool, selectionTool, cameraTool };
