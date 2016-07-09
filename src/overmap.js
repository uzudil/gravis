import THREE from 'three';
import $ from 'jquery';
import * as constants from 'constants';
import * as util from 'util';
import Noise from 'noisejs';
import { default as aStar } from 'a-star';
import * as regionModel from 'region';

// credit: https://github.com/amitp/mapgen2/blob/master/Map.as
// Author: amitp@cs.stanford.edu
// License: MIT
const ISLAND_FACTOR = 1.07;  // 1.0 means no small islands; 2.0 leads to a lot
const PERLIN_MULT = 5;
const PERLIN_CAP = 0.3;
const SIMPLEX_MULT = 2.3;
const SIMPLEX_CAP = 0.25;
const BEACH_WIDTH = 2;
const ERODE_COUNT = 25;
const BORDER = 3;
const RIVER_COUNT = 10;
const MATERIAL = new THREE.MeshBasicMaterial({
	color: 0xffffff,
	side: THREE.DoubleSide,
	vertexColors: THREE.FaceColors
});
const SIZE = 300;
const MOUNTAIN_RATIO = 0.48;
const FOREST_RATIO = 0.55;
const COASTAL_TOWNS = 7;
const MIN_NODE_SPACING = constants.WORLD_SIZE / 10;
const TOWN_SIZE = 2;
const FOREST_TOWNS = 5;
const DUNGEON_COUNT = 7;

const SEA = 0;
const LAND = 1;
const MOUNTAIN = 2;
const FOREST = 3;
const BEACH = 4;
const LAKE = 5;
const RIVER = 6;
const TOWN = 7;
const TOWN_CENTER = 8;
const DUNGEON = 9;
const ROAD = 10;

const COLORS = [
	0x7080ec,
	0x80cc80,
	0x454240,
	0x408840,
	0xeeeecc,
	0x7080ec,
	0x7080ec,
	0x886600,
	0xcc4400,
	0xeeee00,
	0x332200
];

const Z_AXIS = new THREE.Vector3(0, 0, 1);

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
	}

	edit() {
		this.newMap();
	}

	newMap() {
		console.log("initializing world");
		this.initWorld();
		console.log("creating world");
		this.makeWorld();
		console.log("adding lakes");
		this.addLakes();
		console.log("adding beaches");
		this.addBeaches();
		console.log("adding mountains");
		this.addMountains();
		console.log("adding forests");
		this.addForests();
		console.log("adding rivers");
		this.addRivers();
		console.log("adding towns and roads");
		this.addRoads(this.addNodes());
		console.log("updating world object");
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
			return c > SIMPLEX_CAP + SIMPLEX_CAP * 2 * q.length() * q.length();
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
	getLand(isFree = (x,y) => this.world[x][y] == LAND) {
		let land = [];
		for(let x = 0; x < constants.WORLD_SIZE; x++) {
			for(let y = 0; y < constants.WORLD_SIZE; y++) {
				if(isFree(x, y)) {
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

	addLakes() {
		let sea = this.getSea();
		for(let x = 0; x < constants.WORLD_SIZE; x++) {
			for(let y = 0; y < constants.WORLD_SIZE; y++) {
				let key = x + "," + y;
				if(this.world[x][y] == SEA && sea[key] == null) this.world[x][y] = LAKE;
			}
		}
	}

	addRivers() {
		let land = this.getLand((x, y) => {
			return this.world[x][y] != SEA && this.world[x][y] != BEACH && this.world[x][y] != LAKE &&
				x >= constants.WORLD_SIZE * .3 && y >= constants.WORLD_SIZE * .3 &&
				x < constants.WORLD_SIZE * .7 && y < constants.WORLD_SIZE * .7;
		});
		for(let i = 0; i < RIVER_COUNT; i++) {
			let index = Math.floor(Math.random() * land.length);
			let [x, y] = land[index];
			this.drunkenLine(x, y,
				new THREE.Vector2((x - constants.WORLD_SIZE/2)/constants.WORLD_SIZE/2,
					(y - constants.WORLD_SIZE/2)/constants.WORLD_SIZE/2),
				RIVER,
				(x, y) => [SEA, LAKE].indexOf(this.world[Math.round(x)][Math.round(y)]) >= 0);
		}
	}

	addNodes() {
		let nodes = [];
		this.addNodeOnTerrain(nodes, COASTAL_TOWNS, BEACH, (x, y) => this.addTown(x, y));
		this.addNodeOnTerrain(nodes, FOREST_TOWNS, FOREST, (x, y) => this.addTown(x, y));
		this.addNodeOnTerrain(nodes, DUNGEON_COUNT, MOUNTAIN, (x, y) => this.world[x][y] = DUNGEON);
		return nodes;
	}

	addNodeOnTerrain(nodes, count, blockType, addNodeFx) {
		let isTooClose = this.isTooCloseFx();
		let terrain = this.getLand((x, y) => this.world[x][y] == blockType);
		for(let i = 0; i < count; i++) {
			// try 5 times
			for(let t = 0; t < 5; t++) {
				let index = Math.floor(Math.random() * terrain.length);
				let [x, y] = terrain[index];
				if (!isTooClose(x, y, nodes)) {
					addNodeFx(x, y);
					terrain.splice(index, 1);
					nodes.push([x, y]);
					break;
				}
			}
		}
	}

	addTown(x, y) {
		for(let dx = -TOWN_SIZE; dx <= TOWN_SIZE; dx++) {
			for(let dy = -TOWN_SIZE; dy <= TOWN_SIZE; dy++) {
				let xx = x + dx;
				let yy = y + dy;
				if(this.onLand(xx, yy)) this.world[xx][yy] = TOWN;
			}
		}
		this.world[x][y] = TOWN_CENTER;
	}

	isValidPos(x, y) {
		return x >= 0 && x < constants.WORLD_SIZE && y >= 0 && y < constants.WORLD_SIZE;
	}

	onWater(x, y) {
		return this.isValidPos(x, y) && [SEA, RIVER, LAKE].indexOf(this.world[x][y]) >= 0;
	}

	onLand(x, y) {
		return this.isValidPos(x, y) && !this.onWater(x, y);
	}

	canBeRoad(x, y) {
		return this.isValidPos(x, y) && [SEA, LAKE, BEACH].indexOf(this.world[x][y]) < 0;
	}

	isTooCloseFx() {
		let a = new THREE.Vector2();
		let b = new THREE.Vector2();
		return (x, y, nodes) => {
			a.set(x, y);
			return nodes.some(([x, y]) => {
				b.set(x, y);
				return a.distanceTo(b) <= MIN_NODE_SPACING;
			});
		};
	}

	static euclideanDistance(a, b) {
		try {
			var dx = b[0] - a[0], dy = b[1] - a[1];
			return Math.sqrt(dx * dx + dy * dy);
		} catch(exc) {
			debugger;
		}
	}

	static rectilinearDistance(a, b) {
		var dx = b[0] - a[0], dy = b[1] - a[1];
		return Math.abs(dx) + Math.abs(dy);
	}

	findClosestFx() {
		let a = new THREE.Vector2();
		let b = new THREE.Vector2();

		return (x, y, nodes) => {
			a.set(x, y);
			let closest = null;
			let d = constants.WORLD_SIZE;
			nodes.forEach((p) => {
				if(!(x == p[0] && y == p[1])) {
					b.set(p[0], p[1]);
					let dd = a.distanceTo(b);
					if (dd < d) {
						d = dd;
						closest = p;
					}
				}
			});
			return closest;
		};
	}

	addRoads(nodes) {
		let findClosest = this.findClosestFx();
		while(nodes.length > 1) {
			let node = nodes[0];
			let [x, y] = node;
			let closest = findClosest(x, y, nodes);
			//console.log("Finding path from ", node, " to ", closest);

			let path = aStar({
				start: [x, y],
				isEnd: (node) => node[0] == closest[0] && node[1] == closest[1],
				neighbor: (node) => {
					let a = [];
					let [x, y] = node;
					if(this.canBeRoad(x - 1, y - 1)) a.push([x - 1, y - 1]);
					if(this.canBeRoad(x, y - 1)) a.push([x, y - 1]);
					if(this.canBeRoad(x + 1, y - 1)) a.push([x + 1, y - 1]);
					if(this.canBeRoad(x - 1, y + 1)) a.push([x - 1, y + 1]);
					if(this.canBeRoad(x, y + 1)) a.push([x, y + 1]);
					if(this.canBeRoad(x + 1, y + 1)) a.push([x + 1, y + 1]);
					if(this.canBeRoad(x + 1, y)) a.push([x + 1, y]);
					if(this.canBeRoad(x - 1, y)) a.push([x - 1, y]);
					return a;
				},
				distance: OverMap.euclideanDistance,
				// add a little randomness to roads...
				heuristic: (node) => OverMap.rectilinearDistance(node, closest) * (Math.random() >= 0.85 ? 2 : 1),
				hash: (node) => node[0] + "," + node[1]
			});
			//console.log(path);

			// draw road
			if(path.status === "success") {
				for(let n of path.path) {
					if(!(n[0] == x && n[1] == y) && !(n[0] == closest[0] && n[1] == closest[1])) {
						this.world[n[0]][n[1]] = ROAD;
					}
				}
			}

			// remove this node
			nodes.splice(0, 1);
		}
	}

	drunkenLine(x, y, m, blockType, stopWhen) {
		let t = new THREE.Vector3();
		let t2 = new THREE.Vector3(m.x, m.y, 0);
		let np = new THREE.Vector2(x, y);
		let mm = new THREE.Vector2(m.x, m.y);
		while(!stopWhen(np.x, np.y)) {
			this.world[Math.round(np.x)][Math.round(np.y)] = blockType;

			if(Math.random() > 0.7) {
				// change direction by +/- 45 deg
				t.set(mm.x, mm.y, 0);
				t.applyAxisAngle(Z_AXIS, Math.random() * Math.PI / 2 - Math.PI / 4);

				// but not too far...
				if(t.angleTo(t2) < Math.PI/2) {
					mm.set(t.x, t.y);
				}
			}

			// take a step
			np.add(mm);
		}
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

	hide() {
		this.map.visible = false;
	}

	saveRegions() {
		for(let x = 0; x < constants.WORLD_SIZE; x += constants.REGION_SIZE) {
			for (let y = 0; y < constants.WORLD_SIZE; y += constants.REGION_SIZE) {
				let rx = Math.floor(x/constants.REGION_SIZE);
				let ry = Math.floor(y/constants.REGION_SIZE);

				let region = [];
				for(let xx = 0; xx < constants.REGION_SIZE; xx++) {
					let a = [];
					region.push(a);
					for(let yy = 0; yy < constants.REGION_SIZE; yy++) {
						a.push(this.world[x + xx][y + yy]);
					}
				}

				new regionModel.Region(rx, ry, region).save();
			}
		}
	}
}
