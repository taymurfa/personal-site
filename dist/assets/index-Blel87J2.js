import{r as e,a as ce,j as t,b as H}from"./react-three-BMIN_aMC.js";import{aq as he,H as ne,X as ae,ab as pe,ao as _,c as D,Q as ie,ar as ge,m as xe}from"./three-CldemLSC.js";function ve({isHighlighted:l=!1,width:i=.8,height:g=.6,offset:n=.012,bootSignal:a=null}){const c=e.useRef(null),f=e.useRef(0),d=e.useRef(0),r=e.useRef(0),[p,m]=e.useState(0),S=e.useRef(!1),w=e.useMemo(()=>["C:\\> DIR",""," Volume in drive C is SYSTEM"," Volume Serial Number is 1A2B-3C4D",""," Directory of C:\\DOS","","COMMAND  COM     47,845  01-15-1988  12:00p","CONFIG   SYS        128  03-22-1989   3:14p","AUTOEXEC BAT         64  03-22-1989   3:14p","KERNEL   SYS     33,430  01-15-1988  12:00p","","        4 File(s)     81,467 bytes","                  512,000 bytes free","","C:\\> _"].join(`
`),[]),x=e.useMemo(()=>w.length,[w]),v=e.useMemo(()=>w.split(`
`),[w]),R=e.useMemo(()=>{const h=document.createElement("canvas");h.width=1024,h.height=768;const y=h.getContext("2d");y.textBaseline="top";const o=new he(h);return o.minFilter=ne,o.magFilter=ne,o.wrapS=ae,o.wrapT=ae,{canvas:h,ctx:y,texture:o}},[]),A=e.useCallback(h=>{const{canvas:y,ctx:o,texture:B}=R,O=35;o.fillStyle="#000000",o.fillRect(0,0,y.width,y.height),o.fillStyle="#00ff00",o.font='bold 31px "Courier New", monospace';const s=v.reduce((P,E)=>Math.max(P,o.measureText(E).width),0),z=v.length*O,F=Math.max(16,Math.floor((y.width-s)/2)-36),b=Math.max(24,Math.floor((y.height-z)/2));let M=h,j=0,I=0;if(M<=0&&(j=0,I=0),v.forEach((P,E)=>{if(M<=0)return;const L=Math.min(P.length,M),C=P.slice(0,L);o.fillText(C,F,b+E*O),M-=L,M>0?(M-=1,j=E+1,I=0):(j=E,I=L)}),h<x){const P=Math.min(j,v.length-1),E=v[P]??"",L=o.measureText(E.slice(0,I)).width,C=F+L,q=b+P*O;o.fillRect(C,q+24+4,16,4)}B.needsUpdate=!0},[R,v,x]),G=e.useMemo(()=>({uniforms:{tDiffuse:{value:R.texture},time:{value:0},flickerIntensity:{value:.03},scanlineIntensity:{value:.15},brightness:{value:1.2},powerOn:{value:0}},vertexShader:`
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,fragmentShader:`
				uniform sampler2D tDiffuse;
				uniform float time;
				uniform float flickerIntensity;
				uniform float scanlineIntensity;
				uniform float brightness;
				uniform float powerOn;
				varying vec2 vUv;

				// Random function for flicker
				float random(vec2 st) {
					return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
				}

				void main() {
					float boot = clamp(powerOn, 0.0, 1.0);
					vec2 uv = vUv;
					vec2 centered = uv - 0.5;

					// Simple horizontal expansion animation
					float horizontalPhase = smoothstep(0.0, 0.4, boot);

					// Slight CRT curvature
					float dist = length(centered);
					vec2 warpedUv = centered * (1.0 + 0.08 * dist * dist) + 0.5;

					vec4 sampled = texture2D(tDiffuse, clamp(warpedUv, 0.001, 0.999));
					vec3 phosphor = sampled.rgb;

					// Bright horizontal bar at the beginning
					float horizFlash = exp(-pow(centered.y * 80.0, 2.0)) * (1.0 - horizontalPhase);
					vec3 beamColor = vec3(0.45, 1.0, 0.52) * horizFlash * 1.5;
					float beamGate = 1.0 - smoothstep(0.4, 0.7, boot);

					// Start with beam, fade to phosphor content
					float imageReveal = smoothstep(0.3, 0.8, boot);
					vec3 color = mix(beamColor * 0.6, phosphor, imageReveal);
					color += beamColor * beamGate;

					// Scanlines & subtle flicker
					float scanline = sin(warpedUv.y * 384.0 * 2.1) * scanlineIntensity;
					color -= scanline;
					float flicker = random(vec2(time * 0.1, 0.0)) * flickerIntensity;
					color *= (1.0 - flicker);

					// Subtle vignette falloff
					float vignette = smoothstep(0.85, 0.2, dist);
					color *= vignette;

					// Global fade-in
					float globalFade = smoothstep(0.0, 0.8, boot);
					color *= globalFade;

					// Brightness & green tint
					color *= brightness;
					color.g *= 1.1;

					gl_FragColor = vec4(color, sampled.a);
				}
			`}),[R.texture]),W=e.useCallback(h=>{h!==r.current&&(r.current=h,m(h))},[]);e.useEffect(()=>{A(p)},[p,A]),ce(({clock:h},y)=>{if(!c.current)return;const o=c.current;o.uniforms.time.value=h.getElapsedTime();const B=l?1.5:1.2;if(o.uniforms.brightness.value=pe.lerp(o.uniforms.brightness.value,B,.1),!S.current){f.current=0,o.uniforms.powerOn.value=0;return}if(f.current<1)f.current=Math.min(1,f.current+y/2.2),o.uniforms.powerOn.value=f.current,f.current>=1&&(d.current=-.75);else{o.uniforms.powerOn.value=f.current,d.current+=y;const O=Math.max(d.current,0),z=Math.min(x,Math.floor(O*52));z>r.current&&W(z)}});const k=e.useCallback(()=>{f.current=0,d.current=0,r.current=0,m(0),c.current&&(c.current.uniforms.powerOn.value=0,c.current.uniforms.time.value=0)},[]);return e.useEffect(()=>{k(),S.current=!1},[k]),e.useEffect(()=>{a!=null&&(k(),S.current=!0)},[a,k]),t.jsxs("mesh",{position:[0,0,n],children:[t.jsx("planeGeometry",{args:[i,g]}),t.jsx("shaderMaterial",{ref:c,attach:"material",...G})]})}function ye({onScreenClick:l,deskTopY:i}){const[g,n]=e.useState(!1),{scene:a}=H("/assets/models/apple_ii_computer.glb"),c=e.useRef(null),[f,d]=e.useState(0),[r,p]=e.useState([0,0,.5]),[m,S]=e.useState([0,0,.5]),[w,x]=e.useState([0,0,0]),[v,R]=e.useState([.4,.8]),[A,G]=e.useState(.1),[W,k]=e.useState(!1),[h,y]=e.useState(!1),o=e.useRef(null),B="Cube027_Monitor_0",O=e.useCallback(()=>{const s=o.current;s&&(s.material&&(Array.isArray(s.material)?s.material:[s.material]).forEach(F=>{const b=F;b.transparent=!0,b.opacity=0,b.needsUpdate=!0}),s.visible=!1)},[]);return e.useEffect(()=>{a.traverse(s=>{s.isMesh&&(s.castShadow=!0,s.receiveShadow=!0)})},[a]),e.useLayoutEffect(()=>{if(!c.current){y(!1);return}y(!1),c.current.updateWorldMatrix(!0,!0);const s=new _().setFromObject(c.current);if(i!=null){const z=s.min.y,F=i-z+.005;d(F)}y(!0)},[i,a]),e.useLayoutEffect(()=>{if(!c.current)return;const s=c.current;k(!1),o.current=null;const z=requestAnimationFrame(()=>{s.updateWorldMatrix(!0,!0);const b=(Y=>Y&&Y.isMesh?Y:null)(s.getObjectByName(B));if(b){o.current=b,O(),b.updateWorldMatrix(!0,!0),s.updateWorldMatrix(!0,!0);const Y=b.geometry;Y.boundingBox||Y.computeBoundingBox();const le=Y.boundingBox,N=new D;le.getSize(N);const ue=[N.x,N.y,N.z].sort((me,de)=>de-me),[X,K,J]=ue,$=new D,ee=new ie,te=new ie;b.getWorldPosition($),b.getWorldQuaternion(ee),s.getWorldQuaternion(te);const T=s.worldToLocal($.clone()),fe=te.clone().invert().multiply(ee),Q=new ge().setFromQuaternion(fe,"XYZ"),se=X*-.019,oe=K*.11,re=J*3.75;p([T.x+se,T.y+oe,T.z+re]),S([T.x+se,T.y+oe,T.z+re+.02]),x([Q.x,Q.y,Q.z]),R([X*.38,K*.37]),G(J*2),k(!0);return}const M=new _().setFromObject(s),j=new D;M.getSize(j);const I=new D;M.getCenter(I);const P=M.min.y+j.y*.64,E=M.max.z-j.z*.12,L=I.x-j.x*.18,C=s.worldToLocal(new D(L,P,E));p([C.x,C.y,C.z]),S([C.x,C.y,C.z+.01]),x([0,0,0]);const q=j.x*.8,Z=j.y*.4;R([q,Z]),G(.05),k(!0)});return()=>cancelAnimationFrame(z)},[a,f,O]),t.jsxs("group",{ref:c,position:[0,f,0],scale:.7,visible:W&&h,children:[t.jsx("primitive",{object:a,scale:1,castShadow:!0,receiveShadow:!0}),W&&t.jsxs(t.Fragment,{children:[t.jsxs("mesh",{position:m,rotation:w,onClick:s=>{s.stopPropagation(),l&&l()},onPointerOver:s=>{s.stopPropagation(),n(!0),document.body.style.cursor="pointer"},onPointerOut:s=>{s.stopPropagation(),n(!1),document.body.style.cursor="auto"},children:[t.jsx("boxGeometry",{args:[v[0]*1.03,v[1]*1.03,A]}),t.jsx("meshBasicMaterial",{transparent:!0,opacity:0})]}),t.jsxs("group",{position:r,rotation:[0,.01,0],children:[t.jsx("pointLight",{color:"#9ffdcb",position:[0,0,.12],intensity:.4,distance:1.2,decay:2}),t.jsx(ve,{isHighlighted:g,width:v[0],height:v[1],offset:0,bootSignal:Date.now()})]})]})]})}function be({onReady:l,onBounds:i}){const{scene:g}=H("/assets/models/metal_desk.glb"),n=e.useRef(null);return e.useEffect(()=>{if(!n.current)return;n.current.updateWorldMatrix(!0,!0);const a=new _().setFromObject(n.current);l&&l(a.max.y),i&&i({topY:a.max.y,bottomY:a.min.y})},[g,l]),t.jsx("group",{ref:n,position:[0,-1.2,0],scale:1.7,children:t.jsx("primitive",{object:g,castShadow:!0,receiveShadow:!0})})}function Se(){const{scene:l}=H("/assets/models/old_leather_office_chair.glb"),i=e.useRef(null),[g,n]=e.useState(0);return e.useEffect(()=>{if(!i.current)return;i.current.updateWorldMatrix(!0,!0);const a=new _().setFromObject(i.current),c=-1.9,f=.005,d=a.min.y,r=c+f-d;Math.abs(r)>1e-4&&n(p=>p+r)},[l]),t.jsx("group",{ref:i,position:[.15,g,-.5],rotation:[Math.PI*(5/180),0,0],scale:1.05,children:t.jsx("primitive",{object:l,castShadow:!0,receiveShadow:!0})})}const V={x:1.15,yOffset:.12,z:.4},we=-Math.PI*.45,Me=.8,u={position:{x:0,y:.32,z:0},rotation:-Math.PI*.3,angle:Math.PI/3,penumbra:.5,color:"#ffa850",baseIntensity:4,distance:3,decay:2,shadowMapSize:1024},U={intensity:.8,distance:.35,decay:2},je={slow:{frequency:8,amplitude:.05},medium:{frequency:13,amplitude:.03},fast:{frequency:20,amplitude:.02},intensityMultiplier:.5};function Ce({deskTopY:l}){const i=e.useRef(null),g=e.useRef(null),n=e.useRef(null),{scene:a}=H("/assets/models/desk_lamp.glb"),[c,f]=e.useState(0);return e.useEffect(()=>{a.traverse(d=>{if(d.isMesh){const r=d;if(r.castShadow=!0,r.receiveShadow=!0,r.name.toLowerCase().includes("sphere")){const m=r.material;m&&m.isMeshStandardMaterial&&(m.emissive=new xe(u.color),m.emissiveIntensity=30,m.needsUpdate=!0)}}})},[a]),e.useEffect(()=>{if(!n.current||l==null)return;n.current.updateWorldMatrix(!0,!0);const r=new _().setFromObject(n.current).min.y,p=l-r+.005;f(p)},[l,a]),ce(({clock:d})=>{if(!i.current||!g.current)return;const r=d.getElapsedTime(),{slow:p,medium:m,fast:S,intensityMultiplier:w}=je,x=Math.sin(r*p.frequency)*p.amplitude+Math.sin(r*m.frequency)*m.amplitude+Math.sin(r*S.frequency)*S.amplitude;i.current.intensity=u.baseIntensity+x*w,g.current.intensity=U.intensity+x*w*.4}),t.jsx("group",{position:[V.x,c+V.yOffset,V.z],children:t.jsxs("group",{ref:n,rotation:[0,we,0],scale:Me,position:[0,.12,0],children:[t.jsx("primitive",{object:a,castShadow:!0,receiveShadow:!0}),t.jsx("pointLight",{ref:g,position:[u.position.x,u.position.y,u.position.z],color:u.color,intensity:U.intensity,distance:U.distance,decay:U.decay}),t.jsx("spotLight",{ref:i,position:[u.position.x,u.position.y,u.position.z],rotation:[u.rotation,0,0],angle:u.angle,penumbra:u.penumbra,color:u.color,intensity:u.baseIntensity,distance:u.distance,decay:u.decay,castShadow:!0,"shadow-mapSize-width":u.shadowMapSize,"shadow-mapSize-height":u.shadowMapSize})]})})}function ze({onEnterTerminal:l}){const[i,g]=e.useState(null),n=e.useRef(null),[a,c]=e.useState(0),[f,d]=e.useState(0),r=e.useCallback(m=>{const x=-1.895-m.bottomY;d(x),g(m.topY+x)},[]);e.useEffect(()=>{if(n.current){n.current.updateWorldMatrix(!0,!0);const x=new _().setFromObject(n.current).min.z,v=-2.5+.002-x;Math.abs(v)>1e-4&&c(R=>R+v)}},[]);const p=()=>{l&&l()};return t.jsxs(t.Fragment,{children:[t.jsxs("group",{ref:n,position:[0,f,a],children:[t.jsx(be,{onBounds:r}),t.jsx("group",{position:[.1,0,-.4],children:t.jsx(ye,{onScreenClick:p,deskTopY:i??void 0})}),t.jsx(Ce,{deskTopY:i??void 0})]}),t.jsx(Se,{}),t.jsxs("mesh",{rotation:[-Math.PI/2,0,0],position:[0,-1.9,0],receiveShadow:!0,children:[t.jsx("planeGeometry",{args:[20,20]}),t.jsx("meshStandardMaterial",{color:"#1a1410",roughness:.9,metalness:0})]}),t.jsxs("mesh",{position:[0,.5,-2.5],receiveShadow:!0,children:[t.jsx("planeGeometry",{args:[20,10]}),t.jsx("meshStandardMaterial",{color:"#2a2218",roughness:.95,metalness:0})]}),t.jsxs("mesh",{position:[-5,.5,0],rotation:[0,Math.PI/2,0],receiveShadow:!0,children:[t.jsx("planeGeometry",{args:[20,10]}),t.jsx("meshStandardMaterial",{color:"#2a2218",roughness:.95,metalness:0})]}),t.jsxs("mesh",{position:[5,.5,0],rotation:[0,-Math.PI/2,0],receiveShadow:!0,children:[t.jsx("planeGeometry",{args:[20,10]}),t.jsx("meshStandardMaterial",{color:"#2a2218",roughness:.95,metalness:0})]}),t.jsxs("mesh",{rotation:[Math.PI/2,0,0],position:[0,3.5,0],receiveShadow:!0,children:[t.jsx("planeGeometry",{args:[20,20]}),t.jsx("meshStandardMaterial",{color:"#1a1a20",roughness:.95,metalness:0})]}),t.jsx("fog",{attach:"fog",args:["#0a0808",3,12]})]})}export{ze as RetroStudyScene};
