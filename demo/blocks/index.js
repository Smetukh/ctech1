import { blockHI as cornerWall } from './blockHI';
import { blockJK as cornerBase } from './blockJK';
import { blockLM as cornerCloset } from './blockLM';
import { blockNO as joinedWall } from './blockNO';
import { blockPQ as joinedBase } from './blockPQ';
// No sample, use base for now
const joinedCloset = joinedBase;
const BLOCKS = {
  cornerWall,
  cornerBase,
  cornerCloset,
  joinedWall,
  joinedBase,
  joinedCloset,
};

const TYPES = ['Overhead', 'Base', 'Closet', 'Wall'];
const LAYOUTS = ['Straight', 'Left', 'Right'];

const createSampleBlockBtns = (el) => {
  const options = TYPES.reduce((acc, type) => {
    return acc.concat(LAYOUTS.map((layout) => `${type} ${layout}`));
  }, []);
  const buttons = options.map((style) => {
    const btn = document.createElement('button');
    btn.classList.add('button');
    btn.innerHTML = style;
    el.appendChild(btn);
    return btn;
  });
  return buttons;
};
export { BLOCKS, createSampleBlockBtns };
