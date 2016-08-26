varying vec2 vUv;
varying vec3 vPosition;

attribute float road;
attribute float beach;
attribute float secondTexture;

varying float vRoad;
varying float vBeach;
varying float vSecondTexture;
varying vec3 vNormal;
varying float key1Intensity;
varying float key2Intensity;
varying float key3Intensity;

void main( void ) {
    vUv = uv;
    vPosition = position;
    vRoad = road;
    vBeach = beach;
    vSecondTexture = secondTexture;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1);

    // send normal to fragment shader
    vNormal = normalMatrix * normal;

    // normal in world coords
    vec3 vNormal = normalize(vec3(modelMatrix * vec4(normal,0.0)));

    // outdoor lights
    vec3 key1Dir = normalize(vec3(0, 3, 3));
    key1Intensity = max(dot(vNormal, key1Dir), 0.0);

    vec3 key2Dir = normalize(vec3(3, 3, 0));
    key2Intensity = max(dot(vNormal, key2Dir), 0.0);

    vec3 key3Dir = normalize(vec3(3, 0, 3));
    key3Intensity = max(dot(vNormal, key3Dir), 0.0);
}
