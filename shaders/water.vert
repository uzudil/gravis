varying vec2 vUv;
varying vec3 vPosition;

uniform vec3 vTime;

void main( void ) {
    vUv = uv;
    vPosition = position;
    vPosition.z = sin(vTime.x) * cos(vPosition.x) * sin(vPosition.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1);

}
