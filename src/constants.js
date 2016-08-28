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
	vertexColors: THREE.VertexColors
});

export const WORLD_SIZE = 0x100;
export const REGION_SIZE = 0x10;
export const SECTION_SIZE = 0x10;
export const VERTEX_SIZE = REGION_SIZE * SECTION_SIZE;
export const REGION_COUNT = WORLD_SIZE / REGION_SIZE;

export const ORIGIN = new THREE.Vector3(0, 0, 0);

export const REGION_OFFSETS = [];
if(REGION_OFFSETS.length == 0) {
	for (let dx = -1; dx <= 1; dx++) {
		for (let dy = -1; dy <= 1; dy++) {
			REGION_OFFSETS.push([dx, dy]);
		}
	}
}

export const TEX = {
	grass1: "../images/textures/seamless-pixels.blogspot.com/Grass 02 seamless.jpg",
	clay1: "../images/textures/seamless-pixels.blogspot.com/Seamless clay cracks.jpg",
	ground1: "../images/textures/seamless-pixels.blogspot.com/Seamless ground sand dirt crack texture.jpg",
	ground2: "../images/textures/seamless-pixels.blogspot.com/Seamless ground sand texture (6).jpg",
	classicGrass1: "../images/textures/seamless-pixels.blogspot.com/Tileable classic grass and dirt texture.jpg",
	classicGrass2: "../images/textures/seamless-pixels.blogspot.com/Tileable classic patchy grass 2 texture.jpg",
	classicGrass3: "../images/textures/seamless-pixels.blogspot.com/Tileable classic patchy grass texture.jpg",
	water1: "../images/textures/seamless-pixels.blogspot.com/Tileable classic water texture.jpg",
	road1: "../images/textures/texturelib.com/brick_pavement_0068_01_tiled_s.jpg",
	road2: "../images/textures/texturelib.com/brick_pavement_0107_02_tiled_s.jpg",
	road3: "../images/textures/texturelib.com/brick_stone_wall_0009_02_tiled_s.jpg",
	waterNormals: "../images/waternormals.jpg",
	sand1: "../images/textures/seamless-pixels.blogspot.com/Seamless beach sand.jpg"
};

export const SHADERS = [
	"../shaders/map.vert", "../shaders/map.frag",
	"../shaders/water.vert", "../shaders/water.frag"
];
