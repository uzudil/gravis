import THREE from 'three';
import * as water from 'WaterShader';
import $ from 'jquery';
import * as constants from 'constants';
import * as util from 'util';
import * as regionModel from 'region';
import * as sectionDef from 'section';
import * as region_cache from 'region_cache';
import * as seedrandom from 'seedrandom';
import { TREES } from 'model';

const WATER_Z = 1.5;

export class Game {
	constructor(gravis) {
		this.gravis = gravis;
		this.regionCache = new region_cache.RegionCache();

		this.obj = new THREE.Object3D();
		this.gravis.scene.add(this.obj);

		this.size = constants.VERTEX_SIZE;
		this.mesh = new THREE.Mesh(
			new THREE.PlaneBufferGeometry(this.size, this.size, this.size, this.size),
			new THREE.ShaderMaterial({
				uniforms: {
					texture_grass: {type: "t", value: gravis.tex.classicGrass1},
					texture_grass2: {type: "t", value: gravis.tex.classicGrass2},
					texture_rock: {type: "t", value: gravis.tex.ground1},
					texture_road: {type: "t", value: gravis.tex.ground2},
					texture_sand: {type: "t", value: gravis.tex.sand1}
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

		this.obj.add(this.mesh);

		this.staticModels = new THREE.Object3D();
		this.obj.add(this.staticModels);

		// custom attribute for how 'road' a vertex is
		this.road = new Float32Array( this.mesh.geometry.getAttribute("position").array.length );
		this.mesh.geometry.addAttribute( 'road', new THREE.BufferAttribute( this.road, 1 ) );
		this.beach = new Float32Array( this.mesh.geometry.getAttribute("position").array.length );
		this.mesh.geometry.addAttribute( 'beach', new THREE.BufferAttribute( this.beach, 1 ) );
		this.secondTexture = new Float32Array( this.mesh.geometry.getAttribute("position").array.length );
		this.mesh.geometry.addAttribute( 'secondTexture', new THREE.BufferAttribute( this.secondTexture, 1 ) );

		this.water = new THREE.Water( this.gravis.renderer, this.gravis.camera, this.gravis.scene, {
			textureWidth: 512,
			textureHeight: 512,
			waterNormals: this.gravis.tex.waterNormals,
			alpha: 	0.5,
			sunDirection: this.gravis.dirLight1.position.clone().normalize(),
			// sunDirection: light.position.clone().normalize(),
			sunColor: 0xffffff,
			waterColor: 0x88eeff,
			//waterColor: 0x001e0f,
			distortionScale: 20.0,
		} );

		this.mirrorMesh = new THREE.Mesh(
			new THREE.PlaneBufferGeometry( this.size, this.size ),
			this.water.material
		);

		this.mirrorMesh.add( this.water );
		this.mirrorMesh.position.z = WATER_Z;
		this.obj.add( this.mirrorMesh );
	}

	getCameraZ() {
		return 35;
	}

	update(time, delta) {
		this.water.material.uniforms.time.value += 1.0 / 60.0;
		this.water.render();
	}

	drawAt(x, y) {
		let regionX = (x / constants.VERTEX_SIZE)|0;
		let regionY = (y / constants.VERTEX_SIZE)|0;
		// load surrounding regions
		this.regionCache.load(regionX, regionY, () => {
			while(this.staticModels.children.length > 0) {
				this.staticModels.remove(this.staticModels.children[0]);
			}
			this.displayAt(x, y);
		});
	}

	displayAt(x, y) {
		let px, py, rx, ry;
		for(let dx = 0; dx < constants.VERTEX_SIZE; dx++) {
			for(let dy = 0; dy < constants.VERTEX_SIZE; dy++) {
				px = x - constants.VERTEX_SIZE / 2 + dx;
				rx = (px / constants.VERTEX_SIZE)|0;
				if(rx < 0) rx += constants.REGION_COUNT;
				if(rx > constants.REGION_COUNT - 1) rx -= constants.REGION_COUNT;

				py = y - constants.VERTEX_SIZE / 2 + dy;
				ry = (py / constants.VERTEX_SIZE)|0;
				if(ry < 0) ry += constants.REGION_COUNT;
				if(ry > constants.REGION_COUNT - 1) ry -= constants.REGION_COUNT;

				let p = this.regionCache.get(rx, ry, (px % constants.VERTEX_SIZE)|0, (py % constants.VERTEX_SIZE)|0);
				//if((dx == 0 && dy == 0) || (dx == 0 && dy == constants.VERTEX_SIZE - 1) ||
				//	(dx == constants.VERTEX_SIZE - 1 && dy == 0) || (dx == constants.VERTEX_SIZE - 1 && dy == constants.VERTEX_SIZE - 1)) {
				//	console.log("pos: " + dx + "," + dy + " point: ", p);
				//}
				this.copyToVertex(dx, dy, p, (px)|0, (py)|0);
			}
		}
		this.initAttributes();
	}

	copyToVertex(vx, vy, point, absX, absY) {
		let v = this.vertexGrid[vx + "," + vy];
		if (v) {
			v.z = point.z;
			v.section = point.type;
			v.road = point.road;
			v.beach = point.beach;
			v.secondTexture = point.secondTexture;
			v.vx = vx;
			v.vy = vy;
		}

		let rnd = new Math.seedrandom("" + absX + "," + absY);
		if (point.type == sectionDef.SECTION_BY_NAME['forest']) {
			if(absX % 6 == 0 && absY % 6 == 0 && rnd.quick() > 0.25) {
				let obj = this.getRandomTreeModel(rnd).createObject();
				obj.position.x = vx - constants.VERTEX_SIZE / 2 + rnd.quick() * 4 - 2;
				obj.position.y = vy - constants.VERTEX_SIZE / 2 + rnd.quick() * 4 - 2;
				let zScale = rnd.quick() * 0.5 - 0.25 + 1.0;
				let scale = rnd.quick() * 0.4 - 0.2 + 1.0;
				obj.position.z = 12 * zScale / 2 + 3;
				obj.scale.set(scale, scale, zScale);
				obj.rotation.x = (rnd.quick() * 0.1 - 0.05) * Math.PI;
				obj.rotation.y = (rnd.quick() * 0.1 - 0.05) * Math.PI;
				this.staticModels.add(obj);
			} else if(absX % 4 == 0 && absY % 4 == 0 && rnd.quick() > 0.97) {
				let obj = this.gravis.models.models.rock.createObject();
				obj.position.x = vx - constants.VERTEX_SIZE / 2 + rnd.quick() * 4 - 2;
				obj.position.y = vy - constants.VERTEX_SIZE / 2 + rnd.quick() * 4 - 2;
				obj.position.z = 1 + 3;
				obj.rotation.z = (rnd.quick() * 0.5 - 0.25) * Math.PI;
				let scale = rnd.quick() * 0.4 - 0.2 + 1.0;
				obj.scale.set(scale, scale, 1);
				this.staticModels.add(obj);
			}
		}
	}

	getRandomTreeModel(rnd) {
		return this.gravis.models.models[TREES[(TREES.length * rnd.quick())|0]];
	}

	initAttributes() {
		// copy the vertices into the buffergeometry
		this.mesh.geometry.getAttribute("position").copyVector3sArray(this.tmp_geo.vertices);
		this.mesh.geometry.getAttribute("position").needsUpdate = true;
		this.mesh.geometry.getAttribute("road").copyArray(this.tmp_geo.vertices.map(v => v.road));
		this.mesh.geometry.getAttribute("road").needsUpdate = true;
		this.mesh.geometry.getAttribute("beach").copyArray(this.tmp_geo.vertices.map(v => v.beach));
		this.mesh.geometry.getAttribute("beach").needsUpdate = true;
		this.mesh.geometry.getAttribute("secondTexture").copyArray(this.tmp_geo.vertices.map(v => v.secondTexture));
		this.mesh.geometry.getAttribute("secondTexture").needsUpdate = true;
		this.mesh.geometry.computeVertexNormals();
		util.updateColors(this.mesh);
	}
}