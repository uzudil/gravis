import THREE from 'three';
import $ from 'jquery';
import * as $$ from 'jquery-mousewheel';
import * as constants from 'constants';
import * as util from 'util';
import * as regionModel from 'region';

export class Controller {
	constructor(gravis) {
		this.gravis = gravis;
		this.fw = this.bw = this.left = this.right = false;
		this.direction = new THREE.Vector3(0, 0, 0);

		$("#reject").click((event) => {
			this.gravis.overmap.newMap();
			event.stopPropagation();
			return true;
		});
		$("#accept").click((event) => {
			this.gravis.overmap.saveRegions();
			this.load();
			event.stopPropagation();
			return true;
		});
		$("#load").click((event) => {
			this.load();
			event.stopPropagation();
			return true;
		});
		$("#noise").change((event) => {
			this.gravis.overmap.islandShape = $("#noise").val();
			event.stopPropagation();
			return true;
		});
		$("canvas").mousewheel((event) => {
			//console.log(event.deltaX, event.deltaY, event.deltaFactor);
			let s;
			if(event.deltaY > 0) s = this.gravis.regionEditor.obj.scale.x * 1.25;
			else s = this.gravis.regionEditor.obj.scale.x / 1.25;
			if(s < constants.EDITOR_SCALE) s = constants.EDITOR_SCALE;
			if(s > constants.EDITOR_SCALE * 10) s = constants.EDITOR_SCALE * 10;
			this.gravis.regionEditor.obj.scale.set(s, s, s);
		});
		$("canvas").mousemove((event) => {
			let mx = event.originalEvent.movementX;
			let my = event.originalEvent.movementY;
			this.gravis.regionEditor.obj.rotation.z += mx * 0.01;
		});
		$(document).keydown(( event ) => {
			switch ( event.keyCode ) {
				case 87: this.fw = true; break;
				case 83: this.bw = true; break;
				case 65: this.left = true; break;
				case 68: this.right = true; break;
			}
		});
		$(document).keyup(( event ) => {
			switch ( event.keyCode ) {
				case 87: this.fw = false; break;
				case 83: this.bw = false; break;
				case 65: this.left = false; break;
				case 68: this.right = false; break;
			}
		});
	}

	start() {
		// if a region exists, edit it, otherwise show the overmap
		regionModel.Region.load(0, 0, (region) => this.load(), () => this.overmap());
	}

	overmap() {
		this.gravis.overmap.show();
		this.gravis.overmap.edit();
		$("#overmap_buttons").show();
		$("#region_buttons").hide();
	}

	load() {
		this.gravis.overmap.hide();
		let rx = Math.floor(constants.WORLD_SIZE / constants.REGION_SIZE / 2);
		let ry = Math.floor(constants.WORLD_SIZE / constants.REGION_SIZE / 2);
		this.gravis.regionEditor.edit(rx, ry);
		$("#overmap_buttons").hide();
		$("#region_buttons").show();
	}

	update(delta) {
		if (this.fw) {
			this.direction.set(0, 1, 0);
		} else if (this.bw) {
			this.direction.set(0, -1, 0);
		} else if (this.right) {
			this.direction.set(1, 0, 0);
		} else if (this.left) {
			this.direction.set(-1, 0, 0);
		}

		if (this.fw || this.bw || this.left || this.right) {
			let speed = 100 * delta;
			this.gravis.regionEditor.obj.translateOnAxis(this.direction, speed);
		}
	}
}