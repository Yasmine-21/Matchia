import { Presentation, PresentationFile } from '@oai/artifact-tool';
const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const s = p.slides.add();
s.background.fill = '#FFFFFF';
const t = s.shapes.add({ geometry:'textbox', position:{left:72,top:72,width:500,height:100}, fill:'none', line:{style:'solid',fill:'none',width:0} });
t.text='Test';
t.text.style={fontSize:40,color:'#000000',bold:true};
const out = await PresentationFile.exportPptx(p);
await out.save('D:/PFE M2/Platforme SaaS/tmp/pfe-presentation/minimal.pptx');
