import THREE from 'three';
import $ from 'jquery';
import * as constants from 'constants';
import * as util from 'util';
import * as regionModel from 'region';
import * as sectionDef from 'section';
import { View } from 'view';

const WATER_Z = 1.5;
const WATER_COLOR = new THREE.Color(0.1, 0.3, 0.85);

export class RegionEditor {
	constructor(gravis) {
		this.gravis = gravis;
		this.view = new View();

		this.baseObj = new THREE.Object3D();

		this.obj = new THREE.Object3D();
		this.obj.rotation.set(-Math.PI / 4, 0, Math.PI / 4);
		this.obj.position.z = -500;
		this.baseObj.add(this.obj);

		//this.obj.scale.set(constants.EDITOR_SCALE, constants.EDITOR_SCALE, constants.EDITOR_SCALE);
		this.gravis.scene.add(this.baseObj);

		// create the mesh with a buffer zone around it where we'll load 1 section of the neighboring region
		let size = constants.VERTEX_SIZE + 2 * constants.SECTION_SIZE;
		this.mesh = new THREE.Mesh(
			new THREE.PlaneGeometry(size, size, size, size),
			new THREE.ShaderMaterial({
				uniforms: {
					texture_grass: {type: "t", value: gravis.tex.classicGrass1},
					texture_rock: {type: "t", value: gravis.tex.ground1}
				},
				vertexShader: gravis.shaders.map[0],
				fragmentShader: gravis.shaders.map[1]
			})
		);

		// custom attribute for how 'road' a vertex is
		//this.road = new Float32Array( this.mesh.geometry.vertices.length );
		//this.mesh.geometry.addAttribute( 'road', new THREE.BufferAttribute( this.road, 1 ) );

		//// create the vertex colors
		//this.mesh.geometry.faces.forEach((face) => {
		//	let numberOfSides = ( face instanceof THREE.Face3 ) ? 3 : 4;
		//	for (var j = 0; j < numberOfSides; j++) {
		//		face.vertexColors[j] = new THREE.Color(1, 1, 1);
		//	}
		//});

		// index the vertices
		this.mesh["vertexGrid"] = {};
		let minx = 1, maxx = -1;
		for (let v of this.mesh.geometry.vertices) {
			// map -1 to 0, 1 to constants.VERTEX_SIZE
			let xp = v.x + constants.VERTEX_SIZE / 2;
			let yp = v.y + constants.VERTEX_SIZE / 2;
			if (xp < minx) minx = xp;
			if (xp > maxx) maxx = xp;
			this.mesh.vertexGrid[xp + "," + yp] = v;
		}
		console.log("range is: " + minx + " to " + maxx);

		this.water = new THREE.Mesh(
			new THREE.PlaneGeometry(size, size),
			new THREE.MeshBasicMaterial({color: WATER_COLOR, opacity: 0.25, transparent: true}));
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
				if (rx + dx >= 0 && ry + dy >= 0 && rx + dx < regionCount && ry + dy < regionCount) toLoad.push([dx, dy]);
			}
		}
		this.startTime = Date.now();
		console.log("Building map...");
		this.loadRegion(toLoad, 0, rx, ry);
	}

	loadRegion(toLoad, index, rx, ry) {
		if (index < toLoad.length) {
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
			this.mesh.geometry.computeVertexNormals();

			// adjust UVs
			for(let i = 0; i < this.mesh.geometry.faceVertexUvs[0].length; i++) {
				for(let t = 0; t < 3; t++) {
					this.mesh.geometry.faceVertexUvs[0][i][t].multiplyScalar(constants.SECTION_SIZE);
				}
			}
			util.updateColors(this.mesh);
		}
	}
}
