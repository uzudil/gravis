import THREE from 'three';
import * as util from 'util';
import * as constants from 'constants';

const MODELS = {
	pine: "../models/pine.json",
	oak: "../models/oak.json",
	bush: "../models/bush.json",
	rock: "../models/rock.json",
};

export const TREES = [ "oak", "pine" ];

export class Models {
	constructor(onLoad) {
		this.onLoad = onLoad;
		this.models = {};
		util.startLoadingUI("ui_loading_models");

		if(MODELS.length == 0) {
			util.stopLoadingUI();
			this.onLoad(this);
		} else {
			for (let name in MODELS) {
				let model = new Model(name);
				model.load((m) => {
					console.log("Model loaded: " + model);
					this.models[model.name] = model;
					util.setLoadingUIProgress(Object.keys(this.models).length / MODELS.length);
					if (Object.keys(this.models).length == Object.keys(MODELS).length) {
						util.stopLoadingUI();
						this.onLoad(this);
					}
				});
			}
		}
	}
}

export class Model {
	constructor(name) {
		this.name = name;
		this.mesh = null;
		this.bbox = null;
	}

	load(onLoad) {
		var loader = new THREE.JSONLoader();
		loader.load(MODELS[this.name] + "?cb=" + window.cb, (geometry, materials) => {
			geometry.computeBoundingBox();
			var offset = geometry.boundingBox.center().negate();
			geometry.translate( offset.x, offset.y, 0 );

			geometry.rotateX(Math.PI/2);
			//geometry.rotateZ(-Math.PI/2);

			//let scale = 50;
			//geometry.scale(scale, scale, scale);
			this.mesh = new THREE.Mesh(geometry, constants.MATERIAL);
			this.bbox = new THREE.Box3().setFromObject(this.mesh);
			//this.w = scale * 2;
			//this.h = scale * 2;
			//this.d = scale * 2;
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
		return true;
	}
}
