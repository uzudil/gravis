import THREE from 'three';
import $ from 'jquery';
import * as constants from 'constants';
import * as util from 'util';
import * as regionModel from 'region';
import * as sectionDef from 'section';
import { View } from 'view';

const WATER_Z = 1.5;
const WATER_SPEED = 0.3;
const HIGH_TOP = 10;
const LOW_COLOR = new THREE.Color(0.25, 0.5, 0.2);
const HIGH_COLOR = new THREE.Color(0.55, 0.45, 0.25);
const SNOW_COLOR = new THREE.Color(0.6, 0.6,.85);
const WATER_COLOR = new THREE.Color(0.1, 0.3, 0.85);
const UNDERWATER_COLOR = new THREE.Color(0.1, 0.2, 0.35);

export class RegionEditor {
	constructor(gravis) {
		this.gravis = gravis;
		this.view = new View();

		this.baseObj = new THREE.Object3D();

		this.obj = new THREE.Object3D();
		this.obj.rotation.set(-Math.PI/4, 0, Math.PI/4);
		this.obj.position.z = -500;
		this.baseObj.add(this.obj);

		//this.obj.scale.set(constants.EDITOR_SCALE, constants.EDITOR_SCALE, constants.EDITOR_SCALE);
		this.gravis.scene.add(this.baseObj);

		// create the mesh with a buffer zone around it where we'll load 1 section of the neighboring region
		let size = constants.VERTEX_SIZE + 2 * constants.SECTION_SIZE;
		this.mesh = new THREE.Mesh(
			new THREE.PlaneGeometry(size, size, size, size),
			constants.MATERIAL
		);

		// create the vertex colors
		this.mesh.geometry.faces.forEach((face) => {
			let numberOfSides = ( face instanceof THREE.Face3 ) ? 3 : 4;
			for( var j = 0; j < numberOfSides; j++ ) {
				face.vertexColors[j] = new THREE.Color(1, 1, 1);
			}
		});

		// index the vertices
		this.mesh["vertexGrid"] = {};
		let minx = 1, maxx = -1;
		for(let v of this.mesh.geometry.vertices) {
			// map -1 to 0, 1 to constants.VERTEX_SIZE
			let xp = v.x + constants.VERTEX_SIZE/2;
			let yp = v.y + constants.VERTEX_SIZE/2;
			if(xp < minx) minx = xp;
			if(xp > maxx) maxx = xp;
			this.mesh.vertexGrid[xp + "," + yp] = v;
		}
		console.log("range is: " + minx + " to " + maxx);

		this.water = new THREE.Mesh(
			new THREE.PlaneGeometry(size, size),
			new THREE.MeshBasicMaterial( { color: WATER_COLOR, opacity: 0.25, transparent: true }));
		this.water.position.z = WATER_Z;
		//this.waterDir = 1;

		this.obj.add(this.mesh);
		this.obj.add(this.water);

	}

	edit(rx, ry) {
		$("#rx").text(rx);
		$("#ry").text(ry);
		let regionCount = constants.WORLD_SIZE / constants.REGION_SIZE;
		let toLoad = [];
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				if(rx + dx >= 0 && ry + dy >= 0 && rx + dx < regionCount && ry + dy < regionCount) toLoad.push([dx, dy]);
			}
		}
		this.startTime = Date.now();
		console.log("Building map...");
		this.loadRegion(toLoad, 0, rx, ry);
	}

	loadRegion(toLoad, index, rx, ry) {
		if(index < toLoad.length) {
			let [dx, dy] = toLoad[index];
			regionModel.Region.load(rx + dx, ry + dy, (region) => {
				this.view.display(region, dx + 1, dy + 1);
				this.loadRegion(toLoad, index + 1, rx, ry);
			});
		} else {
			this.view.finish((x, y, point) => {
				let vx = x - 1.5 * constants.VERTEX_SIZE;
				let vy = y - 1.5 * constants.VERTEX_SIZE;
				let v = this.mesh.vertexGrid[vx + "," + vy];
				if (v) {
					v.z = point.z;
					v.section = point.type;
					v.vx = vx;
					v.vy = vy;
				}
			});
			console.log("Done building map: " + (Date.now() - this.startTime) + " millis. Coloring...");
			this.startTime = Date.now();
			this.colorFaces();
			console.log("Done coloring: " + (Date.now() - this.startTime) + " millis.");
			this.mesh.geometry.computeVertexNormals();
			util.updateColors(this.mesh);
		}
	}

	colorFaces() {
		// faces are indexed using characters
		let faceIndices = ['a', 'b', 'c', 'd'];
		this.mesh.geometry.faces.forEach((face) => {
			let numberOfSides = ( face instanceof THREE.Face3 ) ? 3 : 4;
			let faceZ = (this.mesh.geometry.vertices[face.a].z + this.mesh.geometry.vertices[face.b].z + this.mesh.geometry.vertices[face.c].z) / 3;
			for (var j = 0; j < numberOfSides; j++) {
				let vertexIndex = face[faceIndices[j]];
				let v = this.mesh.geometry.vertices[vertexIndex];

				let low, high, p;

				// height-based shading
				if (faceZ <= 0) {
					p = Math.min(v.z / -7, 1);
					low = LOW_COLOR;
					high = UNDERWATER_COLOR;
				} else if (v.z < HIGH_TOP + 1) {
					p = Math.min(v.z / 7, 1);
					low = LOW_COLOR;
					high = HIGH_COLOR;
				} else {
					p = Math.min(v.z / 12, 1);
					low = HIGH_COLOR;
					high = SNOW_COLOR;
				}

				let r = low.r + (high.r - low.r) * p;
				let g = low.g + (high.g - low.g) * p;
				let b = low.b + (high.b - low.b) * p;


				if(v.section && sectionDef.SECTIONS[v.section].color) {
					let color = sectionDef.SECTIONS[v.section].color;

					let n = this.mesh.vertexGrid[v.vx + "," + (v.vy - constants.SECTION_SIZE)];
					let s = this.mesh.vertexGrid[v.vx + "," + (v.vy + constants.SECTION_SIZE)];
					let e = this.mesh.vertexGrid[(v.vx + constants.SECTION_SIZE) + "," + v.vy];
					let w = this.mesh.vertexGrid[(v.vx - constants.SECTION_SIZE) + "," + v.vy];

					let xx = ((v.x + constants.VERTEX_SIZE / 2) % constants.SECTION_SIZE) / constants.SECTION_SIZE;
					let yy = ((v.y + constants.VERTEX_SIZE / 2) % constants.SECTION_SIZE) / constants.SECTION_SIZE;

					let stopN = !n || n.section != v.section;
					let stopS = !s || s.section != v.section;
					let stopW = !w || w.section != v.section;
					let stopE = !e || e.section != v.section;
					let nn = yy < .25;
					let ss = yy >= .75;
					let ww = xx < .25;
					let ee = xx >= .75;

					p = 1;
					if(!stopN && !stopW && nn && ww) p = 0;
					if(!stopN && !stopE && nn && ee) p = 0;
					if(!stopS && !stopW && ss && ww) p = 0;
					if(!stopS && !stopE && ss && ee) p = 0;
					if(stopN && nn) p = 0;
					if(stopS && ss) p = 0;
					if(stopW && ww) p = 0;
					if(stopE && ee) p = 0;

					let x1, y1, x2, y2, dd, corner;
					if(stopN && stopW) {
						x1 = 1; y1 = 0.5;
						x2 = 0.5; y2 = 1;
						dd = -1;
					}
					if(stopN && stopE) {
						x1 = 0; y1 = 0.5;
						x2 = 0.5; y2 = 1;
						dd = 1;
					}
					if(stopS && stopW) {
						x1 = 1; y1 = 0.5;
						x2 = 0.5; y2 = 0;
						dd = 1;
					}
					if(stopS && stopE) {
						x1 = 0; y1 = 0.5;
						x2 = 0.5; y2 = 0;
						dd = -1;
					}

					if(dd) {
						// http://math.stackexchange.com/questions/274712/calculate-on-which-side-of-straign-line-is-dot-located
						let d = ((xx - x2) * (y2 - y1)) - ((yy - y1) * (x2 - x1));
						if((dd < 0 && d < 0) || (dd > 0 && d > 0)) p = 0;
					}

					r = r + (color.r - r) * p;
					g = g + (color.g - g) * p;
					b = b + (color.b - b) * p;
				}

				face.vertexColors[j].setRGB(r, g, b);
			}
		});
	}
}