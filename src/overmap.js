import THREE from 'three';
import $ from 'jquery';
import * as constants from 'constants';
import * as util from 'util';
import Noise from 'noisejs';

// credit: https://github.com/amitp/mapgen2/blob/master/Map.as
// Author: amitp@cs.stanford.edu
// License: MIT
const ISLAND_FACTOR = 1.07;  // 1.0 means no small islands; 2.0 leads to a lot
const PERLIN_MULT = 5;
const PERLIN_CAP = 0.3;
const SIMPLEX_MULT = 2;
const SIMPLEX_CAP = 0.3;
const BEACH_WIDTH = 2;
const ERODE_COUNT = 25;
const BORDER = 3;
const MATERIAL = new THREE.MeshBasicMaterial({
	color: 0xffffff,
	side: THREE.DoubleSide,
	vertexColors: THREE.FaceColors
});
const SIZE = 500;
const MOUNTAIN_RATIO = 0.45;
const FOREST_RATIO = 0.55;

const SEA = 0;
const LAND = 1;
const MOUNTAIN = 2;
const FOREST = 3;
const BEACH = 4;

const COLORS = [
	0x8080cc,
	0x80cc80,
	0x454240,
	0x408840,
	0x888840
];

export class OverMap {
	constructor(gravis) {
		this.gravis = gravis;

		this.world = [];
		this.map = null;
		this.islandShape = "radial";

		this.initWorld();
		console.log("creating world model");
		this.makeWorldObject();
		this.gravis.scene.add(this.map);

		this.newMap();
	}

	newMap() {
		console.log("initializing world");
		this.initWorld();
		console.log("creating world");
		this.makeWorld();
		console.log("adding beaches");
		this.addBeaches();
		console.log("adding mountains");
		this.addMountains();
		console.log("adding forests");
		this.addForests();
		console.log("updateing world object");
		this.updateWorldObject();
		console.log("done");
	}

	initWorld() {
		for(let x = 0; x < constants.WORLD_SIZE; x++) {
			let a = [];
			this.world.push(a);
			for(let y = 0; y < constants.WORLD_SIZE; y++) {
				a.push(0);
			}
		}
	}

	makeWorld() {
		this.makeNoise();
		this.border(BORDER);
		for(let i = 0; i < ERODE_COUNT; i++) this.erode();
	}

	static randomMinMax(a, b) {
		return a + (Math.random() * (b - a));
	}

	makeNoise() {
		let islandShape = this[$("#noise").val()]();
		let v = new THREE.Vector2();
		for(let x = 1; x < constants.WORLD_SIZE - 1; x++) {
			for(let y = 1; y < constants.WORLD_SIZE - 1; y++) {
				// Determine whether a given point should be on the island or in the water.
				v.set(2*(x/constants.WORLD_SIZE - 0.5), 2*(y/constants.WORLD_SIZE - 0.5));
				this.world[x][y] = islandShape(v) ? 1 : 0;
			}
		}
	}

	perlin() {
		let noise = new Noise.Noise(Math.random());
		return (q) => {
			let c = (noise.perlin2(q.x * PERLIN_MULT, q.y * PERLIN_MULT) + 1) / 2;
			return c > PERLIN_CAP + PERLIN_CAP * q.length() * q.length();
		};
	}

	simplex() {
		let noise = new Noise.Noise(Math.random());
		return (q) => {
			let c = (noise.simplex2(q.x * SIMPLEX_MULT, q.y * SIMPLEX_MULT) + 1) / 2;
			return c > SIMPLEX_CAP + SIMPLEX_CAP * q.length() * q.length();
		};
	}

	radial() {
		let bumps = Math.round(OverMap.randomMinMax(1, 6));
		let startAngle = OverMap.randomMinMax(0, 2 * Math.PI);
		let dipAngle = OverMap.randomMinMax(0, 2 * Math.PI);
		var dipWidth = OverMap.randomMinMax(0.2, 0.7);

		return (q) => {
			let angle = Math.atan2(q.y, q.x);
			let length = 0.5 * (Math.max(Math.abs(q.x), Math.abs(q.y)) + q.length());

			let r1 = 0.5 + 0.40 * Math.sin(startAngle + bumps * angle + Math.cos((bumps + 3) * angle));
			let r2 = 0.7 - 0.20 * Math.sin(startAngle + bumps * angle - Math.sin((bumps + 2) * angle));
			if (Math.abs(angle - dipAngle) < dipWidth
				|| Math.abs(angle - dipAngle + 2 * Math.PI) < dipWidth
				|| Math.abs(angle - dipAngle - 2 * Math.PI) < dipWidth) {
				r1 = r2 = 0.2;
			}
			let b = (length < r1 || (length > r1 * ISLAND_FACTOR && length < r2));
			//console.log(q.x + "," + q.y + " a=" + angle + " len=" + length + " r=" + r1 + "," + r2 + " b=" + b);
			return b;
		};
	}

	random() {
		for(let x = 0; x < constants.WORLD_SIZE; x++) {
			for(let y = 0; y < constants.WORLD_SIZE; y++) {
				this.world[x][y] = Math.round(Math.random() * 100 > 52 ? 0 : 1);
			}
		}
	}

	border(w) {
		for(let x = 0; x < constants.WORLD_SIZE; x++) {
			for(let y = 0; y < constants.WORLD_SIZE; y++) {
				if(x < w || x >= constants.WORLD_SIZE - w || y < w || y >= constants.WORLD_SIZE - w)
					this.world[x][y] = 0;
			}
		}
	}

	addMountains() {
		this.scatterOnLand(MOUNTAIN_RATIO, MOUNTAIN);
	}

	addForests() {
		this.scatterOnLand(FOREST_RATIO, FOREST);
	}

	scatterOnLand(ratio, blockType) {
		let land = this.getLand();
		let c = Math.round(land.length * ratio);
		for(let i = 0; i < c; i++) {
			try {
				let index = Math.floor(Math.random() * land.length);
				let pos = land[index];
				land.splice(index, 1);
				this.world[pos[0]][pos[1]] = blockType;
			} catch(exc) {
				debugger;
			}
		}
		for(let i = 0; i < 10; i++) this.erode(blockType, LAND);
	}

	// returns array of free-space locations (x,y pairs)
	getLand() {
		let land = [];
		for(let x = 0; x < constants.WORLD_SIZE; x++) {
			for(let y = 0; y < constants.WORLD_SIZE; y++) {
				if(this.world[x][y] == LAND) {
					land.push([x, y]);
				}
			}
		}
		return land;
	}

	addBeaches() {
		//let sea = this.getSea();
		for(let x = 0; x < constants.WORLD_SIZE; x++) {
			for(let y = 0; y < constants.WORLD_SIZE; y++) {
				if(this.world[x][y] != SEA && this.isCloseTo(SEA, BEACH_WIDTH, x, y)) {
					this.world[x][y] = BEACH;
				}
			}
		}
	}

	isCloseTo(blockType, distance, x, y) {
		for(let dx = -distance; dx <= distance; dx++) {
			for (let dy = -distance; dy <= distance; dy++) {
				let px = x + dx;
				let py = y + dy;
				if(!(dx == 0 && dy == 0) && px >= 0 && py >= 0 && px < constants.WORLD_SIZE && py < constants.WORLD_SIZE && this.world[px][py] == blockType) {
					return true;
				}
			}
		}
		return false;
	}

	getSea() {
		let sea = {};

		// should be recursive but the browser won't allow it (Uncaught RangeError: Maximum call stack size exceeded)
		let stack = [[0,0]];
		while(stack.length > 0) {
			let [x,y] = stack.pop();
			let key = x + "," + y;
			if(!sea[key] && this.world[x][y] == SEA) {
				sea[key] = true;
				if(x > 0) stack.push([x - 1, y]);
				if(x < constants.WORLD_SIZE - 1) stack.push([x + 1, y]);
				if(y > 0) stack.push([x, y - 1]);
				if(y < constants.WORLD_SIZE - 1) stack.push([x, y + 1]);
			}
		}
		return sea;
	}

	erode(on=LAND, off=SEA) {
		for(let x = 1; x < constants.WORLD_SIZE - 1; x++) {
			for(let y = 1; y < constants.WORLD_SIZE - 1; y++) {
				if(this.world[x][y] == on || this.world[x][y] == off) {
					let total =
						(this.world[x - 1][y - 1] == on ? 1 : 0) +
						(this.world[x - 1][y] == on ? 1 : 0) +
						(this.world[x - 1][y + 1] == on ? 1 : 0) +
						(this.world[x + 1][y - 1] == on ? 1 : 0) +
						(this.world[x + 1][y] == on ? 1 : 0) +
						(this.world[x + 1][y + 1] == on ? 1 : 0) +
						(this.world[x][y - 1] == on ? 1 : 0) +
						(this.world[x][y + 1] == on ? 1 : 0) +
						(this.world[x][y] == on ? 1 : 0);
					this.world[x][y] = total >= 5 ? on : off;
				}
			}
		}
	}

	makeWorldObject() {
		this.map = new THREE.Mesh(
			new THREE.PlaneGeometry(SIZE, SIZE, constants.WORLD_SIZE, constants.WORLD_SIZE),
			MATERIAL);
		for(let face of this.map.geometry.faces) {
			face.color = new THREE.Color();
		}
		this.updateWorldObject();
	}

	updateWorldObject() {
		for(let face of this.map.geometry.faces) {
			let a = this.map.geometry.vertices[face.a];
			let b = this.map.geometry.vertices[face.b];
			let c = this.map.geometry.vertices[face.c];
			let xp = Math.min(a.x, b.x, c.x);
			let yp = Math.min(a.y, b.y, c.y);

			let x = Math.round((xp + (SIZE/2)) / SIZE * (constants.WORLD_SIZE - 1));
			let y = Math.round((yp + (SIZE/2)) / SIZE * (constants.WORLD_SIZE - 1));
			let value = this.world[x][y];
			face.color.setHex(COLORS[value]);
		}
		this.map.geometry.colorsNeedUpdate = true;
	}
}