import fs from 'fs';
const path = 'src/assets/models/computer_terminal.glb';
const buffer = fs.readFileSync(path);
const dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
const magic = dv.getUint32(0, true);
const version = dv.getUint32(4, true);
const length = dv.getUint32(8, true);
if (magic !== 0x46546C67) {
  throw new Error('Not a GLB');
}
let offset = 12;
const chunks = [];
while (offset < length) {
  const chunkLength = dv.getUint32(offset, true);
  const chunkType = dv.getUint32(offset + 4, true);
  offset += 8;
  const chunkData = buffer.slice(offset, offset + chunkLength);
  chunks.push({ type: chunkType, data: chunkData });
  offset += chunkLength;
}
const CHUNK_JSON = 0x4E4F534A; // JSON
const jsonChunk = chunks.find((chunk) => chunk.type === CHUNK_JSON);
if (!jsonChunk) throw new Error('JSON chunk not found');
const jsonText = new TextDecoder().decode(jsonChunk.data);
const json = JSON.parse(jsonText);
console.log('Nodes:');
json.nodes.forEach((node, i) => {
  console.log(`#${i}`, node.name || '(no name)', 'mesh', node.mesh, 'children', node.children);
});
console.log('\nMeshes:');
json.meshes.forEach((mesh, i) => {
  console.log(`#${i}`, mesh.name || '(mesh)', 'primitives', mesh.primitives.length);
  mesh.primitives.forEach((prim, pi) => {
    const accessorIndex = prim.attributes.POSITION;
    const accessor = json.accessors[accessorIndex];
    console.log('  prim', pi, 'accessor', accessorIndex, 'min', accessor.min, 'max', accessor.max);
  });
});
