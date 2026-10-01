# ParticleField

Many particles in disordered motion — gas molecules, droplets, sparks, data in transit. Every position
is a pure function of (index, frame), so the six capture tabs of a render all paint the same thing.
Never seed motion with `Math.random`; see `lib/noise.js`.

`heat` makes a zone visibly busier, which is the physics: mean molecular speed goes as √T, so the spot
under the chip must look faster than the cold edges. `path` (a closed polyline) adds net transport on
top of the jiggle — a convection cell, or a vapor chamber's evaporate → spread → condense → wick-return
loop. `coolAt` marks the stretch of that loop where the particles read as liquid.

```jsx
<ParticleField x={920} y={346} w={840} h={84} frame={f} count={90} seed={3}
  speed={1.1} wander={16} r={5}
  path={CHAMBER_LOOP} coolAt={[0.42, 0.88]}
  heat={{ x: 1340, y: 392, r: 260, boost: 2.4 }} />
```

Rules: energy is shown with **opacity and radius**, phase with the two palette colors — never
interpolate the palette into a new hue · keep `count` under ~120, past that it reads as texture, not as
particles · the hot zone must sit where the script says the heat is · give the field at least 60 f on
screen; a 1-second glimpse of disorder reads as noise · pair it with a still diagram (the wick, the
walls) so the motion has something to be inside.
