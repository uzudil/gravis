varying vec2 vUv;
varying vec3 vPosition;
attribute float road;
varying float vRoad;
void main( void ) {
    vUv = uv;
    vPosition = position;
    vRoad = road;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1);
}
