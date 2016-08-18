uniform sampler2D texture_grass;
uniform sampler2D texture_rock;
uniform sampler2D texture_road;

varying vec2 vUv;
varying vec3 vPosition;
varying float vRoad;
varying vec3 vNormal;
varying float key1Intensity;
varying float key2Intensity;
varying float key3Intensity;

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


    // outdoor lights
    vec4 ambientColor = vec4(0.03, 0.03, 0.03, 1.0);
    vec4 colorKey1 = vec4(1.0, 1.0, 1.0, 1.0);
    float powerKey1 = 0.8;
    vec4 colorKey2 = vec4(1.0, 1.0, 1.0, 1.0);
    float powerKey2 = 0.4;
    vec4 colorKey3 = vec4(1.0, 1.0, 1.0, 1.0);
    float powerKey3 = 1.0;
    float weightedPower = (powerKey1 + powerKey2 + powerKey3) / 3.0;

    vec4 lightColor = colorKey1 * key1Intensity * powerKey1 * weightedPower;
    lightColor += colorKey2 * key2Intensity * powerKey2 * weightedPower;
    lightColor += colorKey3 * key3Intensity * powerKey3 * weightedPower;
    lightColor = max(lightColor, ambientColor);

    gl_FragColor = color * lightColor;
}