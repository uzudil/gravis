import THREE from 'three'

export const VERSION = 0.1;

export const DEV_MODE = location.hostname == "localhost";
export const ASPECT_RATIO = 320/200;
export const FAR_DIST = 100000;

export const AMBIENT_COLOR = new THREE.Color(0x999999);
export const DIR1_COLOR = new THREE.Color(0xffffff);
export const DIR2_COLOR = new THREE.Color(0xffe0cc);

export const MATERIAL = new THREE.MeshLambertMaterial({
	color: 0xffffff,
	side: THREE.DoubleSide,
	vertexColors: THREE.VertexColors,
		//FaceColors,
	//shading: THREE.SmoothShading
	//shading: THREE.FlatShading
	//overdraw: true
});

//export const WORLD_SIZE = 0xff;
export const WORLD_SIZE = 0xff;
