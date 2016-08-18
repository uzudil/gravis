import THREE from 'three';
import $ from 'jquery';
import * as constants from 'constants';
import * as util from 'util';
import * as regionModel from 'region';
import * as sectionDef from 'section';
import { View } from 'view';

const WATER_Z = 1.5;
const WATER_COLOR = new THREE.Color(0.1, 0.3, 0.85);

const REGION_OFFSETS = [];
if(REGION_OFFSETS.length == 0) {
	for (let dx = -1; dx <= 1; dx++) {
		for (let dy = -1; dy <= 1; dy++) {
			REGION_OFFSETS.push([dx, dy]);
		}
	}
}

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
		this.size = constants.VERTEX_SIZE + 2 * constants.SECTION_SIZE;
		this.mesh = new THREE.Mesh(
			new THREE.PlaneBufferGeometry(this.size, this.size, this.size, this.size),
			new THREE.ShaderMaterial({
				uniforms: {
					texture_grass: {type: "t", value: gravis.tex.classicGrass1},
					texture_rock: {type: "t", value: gravis.tex.ground1},
					texture_road: {type: "t", value: gravis.tex.road2}
				},
				vertexShader: gravis.shaders.map[0],
				fragmentShader: gravis.shaders.map[1]
			})
		);

		// adjust UVs
		for(let i = 0; i < this.mesh.geometry.getAttribute("uv").array.length; i++) {
			this.mesh.geometry.getAttribute("uv").array[i] *= constants.SECTION_SIZE;
		}
		this.mesh.geometry.getAttribute("uv").needsUpdate = true;

		// a temporary geometry used for loading data
		// it's easier to adjust vertices here and then copy them to the buffergeo than to directly change it :-(
		this.tmp_geo = new THREE.PlaneGeometry(this.size, this.size, this.size, this.size);
		this.vertexGrid = {};
		for (let v of this.tmp_geo.vertices) {
			// map -1 to 0, 1 to constants.VERTEX_SIZE
			let xp = v.x + constants.VERTEX_SIZE / 2;
			let yp = v.y + constants.VERTEX_SIZE / 2;
			this.vertexGrid[xp + "," + yp] = v;
		}

		// custom attribute for how 'road' a vertex is
		this.road = new Float32Array( this.mesh.geometry.getAttribute("position").array.length );
		this.mesh.geometry.addAttribute( 'road', new THREE.BufferAttribute( this.road, 1 ) );

		this.water = new THREE.Mesh(
			new THREE.PlaneGeometry(this.size, this.size),
			new THREE.MeshBasicMaterial({color: WATER_COLOR, opacity: 0.25, transparent: true}));
		this.water.position.z = WATER_Z;
		//this.waterDir = 1;

		this.obj.add(this.mesh);
		this.obj.add(this.water);
	}

	edit(rx, ry) {
		$("#rx").text(rx);
		$("#ry").text(ry);
		console.log("Building map...");
		this.loadRegion(rx, ry);
	}

	loadRegion(rx, ry, index=0) {
		if (index < REGION_OFFSETS.length) {
			// load regions into the view
			let [dx, dy] = REGION_OFFSETS[index];
			if (rx + dx >= 0 && ry + dy >= 0 && rx + dx < constants.REGION_COUNT && ry + dy < constants.REGION_COUNT) {
				regionModel.Region.load(rx + dx, ry + dy, (region) => {
					this.view.display(region, dx + 1, dy + 1);
					this.loadRegion(rx, ry, index + 1);
				});
			}
		} else {
			// change vertices to the heights in the view
			this.view.finish((x, y, point) => {
				let vx = x - 1.5 * constants.VERTEX_SIZE;
				let vy = y - 1.5 * constants.VERTEX_SIZE;
				let v = this.vertexGrid[vx + "," + vy];
				if (v) {
					v.z = point.z;
					v.section = point.type;
					v.road = point.road;
					v.vx = vx;
					v.vy = vy;
				}
			});

			// copy the vertices into the buffergeometry
			this.mesh.geometry.getAttribute("position").copyVector3sArray(this.tmp_geo.vertices);
			this.mesh.geometry.getAttribute("position").needsUpdate = true;
			this.mesh.geometry.getAttribute("road").copyArray(this.tmp_geo.vertices.map(v => v.road));
			this.mesh.geometry.getAttribute("road").needsUpdate = true;
			this.mesh.geometry.computeVertexNormals();
			util.updateColors(this.mesh);
		}
	}
}
