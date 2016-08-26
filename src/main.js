import THREE from 'three';
import $ from 'jquery';
import * as constants from 'constants';
import * as model from 'model';
import * as util from 'util';
import Stats from 'stats.js';
import * as controller from 'controller';
import * as overmap from 'overmap';
import * as regioneditor from 'regioneditor';
import * as skybox from 'skybox';

class Gravis {
	constructor() {
		console.log(`Gravis (c) 2016 v${constants.VERSION}`);
		window.cb = "" + constants.VERSION;
		new model.Models((models) => {
			this.loadTextures(() => {
				this.loadShaders(() => {
					this.init(models);
					this.startGame();
					this.animate();
				});
			});
		});
	}

	loadShaders(onSuccess) {
		this.shaders = {};

		let downloadedCount = 0;
		for(let shader of constants.SHADERS) {
			// what are we loading?
			let m = shader.match(/^.*\/(.*)\.(vert|frag)$/);
			let name = m[1];
			let type = m[2] === 'vert' ? 0 : 1;
			if(!this.shaders[name]) this.shaders[name] = ["", ""];

			console.log("Fetching " + shader);
			fetch(shader).then((response) => response.text()).then((responseText) => {
				console.log("Downloaded " + shader);
				 this.shaders[name][type] = responseText;
				if (++downloadedCount === constants.SHADERS.length) {
					console.log("All shaders downloaded: ", this.shaders);
					onSuccess();
				}
			});
		}
	}

	loadTextures(onSuccess) {
		this.tex = {};
		let count = Object.keys(constants.TEX).length;
		let textureLoader = new THREE.TextureLoader();
		for(let k in constants.TEX) {
			let url = constants.TEX[k];
			console.log("Loading: " + url);
			textureLoader.load(url, (texture) => {
				texture.wrapS = THREE.RepeatWrapping;
				texture.wrapT = THREE.RepeatWrapping;

				this.tex[k] = texture;
				console.log(Math.round(Object.keys(this.tex).length / count * 100) + " - Finished loading: " + url);
				if(Object.keys(this.tex).length === count) {
					onSuccess();
				}
			}, (xhr) => {
				console.log( ((Object.keys(this.tex).length / count) * 100 + (xhr.loaded / xhr.total * 10)) + '% loaded' );
			}, (xhr) => {
				console.log("Error for url:" + url, xhr);
			});
		}
	}

	init(models) {
		this.height = window.innerHeight;
		this.width = this.height * constants.ASPECT_RATIO;

		window.models = this.models = models;
		this.camera = new THREE.PerspectiveCamera( 45, constants.ASPECT_RATIO, 1, constants.FAR_DIST );
		//let orthoDiv = this.width / (1 * constants.REGION_SIZE * constants.SECTION_SIZE);
		//this.camera = new THREE.OrthographicCamera( this.width / -orthoDiv, this.width / orthoDiv, this.height / orthoDiv, this.height / -orthoDiv, 1, constants.FAR_DIST );

		this.scene = new THREE.Scene();

		this.renderer = new THREE.WebGLRenderer();

		this.renderer.setSize( this.width, this.height );

		if(constants.DEV_MODE) {
			this.statsFPS = new Stats();
			this.statsFPS.setMode(0); // 0: fps, 1: ms, 2: mb
			this.statsFPS.domElement.style.position = 'absolute';
			this.statsFPS.domElement.style.right = '0px';
			this.statsFPS.domElement.style.top = '0px';
			document.body.appendChild(this.statsFPS.domElement);

			this.statsMB = new Stats();
			this.statsMB.setMode(2); // 0: fps, 1: ms, 2: mb
			this.statsMB.domElement.style.position = 'absolute';
			this.statsMB.domElement.style.right = '0px';
			this.statsMB.domElement.style.top = '50px';
			document.body.appendChild(this.statsMB.domElement);
		}

		this.prevTime = 0;

		this.scene.add(new skybox.SkyBox().skyBox);

		$("body").append( this.renderer.domElement );
		$("canvas").click((event) => {
			var element = event.target;
			element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
			element.requestPointerLock();
		});
	}

	startGame() {
		console.log("game starting");

		//this.scene.fog = new THREE.Fog(0, 1, 1000);

		// lights
		this.ambientLight = new THREE.AmbientLight( constants.AMBIENT_COLOR.getHex() );
		this.ambientLight.intensity = .1;
		this.scene.add(this.ambientLight);

		this.dirLight1 = new THREE.DirectionalLight( 0xffffbb, 1 );
		this.dirLight1.position.set( 1, 1, 1 );
		this.scene.add( this.dirLight1 );

		//this.dirLight1 = new THREE.DirectionalLight( constants.DIR1_COLOR.getHex(), 0.9 );
		//this.dirLight1.position.set( 1, 1, 1 );
		//this.scene.add( this.dirLight1 );

		this.dirLight2 = new THREE.DirectionalLight( constants.DIR2_COLOR.getHex(), 0.3 );
		this.dirLight2.position.set(1, -1, .8 );
		this.scene.add( this.dirLight2 );

		this.controller = new controller.Controller(this);
		this.overmap = new overmap.OverMap(this);
		this.regionEditor = new regioneditor.RegionEditor(this);

		//this.camera.rotation.set( 0, 0, 0 );
		this.camera.position.set(100, 100, 100);
		this.camera.lookAt(constants.ORIGIN);

		this.regionEditor.obj.rotation.set(-Math.PI / 2, 0, 0);
		//this.obj.rotation.set(-Math.PI / 4, 0, Math.PI / 4);
		//this.obj.position.z = -500;

		this.controller.start();

		console.log("started");
	}

	animate() {
		if(constants.DEV_MODE) {
			this.statsFPS.begin();
			this.statsMB.begin();
		}

		var time = Date.now();
		var delta = ( time - this.prevTime ) / 1000;
		this.prevTime = time;

		this.regionEditor.update(time, delta);

		this.controller.update(delta);
		this.renderer.render(this.scene, this.camera);

		if(constants.DEV_MODE) {
			this.statsFPS.end();
			this.statsMB.end();
		}

		requestAnimationFrame(util.bind(this, this.animate));
	}
}

$(document).ready(function() {
	window.eniz = new Gravis();
});
