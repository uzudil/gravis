import THREE from 'three';
import $ from 'jquery';
import * as $$ from 'jquery-mousewheel';
import * as constants from 'constants';
import * as util from 'util';

const EDGE_POS = constants.VERTEX_SIZE * 0.5 - constants.SECTION_SIZE * 5;
export class GameController {
	constructor(gravis) {
		this.gravis = gravis;
		this.fw = this.bw = this.left = this.right = false;
		this.direction = new THREE.Vector3(0, 0, 0);
		this.x = 8.5 * constants.VERTEX_SIZE;
		this.y = 3.5 * constants.VERTEX_SIZE;

		$("canvas").mousemove((event) => {
			let mx = event.originalEvent.movementX;
			let my = event.originalEvent.movementY;
			this.theta += mx * 0.01;
			this.gravis.yaw.rotation.z -= mx * 0.01;
			//this.gravis.pitch.rotation.x -= my * 0.01;
		});
		$(document).keydown(( event ) => {
			switch (event.keyCode) {
				case 87:
					this.fw = true;
					break;
				case 83:
					this.bw = true;
					break;
				case 65:
					this.left = true;
					break;
				case 68:
					this.right = true;
					break;
			}
		});
		$(document).keyup(( event ) => {
			//console.log(event.keyCode);
			switch (event.keyCode) {
				case 87:
					this.fw = false;
					break;
				case 83:
					this.bw = false;
					break;
				case 65:
					this.left = false;
					break;
				case 68:
					this.right = false;
					break;
			}
		});

	}

	start() {
		this.gravis.overmap.hide();
		this.gravis.viewer.drawAt(this.x, this.y);
	}

	update(delta) {
		this.direction.set(0, 0, 0);
		if (this.fw) this.direction.y = 1;
		if (this.bw) this.direction.y = -1;
		if (this.right) this.direction.x = 1;
		if (this.left) this.direction.x = -1;

		if (this.fw || this.bw || this.left || this.right) {
			let speed = 30 * delta;
			this.gravis.yaw.translateOnAxis(this.direction, speed);

			if(this.gravis.yaw.position.x < -EDGE_POS || this.gravis.yaw.position.y < -EDGE_POS ||
				this.gravis.yaw.position.x > EDGE_POS || this.gravis.yaw.position.y > EDGE_POS) {
				this.x += this.gravis.yaw.position.x;
				this.y += this.gravis.yaw.position.y;
				this.gravis.yaw.position.x = 0;
				this.gravis.yaw.position.y = 0;
				this.gravis.viewer.drawAt(this.x, this.y);
			}
		}
	}
}