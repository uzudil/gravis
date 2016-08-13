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

export const IMGS = {
	grass1: "/images/textures/seamless-pixels.blogspot.com/Grass 02 seamless.jpg",
	clay1: "/images/textures/seamless-pixels.blogspot.com/Seamless clay cracks.jpg",
	ground1: "/images/textures/seamless-pixels.blogspot.com/Seamless ground sand dirt crack texture.jpg",
	ground2: "/images/textures/seamless-pixels.blogspot.com/Seamless ground sand texture (6).jpg",
	classicGrass1: "/images/textures/seamless-pixels.blogspot.com/Tileable classic grass and dirt texture.jpg",
	classicGrass2: "/images/textures/seamless-pixels.blogspot.com/Tileable classic patchy grass 2 texture.jpg",
	classicGrass3: "/images/textures/seamless-pixels.blogspot.com/Tileable classic patchy grass texture.jpg",
	water1: "/images/textures/seamless-pixels.blogspot.com/Tileable classic water texture.jpg"
};

export const SHADERS = {
	map: [ "/shaders/map.vert", "/shaders/map.frag" ]
};
