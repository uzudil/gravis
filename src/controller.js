import THREE from 'three';
import $ from 'jquery';
import * as constants from 'constants';
import * as util from 'util';

export class Controller {
	constructor(gravis) {
		this.gravis = gravis;

		$("#reject").click((event) => {
			this.gravis.overmap.newMap();
			event.stopPropagation();
			return true;
		});
		$("#accept").click((event) => {
			this.gravis.createMap();
			event.stopPropagation();
			return true;
		});
		$("#noise").change((event) => {
			this.gravis.overmap.islandShape = $("#noise").val();
			event.stopPropagation();
			return true;
		});

		//this.pitch = new THREE.Object3D();
		//this.pitch.position.z = 100;
		//this.pitch.position.y = -12 * constants.SECTION;
		//this.pitch.rotation.x = Math.PI / 4;
		//this.pitch.add(this.gravis.camera);
		//
		//this.roll = new THREE.Object3D();
		//this.roll.add(this.pitch);
		//
		//// yaw
		//this.player = new THREE.Object3D();
		//this.player.add(this.roll);
		//this.player.rotation.z = Math.PI / 4;
		//this.gravis.scene.add(this.player);
	}

	update(delta) {

	}
}