import THREE from 'three';
import * as constants from 'constants';
import * as util from 'util';
import * as sectionDef from 'section';

/**
 * All displayed region data in memory.
 */
export class View {
	constructor() {
		this.z = [];

		// init height map
		for(let x = 0; x < 3 * constants.VERTEX_SIZE; x++) {
			let a = [];
			this.z.push(a);
			for (let y = 0; y < 3 * constants.VERTEX_SIZE; y++) {
				a.push({z: 0, type: 0});
			}
		}
	}

	display(region, rx, ry) {
		// create height map
		for (let x = 0; x < constants.REGION_SIZE; x++) {
			for (let y = 0; y < constants.REGION_SIZE; y++) {
				this.makeSection(rx, ry, x, y, region.region[x][y]);
			}
		}
	}

	finish(setZ) {
		// draw edges
		for(let x = 0; x < 3 * constants.VERTEX_SIZE; x+=constants.SECTION_SIZE) {
			for(let y = 0; y < 3 * constants.VERTEX_SIZE; y+=constants.SECTION_SIZE) {
				let n = this.z[x][y - constants.SECTION_SIZE];
				let s = this.z[x][y + constants.SECTION_SIZE];
				let w = x > constants.SECTION_SIZE ? this.z[x - constants.SECTION_SIZE][y] : null;
				let e = x < 3 * constants.VERTEX_SIZE - constants.SECTION_SIZE ? this.z[x + constants.SECTION_SIZE][y] : null;
				let dx = -1;
				let dy = -1;
				let type = null;
				if(this.isSame(n, e)) {
					dx = constants.SECTION_SIZE / 2; dy = 0; type = e.type;
				}
				if(this.isSame(s, e)) {
					dx = constants.SECTION_SIZE / 2; dy = constants.SECTION_SIZE / 2; type = e.type;
				}
				if(this.isSame(n, w)) {
					dx = 0; dy = 0; type = w.type;
				}
				if(this.isSame(s, w)) {
					dx = 0; dy = constants.SECTION_SIZE / 2; type = w.type;
				}

				if(type) this.makeSubSection(x, y, type, dx, dy);
			}
		}

		// apply erosion
		for(let i = 0; i < 8; i++) {
			this.erode();
		}

		// move mesh points as in height map
		for(let x = 0; x < 3 * constants.VERTEX_SIZE; x++) {
			for (let y = 0; y < 3 * constants.VERTEX_SIZE; y++) {
				setZ(x, y, this.z[x][y] || {z: 0, type: 0});
			}
		}
	}

	isSame(a, b) {
		return a && b && a.type == b.type && sectionDef.SECTIONS[a.type].fillCorners;
	}

	makeSection(rx, ry, x, y, sectionType) {
		for(let xx = 0; xx < constants.SECTION_SIZE; xx++) {
			for(let yy = 0; yy < constants.SECTION_SIZE; yy++) {
				let point = this.z[rx * constants.VERTEX_SIZE + x * constants.SECTION_SIZE + xx][ry * constants.VERTEX_SIZE + y * constants.SECTION_SIZE + yy];
				point.z = this.calcZ(sectionType);
				point.type = sectionType;
			}
		}
	}

	makeSubSection(x, y, sectionType, dx, dy) {
		for(let xx = 0; xx < constants.SECTION_SIZE/2; xx++) {
			for(let yy = 0; yy < constants.SECTION_SIZE/2; yy++) {
				let point = this.z[x + xx + dx][y + yy + dy];
				point.z = this.calcZ(sectionType);
				//point.type = sectionType;
			}
		}
	}

	calcZ(sectionType) {
		let p = sectionDef.SECTIONS[sectionType].block_props;
		return Math.random() * p.r - p.r * p.d + p.h;
	}

	erode() {
		for(let x = 1; x < 3 * constants.VERTEX_SIZE - 1; x++) {
			for (let y = 1; y < 3 * constants.VERTEX_SIZE - 1; y++) {
				this.erodeAt(x, y);
			}
		}
	}

	erodeAt(x, y) {
		if(x < 1 || y < 1 ||
			x >= 3 * constants.VERTEX_SIZE - 1 ||
			y >= 3 * constants.VERTEX_SIZE - 1) return;

		let a = [];
		for(let dx = -1; dx <= 1; dx++) {
			for(let dy= -1; dy <= 1; dy++) {
				a.push(this.z[x + dx][y + dy].z);
			}
		}
		let h = a.reduce((p, v) => p + v, 0) / a.length;
		let r = h/(constants.SECTION_SIZE * 0.5);
		this.z[x][y].z = h + Math.random() * r - r/2;
	}

	//update(delta) {
	//	//console.log(delta);
	//	if(delta < 1) {
	//		this.water.position.z += delta * this.waterDir * WATER_SPEED;
	//		if (Math.abs(this.water.position.z - WATER_Z) > 0.2) {
	//			this.waterDir *= -1;
	//		}
	//	}
	//}
}