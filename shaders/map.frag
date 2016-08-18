uniform sampler2D texture_grass;
uniform sampler2D texture_rock;
uniform sampler2D texture_road;
varying vec2 vUv;
varying vec3 vPosition;
varying float vRoad;
void main() {
    // Texture loading
    vec4 diffuseGrass = texture2D( texture_grass, vUv );
    vec4 diffuseRock = texture2D( texture_rock, vUv );
    vec4 diffuseSnow = vec4(.8, .9, 1.0, 1.0);
    vec4 diffuseRoad = texture2D( texture_road, vUv );
    vec4 color = diffuseGrass; // grass base

    // road
    color = mix(
        color,
        diffuseRoad,
        max(min(vRoad, 1.0), 0.0)
    );
    // add rock
    color = mix(
        color,
        diffuseRock,
        max(min((vPosition.z - 4.0) / 4.0, 1.0), 0.0) // fade rock from 4-8+
    );
    // add snow
    color = mix(
        color,
        diffuseSnow,
        max(min((vPosition.z - 14.0) / 2.0, 1.0), 0.0) // fade snow from 14-16.0+
    );
    gl_FragColor = color;
}