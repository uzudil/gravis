import THREE from 'three';
import * as util from 'util';
import * as constants from 'constants';

/*
 To use colors, use the "vertex paint" feature of blender.
 Then, export with vertex colors on (no materials needed.)
 */
const MODELS = [
	// "modelA", "modelB", "modelC", ... etc
];

export class Models {
	constructor(onLoad) {
		this.onLoad = onLoad;
		this.models = {};
		util.startLoadingUI("ui_loading_models");

		if(MODELS.length == 0) {
			util.stopLoadingUI();
			this.onLoad(this);
		} else {
			for (let name of MODELS) {
				let model = new Model(name, true);
				model.load((m) => {
					console.log("Model loaded: " + model);
					this.models[model.name] = model;
					util.setLoadingUIProgress(Object.keys(this.models).length / MODELS.length);
					if (Object.keys(this.models).length == MODELS.length) {
						util.stopLoadingUI();
						this.onLoad(this);
					}
				});
			}
		}
	}
}

export class Model {
	constructor(name, canCompress) {
		this.name = name;
		this.mesh = null;
		this.bbox = null;
		this.canCompress = canCompress;
	}

	load(onLoad) {
		var loader = new THREE.JSONLoader();
		loader.load("models/" + this.name + ".json?cb=" + window.cb, (geometry, materials) => {

			// compress the model a bit by removing stuff we don't need
			util.compressGeo(geometry);

			if(this.name == "control") {
				for (let face of geometry.faces) {
					face["original_color"] = face.color.getHex();
				}
			}

			geometry.computeBoundingBox();
			var offset = geometry.boundingBox.center().negate();
			geometry.translate( offset.x, offset.y, 0 );

			geometry.rotateX(Math.PI/2);
			geometry.rotateZ(-Math.PI/2);

			let scale = 50;
			geometry.scale(scale, scale, scale);
			this.mesh = new THREE.Mesh(geometry, constants.MATERIAL);
			this.bbox = new THREE.Box3().setFromObject(this.mesh);
			this.w = scale * 2;
			this.h = scale * 2;
			this.d = scale * 2;
			console.log("" + this.name + " size=" + this.w + "," + this.h + "," + this.d);
			onLoad(this);
		});
	}

	getBoundingBox() {
		return this.bbox;
	}

	createObject() {
		var m = this.mesh.clone();
		m["model"] = this;
		return m;
	}

	hasBB() {
		return !this.canCompress;
	}
}
