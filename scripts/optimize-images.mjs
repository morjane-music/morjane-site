import path from "node:path";
import sharp from "sharp";

const root = process.cwd();

const jobs = [
  { input: "assets/images/hero.jpg", outputs: ["webp", "avif"] },
  { input: "assets/images/scene.jpg", outputs: ["webp", "avif"] },
  { input: "assets/images/yeux.jpg", outputs: ["webp", "avif"] },
  { input: "assets/images/guitare.jpg", outputs: ["webp", "avif"] },
  { input: "assets/images/atelier/atelier-bg-fissure.png", outputs: ["webp", "avif"] },
  { input: "assets/images/epk/epk-live-01.jpg", outputs: ["webp", "avif"] },
];

async function run() {
  for (const job of jobs) {
    const fullInput = path.join(root, job.input);
    const parsed = path.parse(fullInput);

    for (const format of job.outputs) {
      const out = path.join(parsed.dir, `${parsed.name}.${format}`);
      const pipeline = sharp(fullInput);
      if (format === "webp") {
        await pipeline.webp({ quality: 72 }).toFile(out);
      } else if (format === "avif") {
        await pipeline.avif({ quality: 50 }).toFile(out);
      }
      console.log(`generated ${path.relative(root, out)}`);
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

