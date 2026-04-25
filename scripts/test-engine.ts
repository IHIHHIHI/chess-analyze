import { NodeEngine } from './engine';

async function main() {
  const engine = new NodeEngine();
  console.log('booting...');
  await engine.init();
  console.log('uci ready');
  const r = await engine.evaluate(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    14,
  );
  console.log('result:', JSON.stringify(r, null, 2).slice(0, 600));
  engine.terminate();
}
main().catch((e) => {
  console.error(e);
  process.exit(2);
});
