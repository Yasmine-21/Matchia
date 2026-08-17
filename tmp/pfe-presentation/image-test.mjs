import fs from 'node:fs/promises';
import { Presentation, PresentationFile } from '@oai/artifact-tool';
const file = 'D:/PFE M2/Platforme SaaS/tmp/matchia-home.png';
const b = await fs.readFile(file);
const p = Presentation.create({ slideSize:{width:1280,height:720} });
const s = p.slides.add();
s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt:'test',fit:'contain',position:{left:70,top:70,width:800,height:450}});
const out=await PresentationFile.exportPptx(p); await out.save('D:/PFE M2/Platforme SaaS/tmp/pfe-presentation/image-test.pptx');
