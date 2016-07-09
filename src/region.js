import THREE from 'three';
import $ from 'jquery';
import * as constants from 'constants';
import * as util from 'util';

const HIGH_TOP = 10;
const BLOCK_PROPS = [
	{ h: -5, r: 2, d: 0.05, e: 8, a: 1.5 }, // sea
	{ h: 3, r: 0.5, d: 0.5, e: 1, a: 0.7 }, // land
	//{ h: HIGH_TOP, r: 1, d: 0.1, e: 4, a: 0.7 }, // hill - doesn't exist
	{ h: 16, r: 2, d: 0.05, e: 8, a: 0.7 }, // mountain
	{ h: 3, r: 0.5, d: 0.5, e: 1, a: 0.7 }, // forest
	{ h: 3, r: 0.5, d: 0.5, e: 1, a: 0.7 }, // beach
	{ h: -5, r: 2, d: 0.05, e: 8, a: 1.5 }, // LAKE
	{ h: -5, r: 2, d: 0.05, e: 8, a: 1.5 }, // RIVER
	{ h: 3, r: 0.5, d: 0.5, e: 1, a: 0.7 }, // TOWN
	{ h: 3, r: 0.5, d: 0.5, e: 1, a: 0.7 }, // TOWN_CENTER
	{ h: 3, r: 0.5, d: 0.5, e: 1, a: 0.7 }, // DUNGEON
	{ h: 3, r: 0.5, d: 0.5, e: 1, a: 0.7 } // ROAD
];

export class Region {

	constructor(rx, ry, region) {
		this.rx = rx;
		this.ry = ry;
		this.region = region;
		this.name = "region" + this.rx.toString(16) + this.ry.toString(16);

		this.z = [];
	}

	save() {
		let region = {
			region: this.region,
			version: 1,
			name: this.name,
			x: this.rx,
			y: this.ry
		};

		console.log("Uploading " + this.name + "...");
		$.ajax({
			type: 'POST',
			url: "http://localhost:9090/cgi-bin/upload.py",
			data: "name=" + this.name + "&file=" + JSON.stringify(region),
			success: ()=>{console.log("Success!");},
			error: (error)=>{console.log("error: ", error);},
			dataType: "text/json"
		});
		console.log("Stored on server.");
	}

	static load(rx, ry, onSuccess, onError=null) {
		console.log("Loading region " + rx + "," + ry);
		let name = "/models/regions/region" + rx.toString(16) + ry.toString(16) + ".json?cb=" + window.cb;
		$.ajax({
			type: 'GET',
			dataType: 'json',
			url: name + "?cb=" + window.cb,
			success: (region) => {
				console.log("Loaded region:", region);
				return onSuccess(new Region(rx, ry, region.region));
			},
			error: (err) => {
				console.log("Error downloading region: " + name + " error=" + err);
				if(onError) onError();
			}
		});
	}

	display(setZ) {
		// init height map
		for(let x = 0; x < constants.REGION_SIZE * constants.REGION_SIZE; x++) {
			let a = [];
			this.z.push(a);
			for (let y = 0; y < constants.REGION_SIZE * constants.REGION_SIZE; y++) {
				a.push(0);
			}
		}

		// create height map
		for(let x = 0; x < constants.REGION_SIZE; x++) {
			for(let y = 0; y < constants.REGION_SIZE; y++) {
				this.makeSection(x, y, this.region[x][y]);
			}
		}

		// apply erosion
		for(let i = 0; i < 5; i++) {
			this.erode();
		}

		// move mesh points as in height map
		for(let x = 0; x < constants.VERTEX_SIZE; x++) {
			for (let y = 0; y < constants.VERTEX_SIZE; y++) {
				setZ(x, y, this.z[x][y] || 0);
			}
		}
	}

	makeSection(x, y, sectionType) {
		let p = BLOCK_PROPS[sectionType];

		for(let xx = 0; xx < constants.SECTION_SIZE; xx++) {
			for(let yy = 0; yy < constants.SECTION_SIZE; yy++) {
				let z;
				if(p.e <= 1 || ((xx % p.e == 0 && yy % p.e == 0))) {
					z = Math.random() * p.r - p.r * p.d + p.h;
				} else {
					let tx = Math.floor(xx / p.e) * p.e;
					let ty = Math.floor(yy / p.e) * p.e;
					z = this.z[x * constants.SECTION_SIZE + tx][y * constants.SECTION_SIZE + ty];
				}
				this.z[x * constants.SECTION_SIZE + xx][y * constants.SECTION_SIZE + yy] = z;
			}
		}
	}

	erode() {
		for(let x = 1; x < constants.REGION_SIZE * constants.SECTION_SIZE - 1; x++) {
			for (let y = 1; y < constants.REGION_SIZE * constants.SECTION_SIZE - 1; y++) {
				this.erodeAt(x, y);
			}
		}
	}

	erodeAt(x, y) {
		if(x < 1 || y < 1 ||
			x >= constants.REGION_SIZE * constants.SECTION_SIZE - 1 ||
			y >= constants.REGION_SIZE * constants.SECTION_SIZE - 1) return;

		let a = [];
		for(let dx = -1; dx <= 1; dx++) {
			for(let dy= -1; dy <= 1; dy++) {
				a.push(this.z[x + dx][y + dy]);
			}
		}
		let h = a.reduce((p, v) => p + v, 0) / a.length;
		let r = h/6;
		this.z[x][y] = h + Math.random() * r - r/2;
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
