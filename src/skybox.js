import THREE from 'three';
import { updateColors } from 'util';

export class SkyBox {
	constructor(scene) {
		let loader = new THREE.ImageLoader();
		loader.load( '../images/skyboxsun25degtest.png', ( image ) => {
			var getSide = function (x, y) {

				var size = 1024;

				var canvas = document.createElement('canvas');
				canvas.width = size;
				canvas.height = size;

				var context = canvas.getContext('2d');
				context.drawImage(image, -x * size, -y * size);

				return canvas;

			};

			let canvases = [
				getSide( 2, 1 ),
				getSide( 0, 1 ),
				getSide( 1, 0 ),
				getSide( 1, 2 ),
				getSide( 1, 1 ),
				getSide( 3, 1 )
			];

			let materialArray = [];
			for (let i = 0; i < 6; i++){
				let tex = new THREE.Texture(canvases[i]);
				tex.format = THREE.RGBFormat;
				tex.needsUpdate = true;
				materialArray.push( new THREE.MeshBasicMaterial({
					map: tex,
					side: THREE.BackSide,
					depthWrite: false
				}));
			}

			this.skyBox = new THREE.Mesh(
				new THREE.BoxGeometry( 90000, 90000, 90000 ),
				new THREE.MeshFaceMaterial( materialArray )
			);
			this.skyBox.rotation.x = Math.PI/2;

			scene.add(this.skyBox);
		});
	}
}