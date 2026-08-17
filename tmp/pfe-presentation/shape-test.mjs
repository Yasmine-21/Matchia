import { Presentation, PresentationFile } from '@oai/artifact-tool';
const p=Presentation.create({slideSize:{width:1280,height:720}});const s=p.slides.add();s.background.fill='#FFFFFF';
s.shapes.add({geometry:'roundRect',position:{left:70,top:70,width:500,height:160},fill:'#EFF6FF',line:{style:'solid',fill:'#DCE5F2',width:1},borderRadius:'rounded-xl'});
s.shapes.add({geometry:'line',position:{left:90,top:260,width:800,height:0},line:{style:'solid',fill:'#2563EB',width:2,beginArrowType:'none',endArrowType:'triangle'}});
const a=s.shapes.add({geometry:'textbox',position:{left:90,top:90,width:400,height:100},fill:'none',line:{style:'solid',fill:'none',width:0}});a.text='Test';a.text.style={fontSize:38,color:'#111827',bold:true,alignment:'left',fontFace:'Aptos'};
const out=await PresentationFile.exportPptx(p);await out.save('D:/PFE M2/Platforme SaaS/tmp/pfe-presentation/shape-test.pptx');
