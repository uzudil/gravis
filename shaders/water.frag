uniform sampler2D texture_water;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
    // Texture loading
//    vec4 diffuseWater = texture2D( texture_water, vUv );
//    vec4 color = diffuseWater; // grass base
//    vec4 darkWater = vec4(.1, .1, 0.1, 0.2);
//
//    color = mix(
//        color,
//        darkWater,
//        vPosition.z
//    );
//
//    //gl_FragColor = color * lightColor;
//    gl_FragColor = color;

    vec2 cPos = -1.0 + 2.0 * gl_FragCoord.xy / resolution.xy;
    float cLength = length(cPos);

    vec2 uv = gl_FragCoord.xy/resolution.xy+(cPos/cLength)*cos(cLength*12.0-time*4.0)*0.03;
    vec3 col = texture2D(tex,uv).xyz;

    gl_FragColor = vec4(col,1.0);
}

