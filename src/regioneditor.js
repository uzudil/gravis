import THREE from 'three';
import $ from 'jquery';
import * as constants from 'constants';
import * as util from 'util';
import * as regionModel from 'region';

const WATER_Z = 1.5;
const WATER_SPEED = 0.3;
const HIGH_TOP = 10;
const LOW_COLOR = new THREE.Color(0.25, 0.5, 0.2);
const HIGH_COLOR = new THREE.Color(0.55, 0.45, 0.25);
const SNOW_COLOR = new THREE.Color(0.6, 0.6,.85);
const WATER_COLOR = new THREE.Color(0.1, 0.3, 0.85);
const UNDERWATER_COLOR = new THREE.Color(0.1, 0.2, 0.35);

const FLAT_SHADING = false;

export class RegionEditor {
	constructor(gravis) {
		this.gravis = gravis;
		this.region = null;

		this.obj = new THREE.Object3D();
		this.obj.rotation.set(-Math.PI/4, 0, Math.PI/4);
		this.obj.position.z = -500;
		//this.obj.scale.set(constants.EDITOR_SCALE, constants.EDITOR_SCALE, constants.EDITOR_SCALE);
		this.gravis.scene.add(this.obj);

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
				if (dx == 0 && dy == 0) this.region = region;
				region.display((sectionX, sectionY, height) => {
					let vx = constants.VERTEX_SIZE * dx + sectionX;
					let vy = constants.VERTEX_SIZE * dy + sectionY;
					let v = this.mesh.vertexGrid[vx + "," + vy];
					if(v) v.z = height;
				});
				this.loadRegion(toLoad, index + 1, rx, ry);
			});
		} else {
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
		let faceIndices = [ 'a', 'b', 'c', 'd' ];
		this.mesh.geometry.faces.forEach((face) => {
			let numberOfSides = ( face instanceof THREE.Face3 ) ? 3 : 4;
			let faceZ = (this.mesh.geometry.vertices[face.a].z + this.mesh.geometry.vertices[face.b].z + this.mesh.geometry.vertices[face.c].z) / 3;
			for( var j = 0; j < numberOfSides; j++ ) {
				let vertexIndex = face[ faceIndices[ j ] ];
				let v = this.mesh.geometry.vertices[vertexIndex];

				let low, high, p;

				if(FLAT_SHADING) {
					// flat shading

					if (faceZ <= 0) {
						p = Math.min(faceZ / -7, 1);
						low = LOW_COLOR;
						high = UNDERWATER_COLOR;
					} else if (faceZ < HIGH_TOP + 1) {
						p = Math.min(faceZ / 7, 1);
						low = LOW_COLOR;
						high = HIGH_COLOR;
					} else {
						p = Math.min((faceZ - (HIGH_TOP + 1)) / 4, 1);
						low = HIGH_COLOR;
						high = SNOW_COLOR;
					}
				} else {
					// smooth shading
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
				}

				face.vertexColors[j].setRGB(
					low.r + (high.r - low.r) * p,
					low.g + (high.g - low.g) * p,
					low.b + (high.b - low.b) * p);
			}
		});
	}
}