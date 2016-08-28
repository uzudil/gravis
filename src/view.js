import THREE from 'three';
import $ from 'jquery';
import * as constants from 'constants';
import * as util from 'util';
import * as sectionDef from 'section';

const DEFAULT_POINT = {z: 0, type: 0, road: 0, secondTexture: 0, beach: 0};
/**
 * All displayed region data in memory.
 */
export class View {
	constructor() {
		this.reset();
	}

	reset() {
		this.copied = {};
		this.generatedCount = 0;
		this.z = [];

		// init height map
		for(let x = 0; x < 3 * constants.VERTEX_SIZE; x++) {
			let a = [];
			this.z.push(a);
			for (let y = 0; y < 3 * constants.VERTEX_SIZE; y++) {
				a.push(this.defaultPoint());
			}
		}
	}

	compressFloat (f) {
		return Math.round(f * 1000) / 1000.0;
	}

	save(rx, ry) {
		console.log("Creating data file " + name + "...");
		let d = [];
		for (let x = 0; x < constants.VERTEX_SIZE; x++) {
			for (let y = 0; y < constants.VERTEX_SIZE; y++) {
				let p = this.z[constants.VERTEX_SIZE + x][constants.VERTEX_SIZE + y];
				d.push(this.compressFloat(p.z));
				d.push(p.type);
				d.push(this.compressFloat(p.road));
				d.push(this.compressFloat(p.beach));
				d.push(this.compressFloat(p.secondTexture));
			}
		}

		let name = "region" + rx.toString(16) + ry.toString(16);
		let region = {
			region: d,
			version: 1,
			name: name,
			x: rx,
			y: ry
		};

		console.log("Uploading " + name + "...");
		$.ajax({
			type: 'POST',
			url: "http://localhost:9090/cgi-bin/upload.py",
			data: "name=" + name + "&expanded=1&file=" + JSON.stringify(region),
			success: ()=>{console.log("Success!");},
			error: (error)=>{console.log("error: ", error);},
			dataType: "text/json"
		});
		console.log("Stored on server.");
	}

	copy(expandedRegion, rx, ry) {
		let i = 0;
		let x = 0;
		let y = 0;
		while(i < expandedRegion.region.length) {
			let p = this.z[rx * constants.VERTEX_SIZE + x][ry * constants.VERTEX_SIZE + y];

			p.z = expandedRegion.region[i++];
			p.type = expandedRegion.region[i++];
			p.road = expandedRegion.region[i++];
			p.beach = expandedRegion.region[i++];
			p.secondTexture = expandedRegion.region[i++];

			y++;
			if(y >= constants.VERTEX_SIZE) {
				y = 0;
				x++;
			}
		}
		this.copied[rx + "," + ry] = 1;
	}

	display(region, rx, ry) {
		this.generatedCount++;
		// create height map
		for (let x = 0; x < constants.REGION_SIZE; x++) {
			for (let y = 0; y < constants.REGION_SIZE; y++) {
				this.makeSection(rx, ry, x, y, region.region[x][y]);
			}
		}
	}

	finish(setZ) {
		if(this.generatedCount > 0) {
			// draw edges
			for (let x = 0; x < 3 * constants.VERTEX_SIZE; x += constants.SECTION_SIZE) {
				for (let y = 0; y < 3 * constants.VERTEX_SIZE; y += constants.SECTION_SIZE) {
					let n = this.z[x][y - constants.SECTION_SIZE];
					let s = this.z[x][y + constants.SECTION_SIZE];
					let w = x > constants.SECTION_SIZE ? this.z[x - constants.SECTION_SIZE][y] : null;
					let e = x < 3 * constants.VERTEX_SIZE - constants.SECTION_SIZE ? this.z[x + constants.SECTION_SIZE][y] : null;
					let dx = -1;
					let dy = -1;
					let type = null;
					if (this.isSame(n, e)) {
						dx = constants.SECTION_SIZE / 2;
						dy = 0;
						type = e.type;
					}
					if (this.isSame(s, e)) {
						dx = constants.SECTION_SIZE / 2;
						dy = constants.SECTION_SIZE / 2;
						type = e.type;
					}
					if (this.isSame(n, w)) {
						dx = 0;
						dy = 0;
						type = w.type;
					}
					if (this.isSame(s, w)) {
						dx = 0;
						dy = constants.SECTION_SIZE / 2;
						type = w.type;
					}

					if (type) this.makeSubSection(x, y, type, dx, dy);
				}
			}

			// apply erosion
			for (let i = 0; i < 8; i++) {
				this.erode();
			}
		}

		// move mesh points as in height map
		for(let x = 0; x < 3 * constants.VERTEX_SIZE; x++) {
			for (let y = 0; y < 3 * constants.VERTEX_SIZE; y++) {
				setZ(x, y, this.z[x][y] || this.defaultPoint());
			}
		}
	}

	defaultPoint() {
		return Object.assign({}, DEFAULT_POINT);
	}

	isSame(a, b) {
		return a && b && a.type == b.type && sectionDef.SECTIONS[a.type].fillCorners;
	}

	makeSection(rx, ry, x, y, sectionType) {
		for(let xx = 0; xx < constants.SECTION_SIZE; xx++) {
			for(let yy = 0; yy < constants.SECTION_SIZE; yy++) {
				let px = rx * constants.VERTEX_SIZE + x * constants.SECTION_SIZE + xx;
				let py = ry * constants.VERTEX_SIZE + y * constants.SECTION_SIZE + yy;
				let point = this.z[px][py];
				point.z = this.calcZ(sectionType);
				point.type = sectionType;

				let dx = Math.abs(xx - constants.SECTION_SIZE/2) / (constants.SECTION_SIZE/2);
				let dy = Math.abs(yy - constants.SECTION_SIZE/2) / (constants.SECTION_SIZE/2);
				let d = Math.sqrt((dx * dx) + (dy * dy)); // distance from middle of the section (0 - 1)
				let r = Math.max(1.5 - d, 0); // % of point being this type

				point.road = this.isOfType(sectionType, 'road') ? 1.0 : 0.0;
				point.beach = this.isOfType(sectionType, 'beach') || this.isOfType(sectionType, 'sea') ? 1.0 : 0.0;
				point.secondTexture = (this.isOfType(sectionType, 'land') || this.isOfType(sectionType, 'forest')) && Math.random() >= 0.5 ? 1 : 0;
				point.r = r;
			}
		}
	}

	isOfType(sectionType, sectionTypeName) {
		return sectionType === sectionDef.SECTION_BY_NAME[sectionTypeName];
	}

	makeSubSection(x, y, sectionType, dx, dy) {
		for(let xx = 0; xx < constants.SECTION_SIZE/2; xx++) {
			for(let yy = 0; yy < constants.SECTION_SIZE/2; yy++) {
				this.setAttribValue(x + xx + dx, y + yy + dy, 'z', this.calcZ(sectionType));
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

		this.erodeAttribAt(x, y, "z", (avgValue => {
			let r = avgValue / (constants.SECTION_SIZE * 0.5);
			return avgValue + Math.random() * r - r/2;
		}));
		this.erodeAttribAt(x, y, "road", (avgValue => {
			// narrow the road
			if(avgValue > 0.35) {
				// add some randomness to the edges
				if(avgValue < 0.5) return Math.random() < 0.6 ? avgValue : 0.0;
				else return avgValue;
			} else {
				return 0.0;
			}
		}));
		this.erodeAttribAt(x, y, "beach", (avgValue => {
			// add some randomness to the edges
			if(avgValue < 0.75) return Math.random() < 0.8 ? avgValue : 0.0;
			else return avgValue;
		}));
		this.erodeAttribAt(x, y, "secondTexture", (avgValue => {
			// narrow the road
			if(avgValue > 0.4) {
				// add some randomness to the edges
				if(avgValue < 0.5) return Math.random() < 0.6 ? avgValue : 0.0;
				else return 1.0;
			} else {
				return 0.0;
			}
		}));
	}

	erodeAttribAt(x, y, attrib, setValue) {
		let a = [];
		for(let dx = -1; dx <= 1; dx++) {
			for(let dy= -1; dy <= 1; dy++) {
				a.push(this.z[x + dx][y + dy][attrib]);
			}
		}
		let h = a.reduce((p, v) => p + v, 0) / a.length;
		this.setAttribValue(x, y, attrib, setValue(h));
	}

	// don't touch values that were copied in
	setAttribValue(x, y, attrib, value) {
		let rx = (x / constants.VERTEX_SIZE)|0;
		let ry = (y / constants.VERTEX_SIZE)|0;
		if(!this.copied[rx + "," + ry]) this.z[x][y][attrib] = value;
	}
}