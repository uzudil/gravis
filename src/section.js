import THREE from 'three';
import * as constants from 'constants';

export class Section {
	constructor(name, block_props, color, fillCorners, randomize) {
		this.name = name;
		this.block_props = block_props;
		this.color = color;
		this.fillCorners = fillCorners;
		this.randomize = randomize;
	}
}

export const SECTIONS = [
	new Section('sea', { h: -5, r: 2, d: 0.05, e: 8, a: 1.5 }, null, true, false),
	new Section('land', { h: 3, r: 0.5, d: 0.5, e: 1, a: 0.7 }, null, true, false),
	new Section('mountain', { h: constants.SECTION_SIZE, r: constants.SECTION_SIZE/5, d: 0.05, e: 8, a: 0.7 }, null, true, true),
	new Section('forest', { h: 3, r: 0.5, d: 0.5, e: 1, a: 0.7 }, null, true, false),
	new Section('beach', { h: 3, r: 0.5, d: 0.5, e: 1, a: 0.7 }, null, true, false),
	new Section('lake', { h: -5, r: 2, d: 0.05, e: 8, a: 1.5 }, null, true, false),
	new Section('river', { h: -5, r: 2, d: 0.05, e: 8, a: 1.5 }, null, true, false),
	new Section('town', { h: 3, r: 0.5, d: 0.5, e: 1, a: 0.7 }, null, true, false),
	new Section('town_center', { h: 3, r: 0.5, d: 0.5, e: 1, a: 0.7 }, null, true, false),
	new Section('dungeon', { h: 3, r: 0.5, d: 0.5, e: 1, a: 0.7 }, null, true, false),
	new Section('road', { h: 3, r: 0.5, d: 0.5, e: 1, a: 0.7 }, new THREE.Color(0.25, 0.15, 0.05), false, false)
];