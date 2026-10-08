import { useEffect, useRef } from 'react';

// The table background: a slow, painterly swirl. A value-noise field is twisted around the centre like a
// vortex, then domain-warped twice so it folds into marbled brush strokes. The result is posterized into
// three palette bands (c1 highlight, c2 body, c3 shadow) with soft wet edges, at a deliberately low
// resolution so it reads as pixel paint. Colours ease toward the target palette.
const FRAG = `
precision mediump float;
uniform vec2 res; uniform float time; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = turn * p * 2.03 + 11.7; a *= 0.5; }
  return v;
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);
  // vortex: points nearer the centre turn further, and the whole table drifts slowly
  float r = length(uv);
  float twist = 1.7 / (0.55 + 1.6 * r) + time * 0.045;
  float cs = cos(twist), sn = sin(twist);
  vec2 p = mat2(cs, -sn, sn, cs) * uv * 2.6;
  // two rounds of domain warping fold the field into marbled strokes
  vec2 q = vec2(fbm(p + vec2(0.0, time * 0.07)), fbm(p + vec2(4.1, 1.7) - time * 0.05));
  vec2 w = vec2(fbm(p + 2.8 * q + vec2(1.3, 8.9) + time * 0.09), fbm(p + 2.8 * q + vec2(7.4, 2.2)));
  float f = fbm(p + 3.2 * w);
  // posterize into wet bands
  float body = smoothstep(0.36, 0.44, f);
  float high = smoothstep(0.58, 0.64, f + 0.12 * w.x);
  vec3 col = mix(c3, c2, body);
  col = mix(col, c1, high);
  // brush sheen along the fold lines, and a gentle vignette
  float sheen = smoothstep(0.02, 0.0, abs(f - 0.44)) + smoothstep(0.015, 0.0, abs(f - 0.6));
  col += 0.10 * sheen * vec3(1.0, 0.97, 0.9);
  col *= 1.0 - 0.28 * smoothstep(0.45, 1.1, r);
  gl_FragColor = vec4(col, 1.0);
}`;
const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

export type Palette = [string, string, string];

function hex(h: string): [number, number, number] {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default function Swirl({ palette, speed = 1 }: { palette: Palette; speed?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const target = useRef(palette.map(hex));
  const pace = useRef(speed);
  target.current = palette.map(hex);
  pace.current = speed;
  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) { canvas.style.background = `linear-gradient(160deg, ${palette[1]}, ${palette[2]})`; return; }
    const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'res'), uTime = gl.getUniformLocation(prog, 'time');
    const uCol = ['c1', 'c2', 'c3'].map((n) => gl.getUniformLocation(prog, n));
    const cur = target.current.map((c) => [...c]);
    let raf = 0; let t = 40; let last = performance.now(); let paceNow = pace.current;
    const reduced = document.documentElement.dataset.motion === 'reduced';
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden || now - last < 33) return; // a slow swirl needs ~30fps at most
      const dt = Math.min(0.08, (now - last) / 1000); last = now;
      paceNow += (pace.current - paceNow) * Math.min(1, dt * 2);
      t += dt * (reduced ? 0.12 : 1) * paceNow;
      // render at roughly 1/4 resolution so the paint looks pixelated
      const scale = Math.max(3, canvas.clientWidth / 360);
      const w = Math.max(1, Math.floor(canvas.clientWidth / scale)), h = Math.max(1, Math.floor(canvas.clientHeight / scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) cur[i][k] += (target.current[i][k] - cur[i][k]) * Math.min(1, dt * 2.5);
      gl.uniform2f(uRes, w, h); gl.uniform1f(uTime, t);
      for (let i = 0; i < 3; i++) gl.uniform3fv(uCol[i], cur[i]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <canvas ref={ref} className="swirl" />;
}
