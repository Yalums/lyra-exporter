// ==UserScript==
// @name         Loominary (One-Click AI Chat Backup)
// @name:zh-CN   支持Claude、ChatGPT、Grok、Gemini等多平台的全功能AI对话跨分支全局搜索文档PDF长截图导出管理工具
// @name:zh-TW   Loominary (一鍵 AI 對話備份)
// @name:ja      Loominary (ワンクリック AI チャットバックアップ)
// @name:ko      Loominary (원클릭 AI 채팅 백업)
// @name:es      Loominary (Backup de Chat AI con Un Clic)
// @name:pt      Loominary (Backup de Chat AI com Um Clique)
// @name:fr      Loominary (Sauvegarde de Chat AI en Un Clic)
// @name:de      Loominary (Ein-Klick AI-Chat-Backup)
// @namespace    https://github.com/Laumss/loominary
// @version      26.3.1
// @description One-click export for Claude, ChatGPT, Grok, Gemini , Google AI Studio. Backups all chat branches, artifacts, and attachments. Exports to JSON/Markdown/PDF/Editable Screenshots. The ultimate companion for Lyra Exporter to build your local AI knowledge base.
// @description:zh-CN  一键导出 Claude/ChatGPT/Gemini/Grok/Google AI Studio 对话记录（支持分支、PDF、长截图）。保留完整对话分支、附加图片、LaTeX 公式、Artifacts、附件与思考过程。Lyra Exporter 的最佳搭档，打造您的本地 AI 知识库。
// @description:zh-TW 一鍵匯出 Claude、ChatGPT、Grok、Gemini、Google AI Studio 的對話。備份所有聊天分支、Artifacts 和附件。匯出為 JSON/Markdown/PDF/可編輯截圖。Lyra Exporter 的終極配套工具，用於建構本地 AI 知識庫。
// @description:ja Claude、ChatGPT、Grok、Gemini、Google AI Studio のワンクリックエクスポート。すべてのチャットブランチ、アーティファクト、添付ファイルをバックアップ。JSON/Markdown/PDF/編集可能なスクリーンショットにエクスポート。ローカル AI ナレッジベース構築のための Lyra Exporter の究極のコンパニオン。
// @description:ko Claude, ChatGPT, Grok, Gemini, Google AI Studio 원클릭 내보내기. 모든 채팅 브랜치, 아티팩트 및 첨부 파일 백업. JSON/Markdown/PDF/편집 가능한 스크린샷으로 내보내기. 로컬 AI 지식 베이스 구축을 위한 Lyra Exporter의 궁극적인 동반자.
// @description:es Exportación con un clic para Claude, ChatGPT, Grok, Gemini, Google AI Studio. Respalda todas las ramas de chat, artefactos y adjuntos. Exporta a JSON/Markdown/PDF/Capturas editables. El compañero definitivo de Lyra Exporter para construir tu base de conocimiento de IA local.
// @description:pt Exportação com um clique para Claude, ChatGPT, Grok, Gemini, Google AI Studio. Faz backup de todas as ramificações de chat, artefatos e anexos. Exporta para JSON/Markdown/PDF/Capturas editáveis. O companheiro definitivo do Lyra Exporter para construir sua base de conhecimento de IA local.
// @description:fr Exportation en un clic pour Claude, ChatGPT, Grok, Gemini, Google AI Studio. Sauvegarde toutes les branches de chat, artefacts et pièces jointes. Exporte vers JSON/Markdown/PDF/Captures modifiables. Le compagnon ultime de Lyra Exporter pour construire votre base de connaissances IA locale.
// @description:de Ein-Klick-Export für Claude, ChatGPT, Grok, Gemini, Google AI Studio. Sichert alle Chat-Branches, Artefakte und Anhänge. Exportiert nach JSON/Markdown/PDF/Bearbeitbare Screenshots. Der ultimative Begleiter für Lyra Exporter zum Aufbau Ihrer lokalen AI-Wissensdatenbank.
// @author       Laumss
// @homepage     https://laumss.github.io/loominary/welcome
// @supportURL   https://github.com/Laumss/loominary/issues
// @match        https://claude.ai/*
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://grok.com/*
// @match        https://gemini.google.com/*
// @match        https://aistudio.google.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// @license      MIT
// @downloadURL  https://update.greasyfork.org/scripts/539579/Loominary%20%28One-Click%20AI%20Chat%20Backup%29.user.js
// @updateURL    https://update.greasyfork.org/scripts/539579/Loominary%20%28One-Click%20AI%20Chat%20Backup%29.meta.js
// ==/UserScript==

(function() {
    'use strict';
    if (window.loominaryFetchInitialized) return;
    window.loominaryFetchInitialized = true;

// Inline fflate (bundled from node_modules)
!function(f){typeof module!='undefined'&&typeof exports=='object'?module.exports=f():typeof define!='undefined'&&define.amd?define(f):(typeof self!='undefined'?self:this).fflate=f()}(function(){var _e={};"use strict";var t=(typeof module!='undefined'&&typeof exports=='object'?function(_f){"use strict";var e,t=";var __w=require('worker_threads');__w.parentPort.on('message',function(m){onmessage({data:m})}),postMessage=function(m,t){__w.parentPort.postMessage(m,t)},close=process.exit;self=global";try{e=require("worker_threads").Worker}catch(e){}exports.default=e?function(r,n,o,a,s){var u=!1,i=new e(r+t,{eval:!0}).on("error",(function(e){return s(e,null)})).on("message",(function(e){return s(null,e)})).on("exit",(function(e){e&&!u&&s(Error("exited with code "+e),null)}));return i.postMessage(o,a),i.terminate=function(){return u=!0,e.prototype.terminate.call(i)},i}:function(e,t,r,n,o){setImmediate((function(){return o(Error("async operations unsupported - update to Node 12+ (or Node 10-11 with the --experimental-worker CLI flag)"),null)}));var a=function(){};return{terminate:a,postMessage:a}};return _f}:function(_f){"use strict";var e={};_f.default=function(r,t,s,a,n){var o=new Worker(e[t]||(e[t]=URL.createObjectURL(new Blob([r+';addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})'],{type:"text/javascript"}))));return o.onmessage=function(e){var r=e.data,t=r.$e$;if(t){var s=Error(t[0]);s.code=t[1],s.stack=t[2],n(s,null)}else n(null,r)},o.postMessage(s,a),o};return _f})({}),n=Uint8Array,r=Uint16Array,e=Int32Array,i=new n([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),o=new n([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),s=new n([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),a=function(t,n){for(var i=new r(31),o=0;o<31;++o)i[o]=n+=1<<t[o-1];var s=new e(i[30]);for(o=1;o<30;++o)for(var a=i[o];a<i[o+1];++a)s[a]=a-i[o]<<5|o;return{b:i,r:s}},u=a(i,2),h=u.b,f=u.r;h[28]=258,f[258]=28;for(var l=a(o,0),c=l.b,p=l.r,v=new r(32768),d=0;d<32768;++d){var g=(43690&d)>>1|(21845&d)<<1;v[d]=((65280&(g=(61680&(g=(52428&g)>>2|(13107&g)<<2))>>4|(3855&g)<<4))>>8|(255&g)<<8)>>1}var y=function(t,n,e){for(var i=t.length,o=0,s=new r(n);o<i;++o)t[o]&&++s[t[o]-1];var a,u=new r(n);for(o=1;o<n;++o)u[o]=u[o-1]+s[o-1]<<1;if(e){a=new r(1<<n);var h=15-n;for(o=0;o<i;++o)if(t[o])for(var f=o<<4|t[o],l=n-t[o],c=u[t[o]-1]++<<l,p=c|(1<<l)-1;c<=p;++c)a[v[c]>>h]=f}else for(a=new r(i),o=0;o<i;++o)t[o]&&(a[o]=v[u[t[o]-1]++]>>15-t[o]);return a},m=new n(288);for(d=0;d<144;++d)m[d]=8;for(d=144;d<256;++d)m[d]=9;for(d=256;d<280;++d)m[d]=7;for(d=280;d<288;++d)m[d]=8;var b=new n(32);for(d=0;d<32;++d)b[d]=5;var w=y(m,9,0),x=y(m,9,1),z=y(b,5,0),k=y(b,5,1),M=function(t){for(var n=t[0],r=1;r<t.length;++r)t[r]>n&&(n=t[r]);return n},S=function(t,n,r){var e=n/8|0;return(t[e]|t[e+1]<<8)>>(7&n)&r},A=function(t,n){var r=n/8|0;return(t[r]|t[r+1]<<8|t[r+2]<<16)>>(7&n)},T=function(t){return(t+7)/8|0},D=function(t,r,e){return(null==r||r<0)&&(r=0),(null==e||e>t.length)&&(e=t.length),new n(t.subarray(r,e))};_e.FlateErrorCode={UnexpectedEOF:0,InvalidBlockType:1,InvalidLengthLiteral:2,InvalidDistance:3,StreamFinished:4,NoStreamHandler:5,InvalidHeader:6,NoCallback:7,InvalidUTF8:8,ExtraFieldTooLong:9,InvalidDate:10,FilenameTooLong:11,StreamFinishing:12,InvalidZipData:13,UnknownCompressionMethod:14};var C=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],I=function(t,n,r){var e=Error(n||C[t]);if(e.code=t,Error.captureStackTrace&&Error.captureStackTrace(e,I),!r)throw e;return e},U=function(t,r,e,a){var u=t.length,f=a?a.length:0;if(!u||r.f&&!r.l)return e||new n(0);var l=!e,p=l||2!=r.i,v=r.i;l&&(e=new n(3*u));var d=function(t){var r=e.length;if(t>r){var i=new n(Math.max(2*r,t));i.set(e),e=i}},g=r.f||0,m=r.p||0,b=r.b||0,w=r.l,z=r.d,C=r.m,U=r.n,F=8*u;do{if(!w){g=S(t,m,1);var E=S(t,m+1,3);if(m+=3,!E){var Z=t[(J=T(m)+4)-4]|t[J-3]<<8,q=J+Z;if(q>u){v&&I(0);break}p&&d(b+Z),e.set(t.subarray(J,q),b),r.b=b+=Z,r.p=m=8*q,r.f=g;continue}if(1==E)w=x,z=k,C=9,U=5;else if(2==E){var O=S(t,m,31)+257,G=S(t,m+10,15)+4,L=O+S(t,m+5,31)+1;m+=14;for(var H=new n(L),j=new n(19),N=0;N<G;++N)j[s[N]]=S(t,m+3*N,7);m+=3*G;var P=M(j),B=(1<<P)-1,Y=y(j,P,1);for(N=0;N<L;){var J,K=Y[S(t,m,B)];if(m+=15&K,(J=K>>4)<16)H[N++]=J;else{var Q=0,R=0;for(16==J?(R=3+S(t,m,3),m+=2,Q=H[N-1]):17==J?(R=3+S(t,m,7),m+=3):18==J&&(R=11+S(t,m,127),m+=7);R--;)H[N++]=Q}}var V=H.subarray(0,O),W=H.subarray(O);C=M(V),U=M(W),w=y(V,C,1),z=y(W,U,1)}else I(1);if(m>F){v&&I(0);break}}p&&d(b+131072);for(var X=(1<<C)-1,$=(1<<U)-1,_=m;;_=m){var tt=(Q=w[A(t,m)&X])>>4;if((m+=15&Q)>F){v&&I(0);break}if(Q||I(2),tt<256)e[b++]=tt;else{if(256==tt){_=m,w=null;break}var nt=tt-254;tt>264&&(nt=S(t,m,(1<<(it=i[N=tt-257]))-1)+h[N],m+=it);var rt=z[A(t,m)&$],et=rt>>4;if(rt||I(3),m+=15&rt,W=c[et],et>3){var it=o[et];W+=A(t,m)&(1<<it)-1,m+=it}if(m>F){v&&I(0);break}p&&d(b+131072);var ot=b+nt;if(b<W){var st=f-W,at=Math.min(W,ot);for(st+b<0&&I(3);b<at;++b)e[b]=a[st+b]}for(;b<ot;++b)e[b]=e[b-W]}}r.l=w,r.p=_,r.b=b,r.f=g,w&&(g=1,r.m=C,r.d=z,r.n=U)}while(!g);return b!=e.length&&l?D(e,0,b):e.subarray(0,b)},F=function(t,n,r){var e=n/8|0;t[e]|=r<<=7&n,t[e+1]|=r>>8},E=function(t,n,r){var e=n/8|0;t[e]|=r<<=7&n,t[e+1]|=r>>8,t[e+2]|=r>>16},Z=function(t,e){for(var i=[],o=0;o<t.length;++o)t[o]&&i.push({s:o,f:t[o]});var s=i.length,a=i.slice();if(!s)return{t:N,l:0};if(1==s){var u=new n(i[0].s+1);return u[i[0].s]=1,{t:u,l:1}}i.sort((function(t,n){return t.f-n.f})),i.push({s:-1,f:25001});var h=i[0],f=i[1],l=0,c=1,p=2;for(i[0]={s:-1,f:h.f+f.f,l:h,r:f};c!=s-1;)h=i[i[l].f<i[p].f?l++:p++],f=i[l!=c&&i[l].f<i[p].f?l++:p++],i[c++]={s:-1,f:h.f+f.f,l:h,r:f};var v=a[0].s;for(o=1;o<s;++o)a[o].s>v&&(v=a[o].s);var d=new r(v+1),g=q(i[c-1],d,0);if(g>e){o=0;var y=0,m=g-e,b=1<<m;for(a.sort((function(t,n){return d[n.s]-d[t.s]||t.f-n.f}));o<s;++o){var w=a[o].s;if(!(d[w]>e))break;y+=b-(1<<g-d[w]),d[w]=e}for(y>>=m;y>0;){var x=a[o].s;d[x]<e?y-=1<<e-d[x]++-1:++o}for(;o>=0&&y;--o){var z=a[o].s;d[z]==e&&(--d[z],++y)}g=e}return{t:new n(d),l:g}},q=function(t,n,r){return-1==t.s?Math.max(q(t.l,n,r+1),q(t.r,n,r+1)):n[t.s]=r},O=function(t){for(var n=t.length;n&&!t[--n];);for(var e=new r(++n),i=0,o=t[0],s=1,a=function(t){e[i++]=t},u=1;u<=n;++u)if(t[u]==o&&u!=n)++s;else{if(!o&&s>2){for(;s>138;s-=138)a(32754);s>2&&(a(s>10?s-11<<5|28690:s-3<<5|12305),s=0)}else if(s>3){for(a(o),--s;s>6;s-=6)a(8304);s>2&&(a(s-3<<5|8208),s=0)}for(;s--;)a(o);s=1,o=t[u]}return{c:e.subarray(0,i),n:n}},G=function(t,n){for(var r=0,e=0;e<n.length;++e)r+=t[e]*n[e];return r},L=function(t,n,r){var e=r.length,i=T(n+2);t[i]=255&e,t[i+1]=e>>8,t[i+2]=255^t[i],t[i+3]=255^t[i+1];for(var o=0;o<e;++o)t[i+o+4]=r[o];return 8*(i+4+e)},H=function(t,n,e,a,u,h,f,l,c,p,v){F(n,v++,e),++u[256];for(var d=Z(u,15),g=d.t,x=d.l,k=Z(h,15),M=k.t,S=k.l,A=O(g),T=A.c,D=A.n,C=O(M),I=C.c,U=C.n,q=new r(19),H=0;H<T.length;++H)++q[31&T[H]];for(H=0;H<I.length;++H)++q[31&I[H]];for(var j=Z(q,7),N=j.t,P=j.l,B=19;B>4&&!N[s[B-1]];--B);var Y,J,K,Q,R=p+5<<3,V=G(u,m)+G(h,b)+f,W=G(u,g)+G(h,M)+f+14+3*B+G(q,N)+2*q[16]+3*q[17]+7*q[18];if(c>=0&&R<=V&&R<=W)return L(n,v,t.subarray(c,c+p));if(F(n,v,1+(W<V)),v+=2,W<V){Y=y(g,x,0),J=g,K=y(M,S,0),Q=M;var X=y(N,P,0);for(F(n,v,D-257),F(n,v+5,U-1),F(n,v+10,B-4),v+=14,H=0;H<B;++H)F(n,v+3*H,N[s[H]]);v+=3*B;for(var $=[T,I],_=0;_<2;++_){var tt=$[_];for(H=0;H<tt.length;++H)F(n,v,X[rt=31&tt[H]]),v+=N[rt],rt>15&&(F(n,v,tt[H]>>5&127),v+=tt[H]>>12)}}else Y=w,J=m,K=z,Q=b;for(H=0;H<l;++H){var nt=a[H];if(nt>255){var rt;E(n,v,Y[257+(rt=nt>>18&31)]),v+=J[rt+257],rt>7&&(F(n,v,nt>>23&31),v+=i[rt]);var et=31&nt;E(n,v,K[et]),v+=Q[et],et>3&&(E(n,v,nt>>5&8191),v+=o[et])}else E(n,v,Y[nt]),v+=J[nt]}return E(n,v,Y[256]),v+J[256]},j=new e([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),N=new n(0),P=function(t,s,a,u,h,l){var c=l.z||t.length,v=new n(u+c+5*(1+Math.ceil(c/7e3))+h),d=v.subarray(u,v.length-h),g=l.l,y=7&(l.r||0);if(s){y&&(d[0]=l.r>>3);for(var m=j[s-1],b=m>>13,w=8191&m,x=(1<<a)-1,z=l.p||new r(32768),k=l.h||new r(x+1),M=Math.ceil(a/3),S=2*M,A=function(n){return(t[n]^t[n+1]<<M^t[n+2]<<S)&x},C=new e(25e3),I=new r(288),U=new r(32),F=0,E=0,Z=l.i||0,q=0,O=l.w||0,G=0;Z+2<c;++Z){var N=A(Z),P=32767&Z,B=k[N];if(z[P]=B,k[N]=P,O<=Z){var Y=c-Z;if((F>7e3||q>24576)&&(Y>423||!g)){y=H(t,d,0,C,I,U,E,q,G,Z-G,y),q=F=E=0,G=Z;for(var J=0;J<286;++J)I[J]=0;for(J=0;J<30;++J)U[J]=0}var K=2,Q=0,R=w,V=P-B&32767;if(Y>2&&N==A(Z-V))for(var W=Math.min(b,Y)-1,X=Math.min(32767,Z),$=Math.min(258,Y);V<=X&&--R&&P!=B;){if(t[Z+K]==t[Z+K-V]){for(var _=0;_<$&&t[Z+_]==t[Z+_-V];++_);if(_>K){if(K=_,Q=V,_>W)break;var tt=Math.min(V,_-2),nt=0;for(J=0;J<tt;++J){var rt=Z-V+J&32767,et=rt-z[rt]&32767;et>nt&&(nt=et,B=rt)}}}V+=(P=B)-(B=z[P])&32767}if(Q){C[q++]=268435456|f[K]<<18|p[Q];var it=31&f[K],ot=31&p[Q];E+=i[it]+o[ot],++I[257+it],++U[ot],O=Z+K,++F}else C[q++]=t[Z],++I[t[Z]]}}for(Z=Math.max(Z,O);Z<c;++Z)C[q++]=t[Z],++I[t[Z]];y=H(t,d,g,C,I,U,E,q,G,Z-G,y),g||(l.r=7&y|d[y/8|0]<<3,y-=7,l.h=k,l.p=z,l.i=Z,l.w=O)}else{for(Z=l.w||0;Z<c+g;Z+=65535){var st=Z+65535;st>=c&&(d[y/8|0]=g,st=c),y=L(d,y+1,t.subarray(Z,st))}l.i=c}return D(v,0,u+T(y)+h)},B=function(){for(var t=new Int32Array(256),n=0;n<256;++n){for(var r=n,e=9;--e;)r=(1&r&&-306674912)^r>>>1;t[n]=r}return t}(),Y=function(){var t=-1;return{p:function(n){for(var r=t,e=0;e<n.length;++e)r=B[255&r^n[e]]^r>>>8;t=r},d:function(){return~t}}},J=function(){var t=1,n=0;return{p:function(r){for(var e=t,i=n,o=0|r.length,s=0;s!=o;){for(var a=Math.min(s+2655,o);s<a;++s)i+=e+=r[s];e=(65535&e)+15*(e>>16),i=(65535&i)+15*(i>>16)}t=e,n=i},d:function(){return(255&(t%=65521))<<24|(65280&t)<<8|(255&(n%=65521))<<8|n>>8}}},K=function(t,r,e,i,o){if(!o&&(o={l:1},r.dictionary)){var s=r.dictionary.subarray(-32768),a=new n(s.length+t.length);a.set(s),a.set(t,s.length),t=a,o.w=s.length}return P(t,null==r.level?6:r.level,null==r.mem?o.l?Math.ceil(1.5*Math.max(8,Math.min(13,Math.log(t.length)))):20:12+r.mem,e,i,o)},Q=function(t,n){var r={};for(var e in t)r[e]=t[e];for(var e in n)r[e]=n[e];return r},R=function(t,n,r){for(var e=t(),i=""+t,o=i.slice(i.indexOf("[")+1,i.lastIndexOf("]")).replace(/\s+/g,"").split(","),s=0;s<e.length;++s){var a=e[s],u=o[s];if("function"==typeof a){n+=";"+u+"=";var h=""+a;if(a.prototype)if(-1!=h.indexOf("[native code]")){var f=h.indexOf(" ",8)+1;n+=h.slice(f,h.indexOf("(",f))}else for(var l in n+=h,a.prototype)n+=";"+u+".prototype."+l+"="+a.prototype[l];else n+=h}else r[u]=a}return n},V=[],W=function(t){var n=[];for(var r in t)t[r].buffer&&n.push((t[r]=new t[r].constructor(t[r])).buffer);return n},X=function(n,r,e,i){if(!V[e]){for(var o="",s={},a=n.length-1,u=0;u<a;++u)o=R(n[u],o,s);V[e]={c:R(n[a],o,s),e:s}}var h=Q({},V[e].e);return(0,t.default)(V[e].c+";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage="+r+"}",e,h,W(h),i)},$=function(){return[n,r,e,i,o,s,h,c,x,k,v,C,y,M,S,A,T,D,I,U,Tt,it,ot]},_=function(){return[n,r,e,i,o,s,f,p,w,m,z,b,v,j,N,y,F,E,Z,q,O,G,L,H,T,D,P,K,kt,it]},tt=function(){return[pt,gt,ct,Y,B]},nt=function(){return[vt,dt]},rt=function(){return[yt,ct,J]},et=function(){return[mt]},it=function(t){return postMessage(t,[t.buffer])},ot=function(t){return t&&{out:t.size&&new n(t.size),dictionary:t.dictionary}},st=function(t,n,r,e,i,o){var s=X(r,e,i,(function(t,n){s.terminate(),o(t,n)}));return s.postMessage([t,n],n.consume?[t.buffer]:[]),function(){s.terminate()}},at=function(t){return t.ondata=function(t,n){return postMessage([t,n],[t.buffer])},function(n){n.data.length?(t.push(n.data[0],n.data[1]),postMessage([n.data[0].length])):t.flush()}},ut=function(t,n,r,e,i,o,s){var a,u=X(t,e,i,(function(t,r){t?(u.terminate(),n.ondata.call(n,t)):Array.isArray(r)?1==r.length?(n.queuedSize-=r[0],n.ondrain&&n.ondrain(r[0])):(r[1]&&u.terminate(),n.ondata.call(n,t,r[0],r[1])):s(r)}));u.postMessage(r),n.queuedSize=0,n.push=function(t,r){n.ondata||I(5),a&&n.ondata(I(4,0,1),null,!!r),n.queuedSize+=t.length,u.postMessage([t,a=r],[t.buffer])},n.terminate=function(){u.terminate()},o&&(n.flush=function(){u.postMessage([])})},ht=function(t,n){return t[n]|t[n+1]<<8},ft=function(t,n){return(t[n]|t[n+1]<<8|t[n+2]<<16|t[n+3]<<24)>>>0},lt=function(t,n){return ft(t,n)+4294967296*ft(t,n+4)},ct=function(t,n,r){for(;r;++n)t[n]=r,r>>>=8},pt=function(t,n){var r=n.filename;if(t[0]=31,t[1]=139,t[2]=8,t[8]=n.level<2?4:9==n.level?2:0,t[9]=3,0!=n.mtime&&ct(t,4,Math.floor(new Date(n.mtime||Date.now())/1e3)),r){t[3]=8;for(var e=0;e<=r.length;++e)t[e+10]=r.charCodeAt(e)}},vt=function(t){31==t[0]&&139==t[1]&&8==t[2]||I(6,"invalid gzip data");var n=t[3],r=10;4&n&&(r+=2+(t[10]|t[11]<<8));for(var e=(n>>3&1)+(n>>4&1);e>0;e-=!t[r++]);return r+(2&n)},dt=function(t){var n=t.length;return(t[n-4]|t[n-3]<<8|t[n-2]<<16|t[n-1]<<24)>>>0},gt=function(t){return 10+(t.filename?t.filename.length+1:0)},yt=function(t,n){var r=n.level,e=0==r?0:r<6?1:9==r?3:2;if(t[0]=120,t[1]=e<<6|(n.dictionary&&32),t[1]|=31-(t[0]<<8|t[1])%31,n.dictionary){var i=J();i.p(n.dictionary),ct(t,2,i.d())}},mt=function(t,n){return(8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31)&&I(6,"invalid zlib data"),(t[1]>>5&1)==+!n&&I(6,"invalid zlib data: "+(32&t[1]?"need":"unexpected")+" dictionary"),2+(t[1]>>3&4)};function bt(t,n){return"function"==typeof t&&(n=t,t={}),this.ondata=n,t}var wt=function(){function t(t,r){if("function"==typeof t&&(r=t,t={}),this.ondata=r,this.o=t||{},this.s={l:0,i:32768,w:32768,z:32768},this.b=new n(98304),this.o.dictionary){var e=this.o.dictionary.subarray(-32768);this.b.set(e,32768-e.length),this.s.i=32768-e.length}}return t.prototype.p=function(t,n){this.ondata(K(t,this.o,0,0,this.s),n)},t.prototype.push=function(t,r){this.ondata||I(5),this.s.l&&I(4);var e=t.length+this.s.z;if(e>this.b.length){if(e>2*this.b.length-32768){var i=new n(-32768&e);i.set(this.b.subarray(0,this.s.z)),this.b=i}var o=this.b.length-this.s.z;this.b.set(t.subarray(0,o),this.s.z),this.s.z=this.b.length,this.p(this.b,!1),this.b.set(this.b.subarray(-32768)),this.b.set(t.subarray(o),32768),this.s.z=t.length-o+32768,this.s.i=32766,this.s.w=32768}else this.b.set(t,this.s.z),this.s.z+=t.length;this.s.l=1&r,(this.s.z>this.s.w+8191||r)&&(this.p(this.b,r||!1),this.s.w=this.s.i,this.s.i-=2)},t.prototype.flush=function(){this.ondata||I(5),this.s.l&&I(4),this.p(this.b,!1),this.s.w=this.s.i,this.s.i-=2},t}();_e.Deflate=wt;var xt=function(){return function(t,n){ut([_,function(){return[at,wt]}],this,bt.call(this,t,n),(function(t){var n=new wt(t.data);onmessage=at(n)}),6,1)}}();function zt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[_],(function(t){return it(kt(t.data[0],t.data[1]))}),0,r)}function kt(t,n){return K(t,n||{},0,0)}_e.AsyncDeflate=xt,_e.deflate=zt,_e.deflateSync=kt;var Mt=function(){function t(t,r){"function"==typeof t&&(r=t,t={}),this.ondata=r;var e=t&&t.dictionary&&t.dictionary.subarray(-32768);this.s={i:0,b:e?e.length:0},this.o=new n(32768),this.p=new n(0),e&&this.o.set(e)}return t.prototype.e=function(t){if(this.ondata||I(5),this.d&&I(4),this.p.length){if(t.length){var r=new n(this.p.length+t.length);r.set(this.p),r.set(t,this.p.length),this.p=r}}else this.p=t},t.prototype.c=function(t){this.s.i=+(this.d=t||!1);var n=this.s.b,r=U(this.p,this.s,this.o);this.ondata(D(r,n,this.s.b),this.d),this.o=D(r,this.s.b-32768),this.s.b=this.o.length,this.p=D(this.p,this.s.p/8|0),this.s.p&=7},t.prototype.push=function(t,n){this.e(t),this.c(n)},t}();_e.Inflate=Mt;var St=function(){return function(t,n){ut([$,function(){return[at,Mt]}],this,bt.call(this,t,n),(function(t){var n=new Mt(t.data);onmessage=at(n)}),7,0)}}();function At(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[$],(function(t){return it(Tt(t.data[0],ot(t.data[1])))}),1,r)}function Tt(t,n){return U(t,{i:2},n&&n.out,n&&n.dictionary)}_e.AsyncInflate=St,_e.inflate=At,_e.inflateSync=Tt;var Dt=function(){function t(t,n){this.c=Y(),this.l=0,this.v=1,wt.call(this,t,n)}return t.prototype.push=function(t,n){this.c.p(t),this.l+=t.length,wt.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){var r=K(t,this.o,this.v&&gt(this.o),n&&8,this.s);this.v&&(pt(r,this.o),this.v=0),n&&(ct(r,r.length-8,this.c.d()),ct(r,r.length-4,this.l)),this.ondata(r,n)},t.prototype.flush=function(){wt.prototype.flush.call(this)},t}();_e.Gzip=Dt,_e.Compress=Dt;var Ct=function(){return function(t,n){ut([_,tt,function(){return[at,wt,Dt]}],this,bt.call(this,t,n),(function(t){var n=new Dt(t.data);onmessage=at(n)}),8,1)}}();function It(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[_,tt,function(){return[Ut]}],(function(t){return it(Ut(t.data[0],t.data[1]))}),2,r)}function Ut(t,n){n||(n={});var r=Y(),e=t.length;r.p(t);var i=K(t,n,gt(n),8),o=i.length;return pt(i,n),ct(i,o-8,r.d()),ct(i,o-4,e),i}_e.AsyncGzip=Ct,_e.AsyncCompress=Ct,_e.gzip=It,_e.compress=It,_e.gzipSync=Ut,_e.compressSync=Ut;var Ft=function(){function t(t,n){this.v=1,this.r=0,Mt.call(this,t,n)}return t.prototype.push=function(t,r){if(Mt.prototype.e.call(this,t),this.r+=t.length,this.v){var e=this.p.subarray(this.v-1),i=e.length>3?vt(e):4;if(i>e.length){if(!r)return}else this.v>1&&this.onmember&&this.onmember(this.r-e.length);this.p=e.subarray(i),this.v=0}Mt.prototype.c.call(this,r),!this.s.f||this.s.l||r||(this.v=T(this.s.p)+9,this.s={i:0},this.o=new n(0),this.push(new n(0),r))},t}();_e.Gunzip=Ft;var Et=function(){return function(t,n){var r=this;ut([$,nt,function(){return[at,Mt,Ft]}],this,bt.call(this,t,n),(function(t){var n=new Ft(t.data);n.onmember=function(t){return postMessage(t)},onmessage=at(n)}),9,0,(function(t){return r.onmember&&r.onmember(t)}))}}();function Zt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[$,nt,function(){return[qt]}],(function(t){return it(qt(t.data[0],t.data[1]))}),3,r)}function qt(t,r){var e=vt(t);return e+8>t.length&&I(6,"invalid gzip data"),U(t.subarray(e,-8),{i:2},r&&r.out||new n(dt(t)),r&&r.dictionary)}_e.AsyncGunzip=Et,_e.gunzip=Zt,_e.gunzipSync=qt;var Ot=function(){function t(t,n){this.c=J(),this.v=1,wt.call(this,t,n)}return t.prototype.push=function(t,n){this.c.p(t),wt.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){var r=K(t,this.o,this.v&&(this.o.dictionary?6:2),n&&4,this.s);this.v&&(yt(r,this.o),this.v=0),n&&ct(r,r.length-4,this.c.d()),this.ondata(r,n)},t.prototype.flush=function(){wt.prototype.flush.call(this)},t}();_e.Zlib=Ot;var Gt=function(){return function(t,n){ut([_,rt,function(){return[at,wt,Ot]}],this,bt.call(this,t,n),(function(t){var n=new Ot(t.data);onmessage=at(n)}),10,1)}}();function Lt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[_,rt,function(){return[Ht]}],(function(t){return it(Ht(t.data[0],t.data[1]))}),4,r)}function Ht(t,n){n||(n={});var r=J();r.p(t);var e=K(t,n,n.dictionary?6:2,4);return yt(e,n),ct(e,e.length-4,r.d()),e}_e.AsyncZlib=Gt,_e.zlib=Lt,_e.zlibSync=Ht;var jt=function(){function t(t,n){Mt.call(this,t,n),this.v=t&&t.dictionary?2:1}return t.prototype.push=function(t,n){if(Mt.prototype.e.call(this,t),this.v){if(this.p.length<6&&!n)return;this.p=this.p.subarray(mt(this.p,this.v-1)),this.v=0}n&&(this.p.length<4&&I(6,"invalid zlib data"),this.p=this.p.subarray(0,-4)),Mt.prototype.c.call(this,n)},t}();_e.Unzlib=jt;var Nt=function(){return function(t,n){ut([$,et,function(){return[at,Mt,jt]}],this,bt.call(this,t,n),(function(t){var n=new jt(t.data);onmessage=at(n)}),11,0)}}();function Pt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[$,et,function(){return[Bt]}],(function(t){return it(Bt(t.data[0],ot(t.data[1])))}),5,r)}function Bt(t,n){return U(t.subarray(mt(t,n&&n.dictionary),-4),{i:2},n&&n.out,n&&n.dictionary)}_e.AsyncUnzlib=Nt,_e.unzlib=Pt,_e.unzlibSync=Bt;var Yt=function(){function t(t,n){this.o=bt.call(this,t,n)||{},this.G=Ft,this.I=Mt,this.Z=jt}return t.prototype.i=function(){var t=this;this.s.ondata=function(n,r){t.ondata(n,r)}},t.prototype.push=function(t,r){if(this.ondata||I(5),this.s)this.s.push(t,r);else{if(this.p&&this.p.length){var e=new n(this.p.length+t.length);e.set(this.p),e.set(t,this.p.length)}else this.p=t;this.p.length>2&&(this.s=31==this.p[0]&&139==this.p[1]&&8==this.p[2]?new this.G(this.o):8!=(15&this.p[0])||this.p[0]>>4>7||(this.p[0]<<8|this.p[1])%31?new this.I(this.o):new this.Z(this.o),this.i(),this.s.push(this.p,r),this.p=null)}},t}();_e.Decompress=Yt;var Jt=function(){function t(t,n){Yt.call(this,t,n),this.queuedSize=0,this.G=Et,this.I=St,this.Z=Nt}return t.prototype.i=function(){var t=this;this.s.ondata=function(n,r,e){t.ondata(n,r,e)},this.s.ondrain=function(n){t.queuedSize-=n,t.ondrain&&t.ondrain(n)}},t.prototype.push=function(t,n){this.queuedSize+=t.length,Yt.prototype.push.call(this,t,n)},t}();function Kt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),31==t[0]&&139==t[1]&&8==t[2]?Zt(t,n,r):8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31?At(t,n,r):Pt(t,n,r)}function Qt(t,n){return 31==t[0]&&139==t[1]&&8==t[2]?qt(t,n):8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31?Tt(t,n):Bt(t,n)}_e.AsyncDecompress=Jt,_e.decompress=Kt,_e.decompressSync=Qt;var Rt=function(t,r,e,i){for(var o in t){var s=t[o],a=r+o,u=i;Array.isArray(s)&&(u=Q(i,s[1]),s=s[0]),s instanceof n?e[a]=[s,u]:(e[a+="/"]=[new n(0),u],Rt(s,a,e,i))}},Vt="undefined"!=typeof TextEncoder&&new TextEncoder,Wt="undefined"!=typeof TextDecoder&&new TextDecoder,Xt=0;try{Wt.decode(N,{stream:!0}),Xt=1}catch(t){}var $t=function(t){for(var n="",r=0;;){var e=t[r++],i=(e>127)+(e>223)+(e>239);if(r+i>t.length)return{s:n,r:D(t,r-1)};i?3==i?(e=((15&e)<<18|(63&t[r++])<<12|(63&t[r++])<<6|63&t[r++])-65536,n+=String.fromCharCode(55296|e>>10,56320|1023&e)):n+=String.fromCharCode(1&i?(31&e)<<6|63&t[r++]:(15&e)<<12|(63&t[r++])<<6|63&t[r++]):n+=String.fromCharCode(e)}},_t=function(){function t(t){this.ondata=t,Xt?this.t=new TextDecoder:this.p=N}return t.prototype.push=function(t,r){if(this.ondata||I(5),r=!!r,this.t)return this.ondata(this.t.decode(t,{stream:!0}),r),void(r&&(this.t.decode().length&&I(8),this.t=null));this.p||I(4);var e=new n(this.p.length+t.length);e.set(this.p),e.set(t,this.p.length);var i=$t(e),o=i.s,s=i.r;r?(s.length&&I(8),this.p=null):this.p=s,this.ondata(o,r)},t}();_e.DecodeUTF8=_t;var tn=function(){function t(t){this.ondata=t}return t.prototype.push=function(t,n){this.ondata||I(5),this.d&&I(4),this.ondata(nn(t),this.d=n||!1)},t}();function nn(t,r){if(r){for(var e=new n(t.length),i=0;i<t.length;++i)e[i]=t.charCodeAt(i);return e}if(Vt)return Vt.encode(t);var o=t.length,s=new n(t.length+(t.length>>1)),a=0,u=function(t){s[a++]=t};for(i=0;i<o;++i){if(a+5>s.length){var h=new n(a+8+(o-i<<1));h.set(s),s=h}var f=t.charCodeAt(i);f<128||r?u(f):f<2048?(u(192|f>>6),u(128|63&f)):f>55295&&f<57344?(u(240|(f=65536+(1047552&f)|1023&t.charCodeAt(++i))>>18),u(128|f>>12&63),u(128|f>>6&63),u(128|63&f)):(u(224|f>>12),u(128|f>>6&63),u(128|63&f))}return D(s,0,a)}function rn(t,n){if(n){for(var r="",e=0;e<t.length;e+=16384)r+=String.fromCharCode.apply(null,t.subarray(e,e+16384));return r}if(Wt)return Wt.decode(t);var i=$t(t),o=i.s;return(r=i.r).length&&I(8),o}_e.EncodeUTF8=tn,_e.strToU8=nn,_e.strFromU8=rn;var en=function(t){return 1==t?3:t<6?2:9==t?1:0},on=function(t,n){return n+30+ht(t,n+26)+ht(t,n+28)},sn=function(t,n,r){var e=ht(t,n+28),i=rn(t.subarray(n+46,n+46+e),!(2048&ht(t,n+8))),o=n+46+e,s=ft(t,n+20),a=r&&4294967295==s?an(t,o):[s,ft(t,n+24),ft(t,n+42)],u=a[0],h=a[1],f=a[2];return[ht(t,n+10),u,h,i,o+ht(t,n+30)+ht(t,n+32),f]},an=function(t,n){for(;1!=ht(t,n);n+=4+ht(t,n+2));return[lt(t,n+12),lt(t,n+4),lt(t,n+20)]},un=function(t){var n=0;if(t)for(var r in t){var e=t[r].length;e>65535&&I(9),n+=e+4}return n},hn=function(t,n,r,e,i,o,s,a){var u=e.length,h=r.extra,f=a&&a.length,l=un(h);ct(t,n,null!=s?33639248:67324752),n+=4,null!=s&&(t[n++]=20,t[n++]=r.os),t[n]=20,n+=2,t[n++]=r.flag<<1|(o<0&&8),t[n++]=i&&8,t[n++]=255&r.compression,t[n++]=r.compression>>8;var c=new Date(null==r.mtime?Date.now():r.mtime),p=c.getFullYear()-1980;if((p<0||p>119)&&I(10),ct(t,n,p<<25|c.getMonth()+1<<21|c.getDate()<<16|c.getHours()<<11|c.getMinutes()<<5|c.getSeconds()>>1),n+=4,-1!=o&&(ct(t,n,r.crc),ct(t,n+4,o<0?-o-2:o),ct(t,n+8,r.size)),ct(t,n+12,u),ct(t,n+14,l),n+=16,null!=s&&(ct(t,n,f),ct(t,n+6,r.attrs),ct(t,n+10,s),n+=14),t.set(e,n),n+=u,l)for(var v in h){var d=h[v],g=d.length;ct(t,n,+v),ct(t,n+2,g),t.set(d,n+4),n+=4+g}return f&&(t.set(a,n),n+=f),n},fn=function(t,n,r,e,i){ct(t,n,101010256),ct(t,n+8,r),ct(t,n+10,r),ct(t,n+12,e),ct(t,n+16,i)},ln=function(){function t(t){this.filename=t,this.c=Y(),this.size=0,this.compression=0}return t.prototype.process=function(t,n){this.ondata(null,t,n)},t.prototype.push=function(t,n){this.ondata||I(5),this.c.p(t),this.size+=t.length,n&&(this.crc=this.c.d()),this.process(t,n||!1)},t}();_e.ZipPassThrough=ln;var cn=function(){function t(t,n){var r=this;n||(n={}),ln.call(this,t),this.d=new wt(n,(function(t,n){r.ondata(null,t,n)})),this.compression=8,this.flag=en(n.level)}return t.prototype.process=function(t,n){try{this.d.push(t,n)}catch(t){this.ondata(t,null,n)}},t.prototype.push=function(t,n){ln.prototype.push.call(this,t,n)},t}();_e.ZipDeflate=cn;var pn=function(){function t(t,n){var r=this;n||(n={}),ln.call(this,t),this.d=new xt(n,(function(t,n,e){r.ondata(t,n,e)})),this.compression=8,this.flag=en(n.level),this.terminate=this.d.terminate}return t.prototype.process=function(t,n){this.d.push(t,n)},t.prototype.push=function(t,n){ln.prototype.push.call(this,t,n)},t}();_e.AsyncZipDeflate=pn;var vn=function(){function t(t){this.ondata=t,this.u=[],this.d=1}return t.prototype.add=function(t){var r=this;if(this.ondata||I(5),2&this.d)this.ondata(I(4+8*(1&this.d),0,1),null,!1);else{var e=nn(t.filename),i=e.length,o=t.comment,s=o&&nn(o),a=i!=t.filename.length||s&&o.length!=s.length,u=i+un(t.extra)+30;i>65535&&this.ondata(I(11,0,1),null,!1);var h=new n(u);hn(h,0,t,e,a,-1);var f=[h],l=function(){for(var t=0,n=f;t<n.length;t++)r.ondata(null,n[t],!1);f=[]},c=this.d;this.d=0;var p=this.u.length,v=Q(t,{f:e,u:a,o:s,t:function(){t.terminate&&t.terminate()},r:function(){if(l(),c){var t=r.u[p+1];t?t.r():r.d=1}c=1}}),d=0;t.ondata=function(e,i,o){if(e)r.ondata(e,i,o),r.terminate();else if(d+=i.length,f.push(i),o){var s=new n(16);ct(s,0,134695760),ct(s,4,t.crc),ct(s,8,d),ct(s,12,t.size),f.push(s),v.c=d,v.b=u+d+16,v.crc=t.crc,v.size=t.size,c&&v.r(),c=1}else c&&l()},this.u.push(v)}},t.prototype.end=function(){var t=this;2&this.d?this.ondata(I(4+8*(1&this.d),0,1),null,!0):(this.d?this.e():this.u.push({r:function(){1&t.d&&(t.u.splice(-1,1),t.e())},t:function(){}}),this.d=3)},t.prototype.e=function(){for(var t=0,r=0,e=0,i=0,o=this.u;i<o.length;i++)e+=46+(h=o[i]).f.length+un(h.extra)+(h.o?h.o.length:0);for(var s=new n(e+22),a=0,u=this.u;a<u.length;a++){var h;hn(s,t,h=u[a],h.f,h.u,-h.c-2,r,h.o),t+=46+h.f.length+un(h.extra)+(h.o?h.o.length:0),r+=h.b}fn(s,t,this.u.length,e,r),this.ondata(null,s,!0),this.d=2},t.prototype.terminate=function(){for(var t=0,n=this.u;t<n.length;t++)n[t].t();this.d=2},t}();function dn(t,r,e){e||(e=r,r={}),"function"!=typeof e&&I(7);var i={};Rt(t,"",i,r);var o=Object.keys(i),s=o.length,a=0,u=0,h=s,f=Array(s),l=[],c=function(){for(var t=0;t<l.length;++t)l[t]()},p=function(t,n){xn((function(){e(t,n)}))};xn((function(){p=e}));var v=function(){var t=new n(u+22),r=a,e=u-a;u=0;for(var i=0;i<h;++i){var o=f[i];try{var s=o.c.length;hn(t,u,o,o.f,o.u,s);var l=30+o.f.length+un(o.extra),c=u+l;t.set(o.c,c),hn(t,a,o,o.f,o.u,s,u,o.m),a+=16+l+(o.m?o.m.length:0),u=c+s}catch(t){return p(t,null)}}fn(t,a,f.length,e,r),p(null,t)};s||v();for(var d=function(t){var n=o[t],r=i[n],e=r[0],h=r[1],d=Y(),g=e.length;d.p(e);var y=nn(n),m=y.length,b=h.comment,w=b&&nn(b),x=w&&w.length,z=un(h.extra),k=0==h.level?0:8,M=function(r,e){if(r)c(),p(r,null);else{var i=e.length;f[t]=Q(h,{size:g,crc:d.d(),c:e,f:y,m:w,u:m!=n.length||w&&b.length!=x,compression:k}),a+=30+m+z+i,u+=76+2*(m+z)+(x||0)+i,--s||v()}};if(m>65535&&M(I(11,0,1),null),k)if(g<16e4)try{M(null,kt(e,h))}catch(t){M(t,null)}else l.push(zt(e,h,M));else M(null,e)},g=0;g<h;++g)d(g);return c}function gn(t,r){r||(r={});var e={},i=[];Rt(t,"",e,r);var o=0,s=0;for(var a in e){var u=e[a],h=u[0],f=u[1],l=0==f.level?0:8,c=(M=nn(a)).length,p=f.comment,v=p&&nn(p),d=v&&v.length,g=un(f.extra);c>65535&&I(11);var y=l?kt(h,f):h,m=y.length,b=Y();b.p(h),i.push(Q(f,{size:h.length,crc:b.d(),c:y,f:M,m:v,u:c!=a.length||v&&p.length!=d,o:o,compression:l})),o+=30+c+g+m,s+=76+2*(c+g)+(d||0)+m}for(var w=new n(s+22),x=o,z=s-o,k=0;k<i.length;++k){var M;hn(w,(M=i[k]).o,M,M.f,M.u,M.c.length);var S=30+M.f.length+un(M.extra);w.set(M.c,M.o+S),hn(w,o,M,M.f,M.u,M.c.length,M.o,M.m),o+=16+S+(M.m?M.m.length:0)}return fn(w,o,i.length,z,x),w}_e.Zip=vn,_e.zip=dn,_e.zipSync=gn;var yn=function(){function t(){}return t.prototype.push=function(t,n){this.ondata(null,t,n)},t.compression=0,t}();_e.UnzipPassThrough=yn;var mn=function(){function t(){var t=this;this.i=new Mt((function(n,r){t.ondata(null,n,r)}))}return t.prototype.push=function(t,n){try{this.i.push(t,n)}catch(t){this.ondata(t,null,n)}},t.compression=8,t}();_e.UnzipInflate=mn;var bn=function(){function t(t,n){var r=this;n<32e4?this.i=new Mt((function(t,n){r.ondata(null,t,n)})):(this.i=new St((function(t,n,e){r.ondata(t,n,e)})),this.terminate=this.i.terminate)}return t.prototype.push=function(t,n){this.i.terminate&&(t=D(t,0)),this.i.push(t,n)},t.compression=8,t}();_e.AsyncUnzipInflate=bn;var wn=function(){function t(t){this.onfile=t,this.k=[],this.o={0:yn},this.p=N}return t.prototype.push=function(t,r){var e=this;if(this.onfile||I(5),this.p||I(4),this.c>0){var i=Math.min(this.c,t.length),o=t.subarray(0,i);if(this.c-=i,this.d?this.d.push(o,!this.c):this.k[0].push(o),(t=t.subarray(i)).length)return this.push(t,r)}else{var s=0,a=0,u=void 0,h=void 0;this.p.length?t.length?((h=new n(this.p.length+t.length)).set(this.p),h.set(t,this.p.length)):h=this.p:h=t;for(var f=h.length,l=this.c,c=l&&this.d,p=function(){var t,n=ft(h,a);if(67324752==n){s=1,u=a,v.d=null,v.c=0;var r=ht(h,a+6),i=ht(h,a+8),o=2048&r,c=8&r,p=ht(h,a+26),d=ht(h,a+28);if(f>a+30+p+d){var g=[];v.k.unshift(g),s=2;var y,m=ft(h,a+18),b=ft(h,a+22),w=rn(h.subarray(a+30,a+=30+p),!o);4294967295==m?(t=c?[-2]:an(h,a),m=t[0],b=t[1]):c&&(m=-1),a+=d,v.c=m;var x={name:w,compression:i,start:function(){if(x.ondata||I(5),m){var t=e.o[i];t||x.ondata(I(14,"unknown compression type "+i,1),null,!1),(y=m<0?new t(w):new t(w,m,b)).ondata=function(t,n,r){x.ondata(t,n,r)};for(var n=0,r=g;n<r.length;n++)y.push(r[n],!1);e.k[0]==g&&e.c?e.d=y:y.push(N,!0)}else x.ondata(null,N,!0)},terminate:function(){y&&y.terminate&&y.terminate()}};m>=0&&(x.size=m,x.originalSize=b),v.onfile(x)}return"break"}if(l){if(134695760==n)return u=a+=12+(-2==l&&8),s=3,v.c=0,"break";if(33639248==n)return u=a-=4,s=3,v.c=0,"break"}},v=this;a<f-4&&"break"!==p();++a);if(this.p=N,l<0){var d=h.subarray(0,s?u-12-(-2==l&&8)-(134695760==ft(h,u-16)&&4):a);c?c.push(d,!!s):this.k[+(2==s)].push(d)}if(2&s)return this.push(h.subarray(a),r);this.p=h.subarray(a)}r&&(this.c&&I(13),this.p=null)},t.prototype.register=function(t){this.o[t.compression]=t},t}();_e.Unzip=wn;var xn="function"==typeof queueMicrotask?queueMicrotask:"function"==typeof setTimeout?setTimeout:function(t){t()};function zn(t,r,e){e||(e=r,r={}),"function"!=typeof e&&I(7);var i=[],o=function(){for(var t=0;t<i.length;++t)i[t]()},s={},a=function(t,n){xn((function(){e(t,n)}))};xn((function(){a=e}));for(var u=t.length-22;101010256!=ft(t,u);--u)if(!u||t.length-u>65558)return a(I(13,0,1),null),o;var h=ht(t,u+8);if(h){var f=h,l=ft(t,u+16),c=4294967295==l||65535==f;if(c){var p=ft(t,u-12);(c=101075792==ft(t,p))&&(f=h=ft(t,p+32),l=ft(t,p+48))}for(var v=r&&r.filter,d=function(r){var e=sn(t,l,c),u=e[0],f=e[1],p=e[2],d=e[3],g=e[4],y=on(t,e[5]);l=g;var m=function(t,n){t?(o(),a(t,null)):(n&&(s[d]=n),--h||a(null,s))};if(!v||v({name:d,size:f,originalSize:p,compression:u}))if(u)if(8==u){var b=t.subarray(y,y+f);if(p<524288||f>.8*p)try{m(null,Tt(b,{out:new n(p)}))}catch(t){m(t,null)}else i.push(At(b,{size:p},m))}else m(I(14,"unknown compression type "+u,1),null);else m(null,D(t,y,y+f));else m(null,null)},g=0;g<f;++g)d()}else a(null,{});return o}function kn(t,r){for(var e={},i=t.length-22;101010256!=ft(t,i);--i)(!i||t.length-i>65558)&&I(13);var o=ht(t,i+8);if(!o)return{};var s=ft(t,i+16),a=4294967295==s||65535==o;if(a){var u=ft(t,i-12);(a=101075792==ft(t,u))&&(o=ft(t,u+32),s=ft(t,u+48))}for(var h=r&&r.filter,f=0;f<o;++f){var l=sn(t,s,a),c=l[0],p=l[1],v=l[2],d=l[3],g=l[4],y=on(t,l[5]);s=g,h&&!h({name:d,size:p,originalSize:v,compression:c})||(c?8==c?e[d]=Tt(t.subarray(y,y+p),{out:new n(v)}):I(14,"unknown compression type "+c):e[d]=D(t,y,y+p))}return e}_e.unzip=zn,_e.unzipSync=kn;return _e}); // eslint-disable-line

// Userscript Adapter Layer — replaces extension-adapter.js in GreasyFork builds
// Provides the same GM_* API surface as extension-adapter.js but uses native
// Greasemonkey/Tampermonkey/Violentmonkey APIs instead of chrome.* messaging.

if (window.self !== window.top) throw new Error('[Loominary] iframe context, skipping');

const LOOMINARY_ENV = 'userscript';
console.log('[Loominary] userscript-adapter loaded, unsafeWindow available:', typeof unsafeWindow !== 'undefined');

// ViolentMonkey with @grant declarations sandboxes the script: the default `fetch`
// becomes the extension's isolated fetch, which fails with NetworkError for
// same-origin requests because it lacks page cookies. Shadow it with the page's
// real window.fetch so all API calls are same-origin and credentials are included.
// eslint-disable-next-line no-var
var fetch = (typeof unsafeWindow !== 'undefined' && unsafeWindow.fetch)
    ? unsafeWindow.fetch.bind(unsafeWindow)
    : (typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : globalThis.fetch);

// GM_addStyle is natively available in userscript context via @grant GM_addStyle,
// but define a fallback in case it is not (e.g., @grant none mode).
if (typeof GM_addStyle === 'undefined') {
    function GM_addStyle(css) {
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
        return style;
    }
}

/**
 * Cross-origin fetch via native GM_xmlhttpRequest.
 * Replaces the chrome background-proxy version in extension-adapter.js.
 */
function fetchViaBackground(url, responseType) {
    return new Promise((resolve, reject) => {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            return reject(new Error('GM_xmlhttpRequest not available — add @grant GM_xmlhttpRequest to the userscript header'));
        }
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            responseType: responseType || 'blob',
            onload: (response) => {
                if (response.status >= 200 && response.status < 300) {
                    resolve(response.response);
                } else {
                    reject(new Error(`HTTP ${response.status}: ${response.statusText}`));
                }
            },
            onerror: (err) => reject(new Error(err.statusText || 'GM_xmlhttpRequest failed'))
        });
    });
}

/**
 * GM_xmlhttpRequest shim with the same call signature used in the codebase.
 * In a properly granted userscript context GM_xmlhttpRequest is already available
 * natively — this thin wrapper normalises the interface for the few code paths
 * that call it directly (e.g. grok.js image fetching).
 *
 * If the native API is unavailable (e.g. @grant none), falls back to fetch().
 */
if (typeof GM_xmlhttpRequest === 'undefined') {
    function GM_xmlhttpRequest(options) {
        const { method = 'GET', url, headers = {}, responseType, onload, onerror } = options;
        const fetchOptions = { method, headers, credentials: 'include' };

        fetch(url, fetchOptions)
            .then(async response => {
                let responseData;
                if (responseType === 'blob') {
                    responseData = await response.blob();
                } else if (responseType === 'json') {
                    responseData = await response.json();
                } else if (responseType === 'arraybuffer') {
                    responseData = await response.arrayBuffer();
                } else {
                    responseData = await response.text();
                }
                if (onload) {
                    onload({
                        status: response.status,
                        statusText: response.statusText,
                        response: responseData,
                        responseText: typeof responseData === 'string' ? responseData : '',
                        responseHeaders: [...response.headers.entries()]
                            .map(([k, v]) => `${k}: ${v}`)
                            .join('\r\n')
                    });
                }
            })
            .catch(error => {
                if (onerror) onerror({ error: error.message, statusText: error.message });
            });

        return { abort: () => {} };
    }
}


        // Trusted Types support for CSP compatibility
        let trustedPolicy = null;
        if (typeof window.trustedTypes !== 'undefined' && window.trustedTypes.createPolicy) {
            try {
                trustedPolicy = window.trustedTypes.createPolicy('loominary-exporter-policy', {
                    createHTML: (input) => input
                });
                console.log('[Loominary] Trusted-Types policy created successfully');
            } catch (e) {
                console.warn('[Loominary] Failed to create Trusted-Types policy:', e);
            }
        }

        function safeSetInnerHTML(element, html) {
            if (!element) return;
            try {
                if (trustedPolicy) {
                    element.innerHTML = trustedPolicy.createHTML(html);
                    return;
                }
                element.innerHTML = html;
            } catch (e) {
                // Trusted Types blocked innerHTML (e.g. Gemini CSP) — parse via DOMParser instead
                try {
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    element.replaceChildren(...doc.body.childNodes);
                } catch (e2) {
                    element.textContent = html;
                }
            }
        }

        const Config = {
            CONTROL_ID: 'loominary-controls',
            TOGGLE_ID: 'loominary-toggle-button',
            LANG_SWITCH_ID: 'loominary-lang-switch',
            TREE_SWITCH_ID: 'loominary-tree-mode-switch',
            IMAGE_SWITCH_ID: 'loominary-image-switch',
            CANVAS_SWITCH_ID: 'loominary-canvas-switch',
            WORKSPACE_TYPE_ID: 'loominary-workspace-type',
            MANUAL_ID_BTN: 'loominary-manual-id-btn',

            TIMING: {
                SCROLL_DELAY: 250,
                SCROLL_TOP_WAIT: 1000,
                VERSION_STABLE: 1500,
                VERSION_SCAN_INTERVAL: 1000,
                HREF_CHECK_INTERVAL: 800,
                PANEL_INIT_DELAY: 2000,
                BATCH_EXPORT_SLEEP: 300,
                BATCH_EXPORT_YIELD: 0
            }
        };

        const State = {
            currentPlatform: (() => {
                const host = window.location.hostname;
                const path = window.location.pathname;
                console.log('[Loominary] Detecting platform, hostname:', host, 'path:', path);
                if (host.includes('claude.ai')) {
                    console.log('[Loominary] Platform detected: claude');
                    return 'claude';
                }
                if (host.includes('chatgpt') || host.includes('openai')) {
                    console.log('[Loominary] Platform detected: chatgpt');
                    return 'chatgpt';
                }
                if (host.includes('grok.com')) {
                    console.log('[Loominary] Platform detected: grok');
                    return 'grok';
                }
                if (host.includes('gemini')) {
                    console.log('[Loominary] Platform detected: gemini');
                    return 'gemini';
                }

                if (host.includes('aistudio')) {
                    console.log('[Loominary] Platform detected: aistudio');
                    return 'aistudio';
                }
                console.log('[Loominary] Platform detected: null (unknown)');
                return null;
            })(),
            isPanelCollapsed: localStorage.getItem('exporterCollapsed') !== 'false',
            includeImages: localStorage.getItem('includeImages') === 'true',
            capturedUserId: localStorage.getItem('claudeUserId') || '',
            chatgptAccessToken: null,
            chatgptUserId: localStorage.getItem('chatGPTUserId') || '',
            chatgptWorkspaceId: localStorage.getItem('chatGPTWorkspaceId') || '',
            chatgptWorkspaceType: localStorage.getItem('chatGPTWorkspaceType') || 'user',
            panelInjected: false,
            includeCanvas: localStorage.getItem('includeCanvas') === 'true'
        };

        let collectedData = new Map();
        const Flags = {
            hasRetryWithoutToolButton: false,
            lastCanvasContent: null,
            lastCanvasMessageIndex: -1
        };

        const i18n = {
            languages: {
                zh: {
                    loading: '加载中...', exporting: '导出中...', compressing: '压缩中...', preparing: '准备中...',
                    exportSuccess: '导出成功!', noContent: '没有可导出的对话内容。',
                    exportCurrentJSON: '导出当前', exportAllConversations: '导出全部',
                    branchMode: '多分支', includeImages: '含图像',
                    enterFilename: '请输入文件名(不含扩展名):', untitledChat: '未命名对话',
                    uuidNotFound: '未找到对话UUID!', fetchFailed: '获取对话数据失败',
                    exportFailed: '导出失败: ', gettingConversation: '获取对话',
                    withImages: ' (处理图片中...)', successExported: '成功导出', conversations: '个对话!',
                    manualUserId: '手动设置ID', enterUserId: '请输入您的组织ID (settings/account):',
                    userIdSaved: '用户ID已保存!',
                    workspaceType: '团队空间', userWorkspace: '个人区', teamWorkspace: '工作区',
                    manualWorkspaceId: '手动设置工作区ID', enterWorkspaceId: '请输入工作区ID (工作空间设置/工作空间 ID):',
                    workspaceIdSaved: '工作区ID已保存!', tokenNotFound: '未找到访问令牌!',
                    viewOnline: '预览对话',
                    loadFailed: '加载失败: ',
                    cannotOpenExporter: '无法打开 Loominary,请检查弹窗拦截',
                    versionTracking: '实时',
                    detectingConversations: '正在探测对话数量...',
                    foundConversations: '检测到',
                    selectExportCount: '请输入要导出最近的多少个对话 (输入 0 或留空导出全部):',
                    invalidNumber: '输入无效，请输入有效的数字',
                    exportCancelled: '已取消导出'
                },
                en: {
                    loading: 'Loading...', exporting: 'Exporting...', compressing: 'Compressing...', preparing: 'Preparing...',
                    exportSuccess: 'Export successful!', noContent: 'No conversation content to export.',
                    exportCurrentJSON: 'Export', exportAllConversations: 'Save All',
                    branchMode: 'Branch', includeImages: 'Images',
                    enterFilename: 'Enter filename (without extension):', untitledChat: 'Untitled Chat',
                    uuidNotFound: 'UUID not found!', fetchFailed: 'Failed to fetch conversation data',
                    exportFailed: 'Export failed: ', gettingConversation: 'Getting conversation',
                    withImages: ' (processing images...)', successExported: 'Successfully exported', conversations: 'conversations!',
                    manualUserId: 'Customize UUID', enterUserId: 'Organization ID (settings/account)',
                    userIdSaved: 'User ID saved!',
                    workspaceType: 'Workspace', userWorkspace: 'Personal', teamWorkspace: 'Team',
                    manualWorkspaceId: 'Set Workspace ID', enterWorkspaceId: 'Enter Workspace ID(Workspace settings/Workspace ID):',
                    workspaceIdSaved: 'Workspace ID saved!', tokenNotFound: 'Access token not found!',
                    viewOnline: 'Preview',
                    loadFailed: 'Load failed: ',
                    cannotOpenExporter: 'Cannot open Loominary, please check popup blocker',
                    versionTracking: 'Realtime',
                    detectingConversations: 'Detecting conversations...',
                    foundConversations: 'Found',
                    selectExportCount: 'How many recent conversations to export? (Enter 0 or leave empty for all):',
                    invalidNumber: 'Invalid input, please enter a valid number',
                    exportCancelled: 'Export cancelled'
                }
            },
            currentLang: localStorage.getItem('exporterLanguage') || (navigator.language.startsWith('zh') ? 'zh' : 'en'),
            t: (key) => i18n.languages[i18n.currentLang]?.[key] || key,
            setLanguage: (lang) => {
                i18n.currentLang = lang;
                localStorage.setItem('exporterLanguage', lang);
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ loominary_lang: lang });
                }
            },
            getLanguageShort() {
                return this.currentLang === 'zh' ? '简体中文' : 'English';
            }
        };

        // Sync initial language to chrome.storage for popup access
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ loominary_lang: i18n.currentLang });
        }

        const previewIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        const collapseIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>';
        const expandIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        const exportIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
        const zipIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 11V9a7 7 0 0 0-7-7a7 7 0 0 0-7 7v2"></path><rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect></svg>';

        const ErrorHandler = {
            handle: (error, context, options = {}) => {
                const {
                    showAlert = true,
                    logToConsole = true,
                    userMessage = null
                } = options;

                const errorMsg = error?.message || String(error);
                const contextMsg = context ? `[${context}]` : '';

                if (logToConsole) {
                    console.error(`[Loominary] ${contextMsg}`, error);
                }

                if (showAlert) {
                    const displayMsg = userMessage || `${i18n.t('exportFailed')} ${errorMsg}`;
                    alert(displayMsg);
                }

                return false;
            }
        };

        const Utils = {
            sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

            sanitizeFilename: (name) => {
                if (!name) return 'unnamed';
                return name
                    .replace(/[<>:"\/\\|?*\x00-\x1F]/g, '') // 移除非法字符
                    .replace(/[\u0080-\uFFFF]/g, (c) => { // 移除非ASCII字符（保留中文）
                        const code = c.charCodeAt(0);
                        return (code >= 0x4e00 && code <= 0x9fa5) ? c : '';
                    })
                    .replace(/_{2,}/g, '_') // 多个下划线合并为一个
                    .replace(/^[._]+|[._]+$/g, '') // 移除首尾的点和下划线
                    .substring(0, 100) || 'unnamed';
            },

            blobToBase64: (blob) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }),

            downloadJSON: (jsonString, filename) => {
                const blob = new Blob([jsonString], { type: 'application/json' });
                Utils.downloadFile(blob, filename);
            },

            downloadFile: (blob, filename) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            },

            setButtonLoading: (btn, text) => {
                btn.disabled = true;
                safeSetInnerHTML(btn, `<div class="loominary-loading"></div> <span>${text}</span>`);
            },

            restoreButton: (btn, originalContent) => {
                btn.disabled = false;
                safeSetInnerHTML(btn, originalContent);
            },

            createButton: (innerHTML, onClick, useInlineStyles = false) => {
                const btn = document.createElement('button');
                btn.className = 'loominary-button';
                safeSetInnerHTML(btn, innerHTML);
                btn.addEventListener('click', () => onClick(btn));

                if (useInlineStyles) {
                    Object.assign(btn.style, {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: '8px',
                        width: '100%',
                        maxWidth: '100%',
                        padding: '8px 12px',
                        margin: '8px 0',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        letterSpacing: '0.3px',
                        height: '32px',
                        boxSizing: 'border-box',
                        whiteSpace: 'nowrap'
                    });
                }

                return btn;
            },

            createToggle: (label, id, checked = false) => {
                const container = document.createElement('div');
                container.className = 'loominary-toggle';
                const labelSpan = document.createElement('span');
                labelSpan.className = 'loominary-toggle-label';
                labelSpan.textContent = label;

                const switchLabel = document.createElement('label');
                switchLabel.className = 'loominary-switch';

                const input = document.createElement('input');
                input.type = 'checkbox';
                input.id = id;
                input.checked = checked;

                const slider = document.createElement('span');
                slider.className = 'loominary-slider';

                switchLabel.appendChild(input);
                switchLabel.appendChild(slider);
                container.appendChild(labelSpan);
                container.appendChild(switchLabel);

                return container;
            },

            createProgressElem: (parent) => {
                const elem = document.createElement('div');
                elem.className = 'loominary-progress';
                parent.appendChild(elem);
                return elem;
            }
        };

    // Simple hash function for better deduplication
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    /**
     * Extract canvas content from a DOM element
     * Supports code blocks, artifacts, interactive elements, and text content
     * @param {Element} root - The root element to extract canvas from (typically a model-response container)
     * @returns {Array} Array of canvas objects with type, content, and metadata
     */
    function extractCanvasFromElement(root) {
        const canvasData = [];
        const seen = new Set();
        if (!root || !(root instanceof Element)) return canvasData;

        // Enhanced code block detection with multiple selectors
        const codeBlockSelectors = [
            'code-block',
            'pre code',
            '.code-block',
            '[data-code-block]',
            '.artifact-code',
            'code-execution-result code'
        ];

        codeBlockSelectors.forEach((selector) => {
            const blocks = root.querySelectorAll(selector);
            blocks.forEach((block) => {
                const codeContent = block.textContent || block.innerText;
                if (!codeContent) return;
                const trimmed = codeContent.trim();
                if (!trimmed || trimmed.length < 5) return; // Skip very short content

                const hash = simpleHash(trimmed);
                if (seen.has(hash)) return;
                seen.add(hash);

                // Try to detect language from multiple sources
                let language = 'unknown';
                const langAttr = block.querySelector('[data-lang]');
                if (langAttr) {
                    language = langAttr.getAttribute('data-lang') || 'unknown';
                } else if (block.className) {
                    const match = block.className.match(/language-(\w+)/);
                    if (match) language = match[1];
                }

                canvasData.push({
                    type: 'code',
                    content: trimmed,
                    language: language,
                    selector: selector
                });
            });
        });

        // Artifact detection (Gemini's interactive components)
        const artifactSelectors = [
            '[data-artifact]',
            '.artifact-container',
            'artifact-element',
            '.interactive-canvas'
        ];

        artifactSelectors.forEach((selector) => {
            const artifacts = root.querySelectorAll(selector);
            artifacts.forEach((artifact) => {
                const content = artifact.textContent || artifact.innerText;
                if (!content) return;
                const trimmed = content.trim();
                if (!trimmed || trimmed.length < 5) return;

                const hash = simpleHash(trimmed);
                if (seen.has(hash)) return;
                seen.add(hash);

                canvasData.push({
                    type: 'artifact',
                    content: trimmed,
                    selector: selector
                });
            });
        });

        // Canvas element detection (actual HTML5 canvas)
        const canvasElements = root.querySelectorAll('canvas');
        canvasElements.forEach((canvas) => {
            // Try to get canvas context or data
            const canvasId = canvas.id || canvas.className || 'unnamed-canvas';
            const hash = simpleHash(canvasId + canvas.width + canvas.height);
            if (seen.has(hash)) return;
            seen.add(hash);

            canvasData.push({
                type: 'canvas_element',
                content: `Canvas element: ${canvasId} (${canvas.width}x${canvas.height})`,
                metadata: {
                    id: canvasId,
                    width: canvas.width,
                    height: canvas.height
                }
            });
        });

        return canvasData;
    }

    function extractGlobalCanvasContent() {
        const canvasData = [];
        const seen = new Set();

        const codeBlocks = document.querySelectorAll('code-block, pre code, .code-block');
        codeBlocks.forEach((block) => {
            const codeContent = block.textContent || block.innerText;
            if (!codeContent) return;
            const trimmed = codeContent.trim();
            if (!trimmed) return;
            const key = trimmed.substring(0, 100);
            if (seen.has(key)) return;
            seen.add(key);

            const langAttr = block.querySelector('[data-lang]');
            const language = langAttr ? langAttr.getAttribute('data-lang') || 'unknown' : 'unknown';
            canvasData.push({
                type: 'code',
                content: trimmed,
                language: language
            });
        });

        const responseElements = document.querySelectorAll('response-element, .model-response-text, .markdown');
        responseElements.forEach((element) => {
            if (element.closest('code-block') || element.querySelector('code-block')) return;
            let clone;
            try {
                clone = element.cloneNode(true);
                clone.querySelectorAll('button.retry-without-tool-button').forEach(btn => btn.remove());
            } catch (e) {
                clone = element;
            }
            let md = '';
            try {
                md = htmlToMarkdown(clone).trim();
            } catch (e) {
                const textContent = element.textContent || element.innerText;
                md = textContent ? textContent.trim() : '';
            }
            if (!md) return;
            const key = md.substring(0, 100);
            if (seen.has(key)) return;
            seen.add(key);
            canvasData.push({
                type: 'text',
                content: md
            });
        });

        return canvasData;
    }
        const Communicator = {
            open: async (jsonData, filename, extraData) => {
                const defaultFilename = filename || `${State.currentPlatform}_export_${new Date().toISOString().slice(0,10)}.json`;

                // Userscript mode: open GitHub Pages viewer and transfer data via postMessage
                if (typeof LOOMINARY_ENV !== 'undefined' && LOOMINARY_ENV === 'userscript') {
                    const GITHUB_PAGES_URL = 'https://Laumss.github.io/loominary';
                    // Use unsafeWindow.open so the new tab's window.opener = actual page window,
                    // not the ViolentMonkey sandbox proxy. This allows github.io to postMessage back.
                    const _opener = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
                    const newWin = _opener.open(GITHUB_PAGES_URL, '_blank');
                    if (!newWin) {
                        alert(i18n.t('cannotOpenExporter'));
                        return false;
                    }
                    return new Promise((resolve) => {
                        // Poll with LOOMINARY_HANDSHAKE until the GitHub Pages app signals it is ready
                        const interval = setInterval(() => {
                            try {
                                newWin.postMessage({ type: 'LOOMINARY_HANDSHAKE' }, 'https://Laumss.github.io');
                            } catch (e) { /* page may not be loaded yet */ }
                        }, 500);
                        const timeout = setTimeout(() => {
                            clearInterval(interval);
                            _opener.removeEventListener('message', handler);
                            console.warn('[Loominary] Timed out waiting for GitHub Pages viewer to respond');
                            resolve(false);
                        }, 15000);
                        function handler(event) {
                            if (event.source !== newWin || event.data?.type !== 'LOOMINARY_READY') return;
                            clearInterval(interval);
                            clearTimeout(timeout);
                            _opener.removeEventListener('message', handler);
                            // Viewer sends back its saved export config — save it to local storage so
                            // content-script exports use the same settings as the React viewer.
                            if (event.data.config && typeof event.data.config === 'object') {
                                const cfgStr = JSON.stringify(event.data.config);
                                console.log('[Loominary] LOOMINARY_READY: syncing config from viewer:', cfgStr);
                                try { localStorage.setItem('loominary_export_config', cfgStr); } catch (e) {}
                            }
                            // Detect page theme via color-scheme CSS property
                            const pageTheme = getComputedStyle(document.documentElement).getPropertyValue('color-scheme').trim();
                            const detectedTheme = (pageTheme === 'light') ? 'light' : 'dark';
                            newWin.postMessage({
                                type: 'LOOMINARY_LOAD_DATA',
                                data: { content: jsonData, filename: defaultFilename, lang: i18n.currentLang, theme: detectedTheme, ...extraData }
                            }, 'https://Laumss.github.io');
                            resolve(true);
                        }
                        _opener.addEventListener('message', handler);
                    });
                }

                // Extension mode: open side panel via background service worker
                try {
                    if (State.capturedUserId) {
                        chrome.storage.local.set({ loominary_browse_context: {
                            baseUrl: window.location.origin,
                            userId: State.capturedUserId
                        }});
                    }

                    // Detect page theme and sync lang before opening tab
                    const _extPageTheme = getComputedStyle(document.documentElement).getPropertyValue('color-scheme').trim();
                    const _extDetectedTheme = (_extPageTheme === 'light') ? 'light' : 'dark';
                    chrome.storage.local.set({ loominary_lang: i18n.currentLang, loominary_page_theme: _extDetectedTheme });

                    chrome.runtime.sendMessage({
                        type: 'LOOMINARY_OPEN_SIDEPANEL',
                        data: {
                            content: jsonData,
                            filename: defaultFilename,
                            lang: i18n.currentLang,
                            theme: _extDetectedTheme,
                            ...extraData
                        }
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('[Loominary Extension] Send message error:', chrome.runtime.lastError);
                            alert(i18n.t('cannotOpenExporter') + ': ' + chrome.runtime.lastError.message);
                        } else {
                            console.log('[Loominary Extension] Side panel opened successfully');
                        }
                    });

                    return true;
                } catch (error) {
                    alert(`${i18n.t('cannotOpenExporter')}: ${error.message}`);
                    return false;
                }
            }
        };

        // Listen for settings updates posted back from the viewer tab (github.io SettingsPanel)
        // Must use unsafeWindow in userscript mode: ViolentMonkey sandbox `window` is a proxy;
        // the actual postMessage from github.io goes to the real page window (unsafeWindow).
        const _msgTarget = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
        console.log('[Loominary] settings listener registered on', typeof unsafeWindow !== 'undefined' ? 'unsafeWindow' : 'window');
        _msgTarget.addEventListener('message', (event) => {
            if (event.data?.type !== 'LOOMINARY_SETTINGS_UPDATE') return;
            if (!event.data.config || typeof event.data.config !== 'object') return;
            const config = event.data.config;
            console.log('[Loominary] LOOMINARY_SETTINGS_UPDATE received, saving config:', JSON.stringify(config));
            if (typeof LOOMINARY_ENV !== 'undefined' && LOOMINARY_ENV === 'userscript') {
                try { localStorage.setItem('loominary_export_config', JSON.stringify(config)); } catch (e) {}
            } else if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                chrome.storage.local.set({ loominary_export_config: config });
            }
        });

// markdown-core.js — Script-layer Markdown generation & export
// Injected into content.js (extension) and userscript AFTER common-base.js.
// No ES module syntax; all functions live in the enclosing IIFE scope.

// ─── i18n helper ────────────────────────────────────────────────────────────
function _mdT(key, fallback) {
    try { const v = i18n.t('exportManager.' + key); return (v && v !== 'exportManager.' + key) ? v : fallback; }
    catch (_) { return fallback; }
}

// ─── Date utils ──────────────────────────────────────────────────────────────
function _fmtDate(s) {
    if (!s) return '';
    try { return new Date(s).toLocaleString(); } catch (_) { return s; }
}
function _todayStr() {
    return new Date().toISOString().slice(0, 10);
}

// ─── Artifact / tool extractors (ported from helpers.js) ─────────────────────
function _extractArtifact(item) {
    try {
        const input = item.input || {};
        const command = input.command || '';
        if (command === 'create') return { id: input.id || '', command, type: input.type || '', title: input.title || '', content: input.content || '', language: input.language || '', result: null };
        if (command === 'update' || command === 'rewrite') return { id: input.id || '', command, old_str: input.old_str || '', new_str: input.new_str || '', result: null };
    } catch (_) {}
    return null;
}
function _extractToolUse(item) {
    const t = { name: item.name || 'unknown', input: item.input || {}, result: null };
    if (item.name === 'web_search_tool' && item.input?.query) t.query = item.input.query;
    return t;
}
function _extractToolResult(item) {
    return { name: item.name || 'unknown', is_error: !!item.is_error, content: item.content || [] };
}
function _filterCitations(cits) {
    if (!Array.isArray(cits)) return [];
    return cits.filter(c => c && typeof c === 'object' && (c.metadata?.type !== 'file') && (c.metadata?.source !== 'my_files'));
}

// ─── Claude content-array processor (ported from helpers.js) ─────────────────
function _processContentArray(arr, msg, isHuman) {
    let text = '';
    (arr || []).forEach((item, idx) => {
        if (!item || typeof item !== 'object') return;
        const t = item.type || '';
        if (t === 'text') {
            text += item.text || '';
            if (Array.isArray(item.citations)) msg.citations.push(..._filterCitations(item.citations));
        } else if (t === 'image') {
            const src = item.source || {};
            const placeholder = ` [图片${msg.images.length + 1}] `;
            msg.images.push({ index: msg.images.length, file_name: `image_${idx}`, file_type: src.media_type || 'image/jpeg', display_mode: 'base64', embedded_image: { data: `data:${src.media_type};base64,${src.data}` }, placeholder });
            text += placeholder;
        } else if (t === 'thinking' && !isHuman) {
            msg.thinking = (item.thinking || '').trim();
        } else if (t === 'tool_use' && !isHuman) {
            if (item.name === 'artifacts') { const a = _extractArtifact(item); if (a) msg.artifacts.push(a); }
            else { const tool = _extractToolUse(item); if (tool) msg.tools.push(tool); }
        } else if (t === 'tool_result') {
            const res = _extractToolResult(item);
            if (item.name && item.name.includes('artifacts')) { if (msg.artifacts.length) msg.artifacts[msg.artifacts.length - 1].result = res; }
            else { if (msg.tools.length) msg.tools[msg.tools.length - 1].result = res; }
        }
    });
    msg.display_text += text.trim();
}

// ─── Build blank message object ──────────────────────────────────────────────
function _blankMsg(idx, uuid, parentUuid, sender, senderLabel, timestamp) {
    return { index: idx, uuid: uuid || '', parent_uuid: parentUuid || '', sender, sender_label: senderLabel, timestamp: timestamp || '', display_text: '', thinking: '', tools: [], artifacts: [], citations: [], images: [], attachments: [], branch_id: null, is_branch_point: false, branch_level: 0 };
}

// ─── Claude parser ────────────────────────────────────────────────────────────
function _parseClaude(d) {
    const meta = { title: d.name || 'Untitled', created_at: _fmtDate(d.created_at), updated_at: _fmtDate(d.updated_at), uuid: d.uuid || '', project_uuid: d.project_uuid || '', platform: 'claude' };
    const history = (d.chat_messages || []).map((m, i) => {
        const isHuman = m.sender === 'human';
        const msg = _blankMsg(i, m.uuid, m.parent_message_uuid, m.sender, isHuman ? 'User' : 'Claude', _fmtDate(m.created_at));
        if (Array.isArray(m.content)) _processContentArray(m.content, msg, isHuman);
        else if (m.text) { msg.display_text = m.text; }
        if (Array.isArray(m.attachments)) msg.attachments = m.attachments.map(a => ({ id: a.id || '', file_name: a.file_name || '', file_size: a.file_size || 0, file_type: a.file_type || '', extracted_content: a.extracted_content || '', created_at: _fmtDate(a.created_at) }));
        return msg;
    });
    return { meta_info: meta, chat_history: history, format: 'claude' };
}

// ─── Grok parser ──────────────────────────────────────────────────────────────
function _parseGrok(d) {
    const meta = { title: d.title || 'Untitled', created_at: _fmtDate(d.exportTime), uuid: d.conversationId || '', platform: 'grok' };
    const history = (d.responses || []).map((m, i) => {
        const isHuman = m.sender === 'human';
        const msg = _blankMsg(i, m.responseId, m.parentResponseId, m.sender, isHuman ? 'User' : 'Grok', _fmtDate(m.createTime));
        let text = m.message || '';
        if (Array.isArray(m.citations)) {
            const map = new Map();
            m.citations.forEach(c => map.set(c.id, c));
            text = text.replace(/<grok:render card_id="([^"]+)"[\s\S]*?<\/grok:render>/g, (_, id) => {
                const c = map.get(id); return c ? `[${c.title || 'Source'}](${c.url})` : '';
            }).replace(/<grok:render[\s\S]*?<\/grok:render>/g, '').trim();
            msg.citations = m.citations.map(c => ({ url: c.url, title: c.title || 'Source' }));
        }
        msg.display_text = text;
        if (Array.isArray(m.attachments)) msg.attachments = m.attachments;
        return msg;
    });
    return { meta_info: meta, chat_history: history, format: 'grok' };
}

// ─── Gemini / scraped parser ──────────────────────────────────────────────────
function _attachGeminiImages(msg, images) {
    if (!Array.isArray(images) || !images.length) return;
    msg.images = images.map(img => ({
        link: 'data:' + (img.format || 'image/png') + ';base64,' + img.data,
        is_embedded_image: true
    }));
}

function _parseGemini(d) {
    const platform = d.platform || 'gemini';
    const platLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
    const meta = { title: d.title || 'Untitled', created_at: _fmtDate(d.exportedAt), uuid: platform + '_' + Date.now(), platform };
    const history = [];
    let idx = 0;

    (d.conversation || []).forEach((item, turnIdx) => {
        // 多分支版本格式（VersionTracker 输出）
        if (item.turnIndex !== undefined && (item.human?.versions || item.assistant?.versions)) {
            (item.human?.versions || []).forEach(hv => {
                const msg = _blankMsg(idx++, `h_t${turnIdx}_v${hv.version}`, '', 'human', 'User', meta.created_at);
                msg.display_text = hv.text || '';
                if (hv.version > 0) msg.is_branch_point = true;
                _attachGeminiImages(msg, hv.images);
                history.push(msg);
            });

            (item.assistant?.versions || []).forEach(av => {
                const parentUuid = `h_t${turnIdx}_v${av.userVersion ?? 0}`;
                const msg = _blankMsg(idx++, `a_t${turnIdx}_v${av.version}`, parentUuid, 'assistant', platLabel, meta.created_at);
                msg.display_text = av.text || '';
                if (av.version > 0) msg.is_branch_point = true;
                if (av.thinking) msg.thinking = av.thinking;
                _attachGeminiImages(msg, av.images);
                history.push(msg);
            });
        } else {
            // 普通格式（scraper 输出）
            if (item.human) {
                const hc = typeof item.human === 'string' ? { text: item.human } : item.human;
                const msg = _blankMsg(idx++, 'h_' + idx, '', 'human', 'User', meta.created_at);
                msg.display_text = hc.text || '';
                _attachGeminiImages(msg, hc.images);
                history.push(msg);
            }
            if (item.assistant) {
                const ac = typeof item.assistant === 'string' ? { text: item.assistant } : item.assistant;
                const msg = _blankMsg(idx++, 'a_' + idx, '', 'assistant', platLabel, meta.created_at);
                msg.display_text = ac.text || '';
                if (ac.thinking) msg.thinking = ac.thinking;
                _attachGeminiImages(msg, ac.images);
                history.push(msg);
            }
        }
    });

    return { meta_info: meta, chat_history: history, format: platform };
}

// ─── Dispatch parser by content ──────────────────────────────────────────────
function _parseRaw(jsonData) {
    if (!jsonData || typeof jsonData !== 'object') return null;
    if (jsonData.chat_history && jsonData.format) return jsonData; // already processed
    if (jsonData.chat_messages) return _parseClaude(jsonData);
    if (jsonData.responses && jsonData.conversationId !== undefined) return _parseGrok(jsonData);
    if (jsonData.conversation && jsonData.platform) return _parseGemini(jsonData);
    return null;
}

// ─── Format helpers (ported from formatHelpers.js) ───────────────────────────
function _escXml(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

function _details(summary, lines) {
    return ['<details>', `<summary>${summary}</summary>`, '', ...(Array.isArray(lines) ? lines : [lines]), '</details>', ''].join('\n');
}

function _fmtAttachments(atts, opts) {
    if (!atts || !atts.length) return '';
    const lines = ['<attachments>'];
    atts.forEach((a, i) => {
        lines.push(`<attachment index="${i+1}">`, `<file_name>${_escXml(a.file_name || '')}</file_name>`, `<file_size>${a.file_size || 0}</file_size>`);
        if (a.created_at) lines.push(`<created_at>${_escXml(a.created_at)}</created_at>`);
        if (a.extracted_content) {
            lines.push('<attachment_content>');
            lines.push(opts?.includeAttachments !== false ? a.extracted_content : a.extracted_content.substring(0, 200) + (a.extracted_content.length > 200 ? '...' : ''));
            lines.push('</attachment_content>');
        }
        lines.push('</attachment>', '');
    });
    lines.push('</attachments>', '');
    return lines.join('\n');
}

function _fmtThinking(thinking, fmt, label) {
    label = label || _mdT('format.thinkingLabel', '💭 Thinking:');
    switch (fmt) {
        case 'xml': return ['<anthropic_thinking>', thinking, '</anthropic_thinking>', ''].join('\n');
        case 'emoji': return [label, '```', thinking, '```', ''].join('\n');
        default: return ['``` thinking', thinking, '```', ''].join('\n');
    }
}

function _fmtArtifact(a) {
    const typeLabel = _mdT('format.typeLabel', 'Type:');
    const langLabel = _mdT('format.language', 'Language:');
    const contLabel = _mdT('format.content', 'Content:');
    const artLabel  = _mdT('format.artifact', 'Artifact:');
    const noTitle   = _mdT('format.noTitle', '(no title)');
    const lines = [`${typeLabel} \`${a.type || ''}\``, ''];
    if (a.command === 'create' && a.content) {
        if (a.language) lines.push(`${langLabel} \`${a.language}\``);
        lines.push('', contLabel, `\`\`\`${a.language || ''}`, a.content, '```');
    }
    return _details(`${artLabel} ${a.title || noTitle}`, lines);
}

function _fmtTool(t) {
    const toolLabel   = _mdT('format.tool', 'Tool:');
    const queryLabel  = _mdT('format.searchQuery', 'Query:');
    const resultLabel = _mdT('format.searchResults', 'Results:');
    const noTitle     = _mdT('format.noTitle', '(no title)');
    const lines = [];
    if (t.query) lines.push(`${queryLabel} \`${t.query}\``, '');
    if (t.result?.content && t.name === 'web_search_tool') {
        lines.push(resultLabel, '');
        t.result.content.slice(0, 5).forEach((item, i) => lines.push(`${i+1}. [${item.title || noTitle}](${item.url || '#'})`));
    }
    return _details(`${toolLabel} ${t.name}`, lines);
}

function _fmtCitations(cits) {
    const label = _mdT('format.citations', 'Citations');
    const unk   = _mdT('format.unknownSource', 'Unknown');
    const lines = ['| Title | Source |', '| --- | --- |'];
    cits.forEach(c => {
        const url = c.url || '#';
        const src = url.includes('/') ? url.split('/')[2] : unk;
        lines.push(`| [${c.title || unk}](${url}) | ${src} |`);
    });
    return _details(label, lines);
}

function _branchMarker(msg) {
    if (msg.is_branch_point) return ' 🔀';
    if (msg.branch_level > 0) {
        const b = msg.branch_id || '';
        const dot = b.match(/^main((?:\.\d+)+)$/);
        if (dot) return ' ↳' + dot[1].slice(1).replace(/\./g, '-');
        const alt = [...b.matchAll(/_alt(\d+)/g)].map(m => m[1]).join('-');
        if (alt) return ' ↳' + alt;
        return ' ↳' + msg.branch_level;
    }
    return '';
}

function _senderLabel(msg, cfg) {
    const isHuman = msg.sender === 'human';
    const fmt = (cfg || {}).senderFormat || 'default';
    if (fmt === 'default') return isHuman ? 'User' : 'AI';
    if (fmt === 'human-assistant') return isHuman ? 'Human' : 'Assistant';
    if (fmt === 'custom' && cfg.humanLabel && cfg.assistantLabel) return isHuman ? cfg.humanLabel : cfg.assistantLabel;
    return msg.sender_label || (isHuman ? 'Human' : 'Assistant');
}

function _toExcelCol(n) { let r = ''; while (n > 0) { n--; r = String.fromCharCode(65 + (n % 26)) + r; n = Math.floor(n / 26); } return r; }

function _toRoman(n) {
    if (n <= 0 || n >= 4000) return String(n);
    const vs = [1000,900,500,400,100,90,50,40,10,9,5,4,1], ss = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let r = '';
    for (let i = 0; i < vs.length; i++) while (n >= vs[i]) { r += ss[i]; n -= vs[i]; }
    return r;
}

// ─── Markdown generation ──────────────────────────────────────────────────────
function _generateMarkdown(processedData, cfg) {
    cfg = cfg || {};
    const { meta_info = {}, chat_history = [] } = processedData;
    const title = meta_info.title || _mdT('metadata.defaultTitle', 'Conversation');
    const lines = [];

    // Header
    lines.push(`# ${title}`);
    lines.push(`*${_mdT('metadata.created', 'Created')}: ${meta_info.created_at || ''}*`);
    lines.push(`*${_mdT('metadata.exportTime', 'Exported')}: ${new Date().toLocaleString()}*`);
    lines.push('', '---', '');

    const thinkFmt = cfg.thinkingFormat || 'codeblock';
    const thinkLabel = _mdT('format.thinkingLabel', '💭 Thinking:');
    const hLevel = cfg.includeHeaderPrefix !== false ? '#'.repeat(cfg.headerLevel || 2) + ' ' : '';
    const msgLines = [];

    chat_history.forEach((msg, i) => {
        const num = i + 1;
        const bm = cfg.includeBranchMarkers !== false ? _branchMarker(msg) : '';
        let msgHeader = hLevel;
        if (cfg.includeNumbering !== false && cfg.numberingFormat !== 'none') {
            const fmt = cfg.numberingFormat || 'numeric';
            if (fmt === 'letter') msgHeader += _toExcelCol(num) + '. ';
            else if (fmt === 'roman') msgHeader += _toRoman(num) + '. ';
            else msgHeader += num + '. ';
        }
        msgHeader += _senderLabel(msg, cfg) + bm;

        const part = [msgHeader];
        if (cfg.includeTimestamps && msg.timestamp) part.push(`*${msg.timestamp}*`);
        part.push('');

        if (msg.thinking && cfg.includeThinking && msg.sender !== 'human' && (thinkFmt === 'codeblock' || thinkFmt === 'xml'))
            part.push(_fmtThinking(msg.thinking, thinkFmt, thinkLabel));
        if (msg.display_text) part.push(msg.display_text, '');
        if (msg.attachments?.length && cfg.includeAttachments !== false && msg.sender === 'human')
            part.push(_fmtAttachments(msg.attachments, cfg));
        if (msg.thinking && cfg.includeThinking && msg.sender !== 'human' && thinkFmt === 'emoji')
            part.push(_fmtThinking(msg.thinking, thinkFmt, thinkLabel));
        if (msg.artifacts?.length && cfg.includeArtifacts !== false && msg.sender !== 'human')
            msg.artifacts.forEach(a => part.push(_fmtArtifact(a)));
        if (msg.tools?.length && cfg.includeTools !== false)
            msg.tools.forEach(t => part.push(_fmtTool(t)));
        if (msg.citations?.length && cfg.includeCitations !== false)
            part.push(_fmtCitations(msg.citations));

        msgLines.push(part.join('\n'));
    });

    lines.push(msgLines.join('\n---\n\n'));
    return lines.join('\n');
}

// ─── Image processing ─────────────────────────────────────────────────────────
function _processImages(messages) {
    const imageFiles = [];
    const processed = messages.map(msg => {
        if (!msg.images || !msg.images.length) return msg;
        let text = msg.display_text || '';
        msg.images.forEach((img, idx) => {
            const placeholder = img.placeholder || ` [图片${idx + 1}] `;
            const data = img.embedded_image?.data || (img.is_embedded_image ? img.link : null);
            if (data) {
                const m = data.match(/^data:([^;]+);base64,(.+)$/);
                if (m) {
                    const ext = m[1].split('/')[1] || 'jpg';
                    const n = imageFiles.length + 1;
                    const zipPath = `images/img_${String(n).padStart(3,'0')}.${ext}`;
                    imageFiles.push({ zipPath, base64Data: m[2], mimeType: m[1] });
                    text = text.replace(placeholder.trim(), `![${img.file_name || 'image_' + n}](${zipPath})`);
                }
            }
        });
        return { ...msg, display_text: text };
    });
    return { messages: processed, imageFiles };
}

// ─── Context block ────────────────────────────────────────────────────────────
function _contextBlock(exportContext, knowledgeRefs) {
    if (!exportContext) return '';
    const { projectInfo, userMemory } = exportContext;
    if (!projectInfo && !userMemory) return '';
    const toStr = v => !v ? '' : typeof v === 'string' ? v : JSON.stringify(v, null, 2);
    const parts = [];
    if (userMemory) {
        const mem = toStr(userMemory.memories); if (mem) parts.push(`<userMemories>${mem.replace(/\n/g,'\\n')}</userMemories>`);
        const pref = toStr(userMemory.preferences); if (pref) parts.push(`<userPreferences>${pref.replace(/\n/g,'\\n')}</userPreferences>`);
    }
    if (projectInfo) {
        const mem = toStr(projectInfo.memory); if (mem) parts.push(`<projectMemories>${mem.replace(/\n/g,'\\n')}</projectMemories>`);
        const ins = toStr(projectInfo.instructions); if (ins) parts.push(`<projectInstructions>${ins.replace(/\n/g,'\\n')}</projectInstructions>`);
        if (knowledgeRefs?.length) parts.push(`<projectKnowledge>${knowledgeRefs.map(r=>`- [${r.name}](${r.zipPath})`).join('\\n')}</projectKnowledge>`);
    }
    return parts.length ? parts.join('') + '\n\n---\n\n' : '';
}

// ─── Download helpers ─────────────────────────────────────────────────────────
function _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    (document.body || document.documentElement).appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 500);
}

async function _downloadMarkdownExport(result) {
    const { needsZip, mdText, imageFiles, knowledgeFiles, filename } = result;
    if (!needsZip) {
        _triggerDownload(new Blob([mdText], { type: 'text/markdown;charset=utf-8' }), filename);
        return;
    }
    // ZIP: use global fflate (extension injects fflate.min.js; userscript uses @require)
    const fl = (typeof fflate !== 'undefined') ? fflate : null;
    if (!fl || typeof fl.zip !== 'function') {
        // Fallback: download plain md without images
        console.warn('[Loominary] fflate not available, downloading Markdown without images');
        _triggerDownload(new Blob([mdText], { type: 'text/markdown;charset=utf-8' }), filename.replace('.zip', '.md'));
        return;
    }
    const entries = {};
    entries['conversation.md'] = fl.strToU8(mdText);
    for (const { zipPath, base64Data } of imageFiles) {
        const bin = atob(base64Data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        entries[zipPath] = bytes;
    }
    for (const { zipPath, content } of knowledgeFiles) {
        entries[zipPath] = fl.strToU8(content);
    }
    await new Promise((resolve, reject) => {
        fl.zip(entries, { level: 1 }, (err, data) => {
            if (err) { reject(err); return; }
            _triggerDownload(new Blob([data], { type: 'application/zip' }), filename);
            resolve();
        });
    });
}

// ─── Config builder ───────────────────────────────────────────────────────────
function _buildGenConfig(c) {
    c = c || {};
    return {
        includeTimestamps: !!c.includeTimestamps,
        includeThinking: !!c.includeThinking,
        includeArtifacts: c.includeArtifacts !== false,
        includeTools: !!c.includeTools,
        includeCitations: !!c.includeCitations,
        includeAttachments: c.includeAttachments !== false,
        includeBranchMarkers: c.includeBranchMarkers !== false,
        includeNumbering: c.includeNumbering !== false,
        numberingFormat: c.numberingFormat || 'numeric',
        senderFormat: c.senderFormat || 'default',
        humanLabel: c.humanLabel || 'Human',
        assistantLabel: c.assistantLabel || 'Assistant',
        includeHeaderPrefix: c.includeHeaderPrefix !== false,
        headerLevel: c.headerLevel || 2,
        thinkingFormat: c.thinkingFormat || 'codeblock',
    };
}

// ─── Read export config from storage ─────────────────────────────────────────
async function _readExportConfig() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local?.get) {
        return new Promise(resolve =>
            chrome.storage.local.get(['loominary_export_config'], r => {
                const cfg = r.loominary_export_config || {};
                console.log('[Loominary] _readExportConfig (extension):', JSON.stringify(cfg));
                resolve(cfg);
            })
        );
    }
    // Userscript: localStorage on the AI site
    try {
        const raw = localStorage.getItem('loominary_export_config') || '{}';
        const cfg = JSON.parse(raw);
        console.log('[Loominary] _readExportConfig (userscript), raw:', raw);
        return cfg;
    }
    catch (_) { return {}; }
}

// ─── Main export entry point ──────────────────────────────────────────────────
async function loominaryExportMarkdown(rawData, baseFilename, exportConfig, exportContext) {
    const parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    const processedData = _parseRaw(parsedData);
    if (!processedData) {
        alert('[Loominary] Could not parse conversation data.');
        return;
    }

    const cfg = exportConfig || await _readExportConfig();
    const genCfg = _buildGenConfig(cfg);

    // Process images in messages
    const { messages: processedMsgs, imageFiles } = _processImages(processedData.chat_history || []);

    // Process knowledge files
    const knowledgeFiles = [];
    const knowledgeRefs = [];
    if (exportContext?.projectInfo?.knowledgeFiles) {
        exportContext.projectInfo.knowledgeFiles.forEach(({ name, content }) => {
            const safe = name.replace(/[<>:"/\\|?*]/g, '_');
            const zipPath = 'knowledge/' + safe;
            knowledgeFiles.push({ zipPath, content });
            knowledgeRefs.push({ name, zipPath });
        });
    }

    const contextBlock = _contextBlock(exportContext || null, knowledgeRefs);
    const bodyMd = _generateMarkdown({ ...processedData, chat_history: processedMsgs }, genCfg);
    const mdText = contextBlock ? contextBlock + bodyMd : bodyMd;

    const needsZip = imageFiles.length > 0 || knowledgeFiles.length > 0;
    const filename = (baseFilename || 'conversation') + (needsZip ? '.zip' : '.md');

    await _downloadMarkdownExport({ needsZip, mdText, imageFiles, knowledgeFiles, filename });
}


const ClaudeHandler = {
    _cache: {
        baseUrl: null,
        accountData: null,
        allConversations: null,
        allConversationsTime: 0,
    },
    init: () => {
        // 扩展模式下 injected.js 已通过 script.src 注入（符合 CSP），不需要 inline script
        const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
        if (!isExtension) {
            // Userscript 模式：通过 unsafeWindow 直接拦截 fetch/XHR 以捕获 userId
            // CSP 阻止内联 script 注入，但 unsafeWindow 可以直接修改页面的 window 对象
            function captureUserId(url) {
                const match = url && url.match(/\/api\/organizations\/([a-f0-9-]+)\//);
                if (match && match[1] && !State.capturedUserId) {
                    State.capturedUserId = match[1];
                    localStorage.setItem('claudeUserId', match[1]);
                }
            }
            const uw = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            const origFetch = uw.fetch;
            uw.fetch = function(resource) {
                const url = typeof resource === 'string' ? resource : (resource && resource.url || '');
                captureUserId(url);
                return origFetch.apply(uw, arguments);
            };
            const origXHROpen = uw.XMLHttpRequest.prototype.open;
            uw.XMLHttpRequest.prototype.open = function() {
                if (arguments[1]) captureUserId(arguments[1]);
                return origXHROpen.apply(this, arguments);
            };
        } else {
            // 扩展模式：injected.js 通过 postMessage 发送 LOOMINARY_USER_ID_CAPTURED
            // build.py 的 header 已在 content.js 顶部监听并写入 localStorage
            // 这里直接从 localStorage 读取已捕获的 userId（延迟读取，首次使用时通过 ensureUserId 获取）
        }
    },
    addUI: (controlsArea) => {

        const savedTreeMode = localStorage.getItem('treeMode');
        const treeMode = savedTreeMode !== null ? savedTreeMode === 'true' : true;
        const branchToggle = Utils.createToggle(i18n.t('branchMode'), Config.TREE_SWITCH_ID, treeMode);
        branchToggle.querySelector('input')?.addEventListener('change', (e) => {
            localStorage.setItem('treeMode', e.target.checked);
        });
        controlsArea.appendChild(branchToggle);

        controlsArea.appendChild(Utils.createToggle(i18n.t('includeImages'), Config.IMAGE_SWITCH_ID, State.includeImages));
        document.getElementById(Config.IMAGE_SWITCH_ID)?.addEventListener('change', (e) => {
            State.includeImages = e.target.checked;
            localStorage.setItem('includeImages', State.includeImages);
        });

        const memoryToggle = Utils.createToggle(
            i18n.currentLang === 'zh' ? '含记忆' : 'Memory',
            'loominary-memory-switch',
            false
        );
        const memoryToggleEl = memoryToggle.querySelector('input');
        controlsArea.appendChild(memoryToggle);
        ClaudeHandler.getAccountSettings().then(settings => {
            if (settings && memoryToggleEl) {
                memoryToggleEl.checked = settings.enabled_saffron !== false;
            }
        });
        memoryToggleEl?.addEventListener('change', async (e) => {
            const toggle = e.target;
            const newValue = toggle.checked;
            toggle.disabled = true;
            try {
                const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/account/settings`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ enabled_saffron: newValue })
                });
                if (!response.ok) throw new Error('Failed to update');
                location.reload();
            } catch (error) {
                toggle.checked = !newValue;
                toggle.disabled = false;
                State.showToast(i18n.currentLang === 'zh' ? '更新失败' : 'Update failed', 'error');
            }
        });
    },
    addButtons: (controlsArea) => {
        controlsArea.appendChild(Utils.createButton(
            `${previewIcon} ${i18n.t('viewOnline')}`,
            async (btn) => {
                const uuid = ClaudeHandler.getCurrentUUID();
                if (!uuid) { alert(i18n.t('uuidNotFound')); return; }
                if (!await ClaudeHandler.ensureUserId()) return;
                const original = btn.innerHTML;
                Utils.setButtonLoading(btn, i18n.t('loading'));
                try {
                    const includeImages = document.getElementById(Config.IMAGE_SWITCH_ID)?.checked || false;
                    const [data, meta] = await Promise.all([
                        ClaudeHandler.getConversation(uuid, includeImages),
                        ClaudeHandler.getConversationMeta(uuid)
                    ]);
                    if (!data) throw new Error(i18n.t('fetchFailed'));
                    if (meta) {
                        if (meta.project_uuid) data.project_uuid = meta.project_uuid;
                        if (meta.project) data.project = meta.project;
                    }

                    // 读取导出配置并收集 exportContext（project 信息 / 用户记忆）
                    const exportCfg = await _readExportConfig();
                    const ctx = {};
                    const projectUuid = data.project_uuid;

                    if (exportCfg.includeProjectInfo && projectUuid) {
                        const [detail, memory, files] = await Promise.all([
                            ClaudeHandler.getProjectDetail(projectUuid),
                            ClaudeHandler.getProjectMemory(projectUuid),
                            ClaudeHandler.getProjectFiles(projectUuid)
                        ]);
                        const knowledgeFiles = [];
                        if (files && files.length > 0) {
                            const fileResults = await Promise.allSettled(
                                files.map(f => ClaudeHandler.getProjectFileContent(projectUuid, f.uuid)
                                    .then(content => ({ name: f.file_name || f.uuid, content })))
                            );
                            for (const r of fileResults) {
                                if (r.status === 'fulfilled' && r.value.content) {
                                    const c = r.value.content;
                                    knowledgeFiles.push({ name: r.value.name, content: typeof c === 'string' ? c : JSON.stringify(c) });
                                }
                            }
                        }
                        ctx.projectInfo = {
                            name: detail?.name || data.project?.name || '',
                            description: detail?.description || '',
                            instructions: detail?.prompt_template || '',
                            memory: memory?.memory || '',
                            knowledgeFiles
                        };
                    }

                    if (exportCfg.includeUserMemory) {
                        const [profile, globalMem] = await Promise.all([
                            ClaudeHandler.getUserProfile(),
                            ClaudeHandler.getGlobalMemory()
                        ]);
                        ctx.userMemory = {
                            preferences: profile?.conversation_preferences || '',
                            memories: globalMem?.memory || ''
                        };
                    }

                    const exportContext = Object.keys(ctx).length ? ctx : undefined;
                    const jsonString = JSON.stringify(data, null, 2);
                    const filename = `claude_${data.name || 'conversation'}_${uuid.substring(0, 8)}.json`;
                    await Communicator.open(jsonString, filename, exportContext ? { exportContext } : undefined);
                } catch (error) {
                    ErrorHandler.handle(error, 'Preview conversation', {
                        userMessage: `${i18n.t('loadFailed')} ${error.message}`
                    });
                } finally {
                    Utils.restoreButton(btn, original);
                }
            }
        ));
        controlsArea.appendChild(Utils.createButton(
            `${exportIcon} ${i18n.t('exportCurrentJSON')}`,
            async (btn) => {
                const uuid = ClaudeHandler.getCurrentUUID();
                if (!uuid) { alert(i18n.t('uuidNotFound')); return; }
                if (!await ClaudeHandler.ensureUserId()) return;
                const original = btn.innerHTML;
                Utils.setButtonLoading(btn, i18n.t('exporting'));
                try {
                    const includeImages = document.getElementById(Config.IMAGE_SWITCH_ID)?.checked || false;
                    const [data, meta] = await Promise.all([
                        ClaudeHandler.getConversation(uuid, includeImages),
                        ClaudeHandler.getConversationMeta(uuid)
                    ]);
                    if (!data) throw new Error(i18n.t('fetchFailed'));
                    if (meta) {
                        if (meta.project_uuid) data.project_uuid = meta.project_uuid;
                        if (meta.project) data.project = meta.project;
                    }

                    // 读取导出配置（extension 从 chrome.storage，userscript 从 localStorage）
                    const exportCfg = await _readExportConfig();
                    const exportContext = {};
                    const projectUuid = data.project_uuid;

                    if (exportCfg.includeProjectInfo && projectUuid) {
                        const [detail, memory, files] = await Promise.all([
                            ClaudeHandler.getProjectDetail(projectUuid),
                            ClaudeHandler.getProjectMemory(projectUuid),
                            ClaudeHandler.getProjectFiles(projectUuid)
                        ]);
                        const knowledgeFiles = [];
                        if (files && files.length > 0) {
                            const fileResults = await Promise.allSettled(
                                files.map(f => ClaudeHandler.getProjectFileContent(projectUuid, f.uuid)
                                    .then(content => ({ name: f.file_name || f.uuid, content })))
                            );
                            for (const r of fileResults) {
                                if (r.status === 'fulfilled' && r.value.content) {
                                    const c = r.value.content;
                                    knowledgeFiles.push({ name: r.value.name, content: typeof c === 'string' ? c : JSON.stringify(c) });
                                }
                            }
                        }
                        exportContext.projectInfo = {
                            name: detail?.name || data.project?.name || '',
                            description: detail?.description || '',
                            instructions: detail?.prompt_template || '',
                            memory: memory?.memory || '',
                            knowledgeFiles
                        };
                    }

                    if (exportCfg.includeUserMemory) {
                        const [profile, globalMem] = await Promise.all([
                            ClaudeHandler.getUserProfile(),
                            ClaudeHandler.getGlobalMemory()
                        ]);
                        exportContext.userMemory = {
                            preferences: profile?.conversation_preferences || '',
                            memories: globalMem?.memory || ''
                        };
                    }

                    const title = data.name || uuid.substring(0, 8);
                    const filename = `claude_${Utils.sanitizeFilename(title)}_${uuid.substring(0, 8)}`;
                    await loominaryExportMarkdown(data, filename, exportCfg, Object.keys(exportContext).length ? exportContext : null);
                } catch (error) {
                    ErrorHandler.handle(error, 'Export conversation markdown');
                } finally {
                    Utils.restoreButton(btn, original);
                }
            }
        ));
        controlsArea.appendChild(Utils.createButton(
            `${zipIcon} ${i18n.t('exportAllConversations')}`,
            async (btn) => {
                return ClaudeHandler.exportAll(btn, controlsArea);
            }
        ));
    },
    getCurrentUUID: () => window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/)?.[1],
    ensureUserId: async () => {
        if (State.capturedUserId) return State.capturedUserId;
        const saved = localStorage.getItem('claudeUserId');
        if (saved) {
            State.capturedUserId = saved;
            return saved;
        }
        alert('未能检测到用户ID / User ID not detected');
        return null;
    },
    getBaseUrl: () => {
        if (ClaudeHandler._cache.baseUrl) return ClaudeHandler._cache.baseUrl;
        let url;
        if (window.location.hostname.includes('claude.ai')) {
            url = 'https://claude.ai';
        } else {
            url = window.location.origin;
        }
        ClaudeHandler._cache.baseUrl = url;
        return url;
    },
    getAllConversations: async (skipCache = false) => {
        const now = Date.now();
        if (!skipCache && ClaudeHandler._cache.allConversations && now - ClaudeHandler._cache.allConversationsTime < 30000) {
            return ClaudeHandler._cache.allConversations;
        }
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/organizations/${userId}/chat_conversations`);
            if (!response.ok) throw new Error('Fetch failed');
            const data = await response.json();
            ClaudeHandler._cache.allConversations = data;
            ClaudeHandler._cache.allConversationsTime = now;
            return data;
        } catch (error) {
            console.error('Get all conversations error:', error);
            return null;
        }
    },
    getConversationMeta: async (uuid) => {
        try {
            const allConvs = await ClaudeHandler.getAllConversations();
            if (!allConvs || !Array.isArray(allConvs)) return null;
            return allConvs.find(conv => conv.uuid === uuid) || null;
        } catch (error) {
            return null;
        }
    },
    getConversation: async (uuid, includeImages = false, _userId = null) => {
        const userId = _userId || await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const treeMode = document.getElementById(Config.TREE_SWITCH_ID)?.checked || false;
            const endpoint = treeMode ?
                `/api/organizations/${userId}/chat_conversations/${uuid}?tree=True&rendering_mode=messages&render_all_tools=true` :
                `/api/organizations/${userId}/chat_conversations/${uuid}`;
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}${endpoint}`);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            const data = await response.json();
            data.organization_id = userId;
            if (includeImages && data.chat_messages) {
                const imagePromises = [];
                const baseUrl = ClaudeHandler.getBaseUrl();
                for (const msg of data.chat_messages) {
                    for (const key of ['files', 'files_v2', 'attachments']) {
                        if (Array.isArray(msg[key])) {
                            for (const file of msg[key]) {
                                const isImage = file.file_kind === 'image' || file.file_type?.startsWith('image/');
                                const imageUrl = file.preview_url || file.thumbnail_url || file.file_url;
                                if (isImage && imageUrl && !file.embedded_image) {
                                    const fullUrl = imageUrl.startsWith('http') ? imageUrl : baseUrl + imageUrl;
                                    imagePromises.push(
                                        fetch(fullUrl).then(async (imgResp) => {
                                            if (imgResp.ok) {
                                                const blob = await imgResp.blob();
                                                const base64 = await Utils.blobToBase64(blob);
                                                file.embedded_image = { type: 'image', format: blob.type, size: blob.size, data: base64, original_url: imageUrl };
                                            }
                                        }).catch(() => {})
                                    );
                                }
                            }
                        }
                    }
                }
                await Promise.all(imagePromises);
            }
            return data;
        } catch (error) {
            console.error('Get conversation error:', error);
            return null;
        }
    },
    getAllProjects: async () => {
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/organizations/${userId}/projects`);
            if (!response.ok) throw new Error('Fetch projects failed');
            return await response.json();
        } catch (error) {
            return null;
        }
    },
    getProjectDetail: async (projectUuid) => {
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/organizations/${userId}/projects/${projectUuid}`);
            if (!response.ok) throw new Error('Fetch project detail failed');
            return await response.json();
        } catch (error) {
            return null;
        }
    },
    getGlobalMemory: async () => {
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/organizations/${userId}/memory`);
            if (!response.ok) throw new Error('Fetch global memory failed');
            return await response.json();
        } catch (error) {
            return null;
        }
    },
    getProjectMemory: async (projectUuid) => {
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/organizations/${userId}/memory?project_uuid=${projectUuid}`);
            if (!response.ok) throw new Error('Fetch project memory failed');
            return await response.json();
        } catch (error) {
            return null;
        }
    },
    getUserProfile: async () => {
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/account_profile`);
            if (!response.ok) throw new Error('Fetch user profile failed');
            return await response.json();
        } catch (error) {
            return null;
        }
    },
    _fetchAccountData: async () => {
        if (ClaudeHandler._cache.accountData) return ClaudeHandler._cache.accountData;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/account`);
            if (!response.ok) return null;
            const data = await response.json();
            ClaudeHandler._cache.accountData = data;
            return data;
        } catch (error) {
            return null;
        }
    },
    getAccountSettings: async () => {
        const data = await ClaudeHandler._fetchAccountData();
        return data?.settings || null;
    },
    getAccountInfo: async () => {
        return await ClaudeHandler._fetchAccountData();
    },
    getProjectFiles: async (projectUuid) => {
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/organizations/${userId}/projects/${projectUuid}/docs`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            return [];
        }
    },
    getProjectFileContent: async (projectUuid, fileUuid) => {
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/organizations/${userId}/projects/${projectUuid}/docs/${fileUuid}`);
            if (!response.ok) return null;
            const data = await response.json();
            return data.content || data;
        } catch (error) {
            return null;
        }
    },
    exportAll: async (btn, controlsArea) => {
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return;

        // 检查导出模式配置
        const isExtensionMode = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
        let exportAllMode = 'zip';
        try {
            let exportCfg = {};
            if (isExtensionMode) {
                exportCfg = await new Promise(resolve =>
                    chrome.storage.local.get(['loominary_export_config'], r => resolve(r.loominary_export_config || {}))
                );
            } else {
                const raw = localStorage.getItem('loominary_export_config') || '{}';
                exportCfg = JSON.parse(raw);
            }
            exportAllMode = exportCfg.exportAllMode || 'zip';
        } catch (e) {}

        const original = btn.innerHTML;
        Utils.setButtonLoading(btn, i18n.t('detectingConversations'));

        let allConvs;
        try {
            allConvs = await ClaudeHandler.getAllConversations();
            if (!allConvs || !Array.isArray(allConvs)) throw new Error(i18n.t('fetchFailed'));
        } catch (error) {
            ErrorHandler.handle(error, 'Detect conversations');
            Utils.restoreButton(btn, original);
            return;
        }

        const totalCount = allConvs.length;
        Utils.restoreButton(btn, original);

        // app 模式：发送对话列表元数据到 React App
        if (exportAllMode === 'app') {
            const conversations = allConvs.map(conv => ({
                uuid: conv.uuid,
                name: conv.name || conv.uuid,
                created_at: conv.created_at || null,
                updated_at: conv.updated_at || null,
                project_uuid: conv.project_uuid || null,
                project: conv.project || null,
            }));
            const baseUrl = ClaudeHandler.getBaseUrl();
            await Communicator.open(null, 'browse_all', {
                action: 'browse_all',
                conversations,
                userId,
                baseUrl
            });
            return;
        }

        // zip 模式：检查压缩库
        if (typeof fflate === 'undefined' || typeof fflate.zip !== 'function' || typeof fflate.strToU8 !== 'function') {
            const errorMsg = i18n.currentLang === 'zh'
                ? '批量导出功能需要压缩库支持。\n\n由于当前平台的安全策略限制,该功能暂时不可用。\n建议使用"导出当前"功能单个导出对话。'
                : 'Batch export requires compression library.\n\nThis feature is currently unavailable due to platform security policies.\nPlease use "Export" button to export conversations individually.';
            alert(errorMsg);
            return;
        }

        const promptMsg = `${i18n.t('foundConversations')} ${totalCount} ${i18n.t('conversations')}\n\n${i18n.t('selectExportCount')}`;
        const userInput = prompt(promptMsg, totalCount.toString());

        if (userInput === null) {
            alert(i18n.t('exportCancelled'));
            return;
        }

        let exportCount = totalCount;
        const trimmedInput = userInput.trim();

        if (trimmedInput !== '' && trimmedInput !== '0') {
            const parsed = parseInt(trimmedInput, 10);
            if (isNaN(parsed) || parsed < 0) {
                alert(i18n.t('invalidNumber'));
                return;
            }
            exportCount = Math.min(parsed, totalCount);
        }

        const progress = Utils.createProgressElem(controlsArea);
        progress.textContent = i18n.t('preparing');
        Utils.setButtonLoading(btn, i18n.t('exporting'));

        const accountInfo = await ClaudeHandler.getAccountInfo();
        const accountName = Utils.sanitizeFilename(accountInfo?.display_name || accountInfo?.full_name || 'claude');

        // 读取 popup 导出配置
        let includeProjectInfo = true, includeUserMemory = true;
        const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
        try {
            let exportCfg = {};
            if (isExtension) {
                exportCfg = await new Promise(resolve =>
                    chrome.storage.local.get(['loominary_export_config'], r => resolve(r.loominary_export_config || {}))
                );
            } else {
                const raw = localStorage.getItem('loominary_export_config') || '{}';
                exportCfg = JSON.parse(raw);
            }
            includeProjectInfo = exportCfg.includeProjectInfo !== false;
            includeUserMemory = exportCfg.includeUserMemory !== false;
        } catch (e) {}

        try {
            const includeImages = document.getElementById(Config.IMAGE_SWITCH_ID)?.checked || false;
            let exported = 0;
            const convsToExport = allConvs.slice(0, exportCount);
            const zipEntries = {};

            const BATCH_SIZE = 25;
            for (let i = 0; i < convsToExport.length; i += BATCH_SIZE) {
                const batch = convsToExport.slice(i, i + BATCH_SIZE);
                progress.textContent = `${i18n.t('gettingConversation')} ${i + 1}-${Math.min(i + BATCH_SIZE, convsToExport.length)}/${convsToExport.length}${includeImages ? i18n.t('withImages') : ''}`;

                const results = await Promise.allSettled(
                    batch.map(conv => ClaudeHandler.getConversation(conv.uuid, includeImages, userId).then(data => ({ conv, data })))
                );

                for (const result of results) {
                    if (result.status === 'fulfilled' && result.value.data) {
                        const { conv, data } = result.value;
                        if (conv.project_uuid) data.project_uuid = conv.project_uuid;
                        if (conv.project) data.project = conv.project;
                        const title = Utils.sanitizeFilename(data.name || conv.uuid);
                        const filename = `claude_${conv.uuid.substring(0, 8)}_${title}.json`;
                        zipEntries[filename] = fflate.strToU8(JSON.stringify(data, null, 2));
                        exported++;
                    }
                }

                if (i + BATCH_SIZE < convsToExport.length) {
                    await Utils.sleep(Config.TIMING.BATCH_EXPORT_SLEEP);
                }
            }

            if (includeProjectInfo || includeUserMemory) {
            progress.textContent = i18n.currentLang === 'zh' ? '正在获取项目数据...' : 'Fetching project data...';
            const projectsMeta = { exported_at: new Date().toISOString(), organization_id: userId, user_instructions: null, global_memory: null, projects: [] };

            if (includeUserMemory) {
            try {
                const profile = await ClaudeHandler.getUserProfile();
                if (profile?.conversation_preferences) projectsMeta.user_instructions = profile.conversation_preferences;
            } catch (e) {}

            try {
                const globalMem = await ClaudeHandler.getGlobalMemory();
                if (globalMem) projectsMeta.global_memory = globalMem;
            } catch (e) {}
            }

            if (includeProjectInfo) {
            try {
                const projects = await ClaudeHandler.getAllProjects();
                if (projects && Array.isArray(projects)) {
                    const projectResults = await Promise.allSettled(
                        projects.map(async (proj) => {
                            const [detail, memory, files] = await Promise.all([
                                ClaudeHandler.getProjectDetail(proj.uuid),
                                ClaudeHandler.getProjectMemory(proj.uuid),
                                ClaudeHandler.getProjectFiles(proj.uuid)
                            ]);
                            const knowledgeFiles = [];
                            if (files && files.length > 0) {
                                const fileResults = await Promise.allSettled(
                                    files.map((file, fileIdx) =>
                                        ClaudeHandler.getProjectFileContent(proj.uuid, file.uuid).then(content => ({ file, fileIdx, content }))
                                    )
                                );
                                for (const result of fileResults) {
                                    if (result.status === 'fulfilled' && result.value.content) {
                                        const { file, fileIdx, content } = result.value;
                                        const rawName = file.file_name || file.uuid;
                                        const ext = rawName.match(/\.([^.]+)$/)?.[1] || 'txt';
                                        const baseName = Utils.sanitizeFilename(rawName.replace(/\.[^.]+$/, '')) || 'file';
                                        const projName = Utils.sanitizeFilename(proj.name || proj.uuid.substring(0, 8));
                                        const needsPrefix = /[\u0080-\uFFFF]/.test(rawName) && !/[\u4e00-\u9fa5]/.test(rawName);
                                        const seqNum = needsPrefix ? String(fileIdx + 1).padStart(3, '0') + '_' : '';
                                        const filename = `projects/${projName}_${seqNum}${baseName}.${ext}`;
                                        zipEntries[filename] = fflate.strToU8(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
                                        knowledgeFiles.push(filename);
                                    }
                                }
                            }
                            return {
                                uuid: proj.uuid,
                                name: proj.name || '(unnamed)',
                                description: detail?.description || '',
                                instructions: detail?.prompt_template || '',
                                memory: memory?.memory || '',
                                memory_updated_at: memory?.updated_at || null,
                                archived: !!proj.archived_at,
                                knowledge_files: knowledgeFiles
                            };
                        })
                    );
                    for (const result of projectResults) {
                        if (result.status === 'fulfilled') projectsMeta.projects.push(result.value);
                    }
                }
            } catch (e) {}
            } // end includeProjectInfo

            zipEntries[`projects/${userId}_projects.json`] = fflate.strToU8(JSON.stringify(projectsMeta, null, 2));
            } // end includeProjectInfo || includeUserMemory

            progress.textContent = `${i18n.t('compressing')}…`;

            const zipUint8 = await new Promise((resolve, reject) => {
                fflate.zip(zipEntries, { level: 1 }, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });
            const zipBlob = new Blob([zipUint8], { type: 'application/zip' });
            const zipFilename = `claude_${accountName}_${exportCount === totalCount ? 'all' : 'recent_' + exportCount}_${new Date().toISOString().slice(0, 10)}.zip`;

            Utils.downloadFile(zipBlob, zipFilename);
            alert(`${i18n.t('successExported')} ${exported} ${i18n.t('conversations')}`);
        } catch (error) {
            ErrorHandler.handle(error, 'Export all conversations');
        } finally {
            Utils.restoreButton(btn, original);
            if (progress.parentNode) progress.parentNode.removeChild(progress);
        }
    }
};


    // Helper function to fetch images via GM_xmlhttpRequest (bypass CORS)
    function fetchViaGM(url, headers = {}) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                fetch(url, { headers }).then(r => {
                    if (r.ok) return r.blob();
                    return Promise.reject(new Error(`Status: ${r.status}`));
                }).then(resolve).catch(reject);
                return;
            }
            GM_xmlhttpRequest({
                method: "GET",
                url,
                headers,
                responseType: "blob",
                onload: r => {
                    if (r.status >= 200 && r.status < 300) {
                        resolve(r.response);
                    } else {
                        reject(new Error(`Status: ${r.status}`));
                    }
                },
                onerror: e => reject(new Error(e.statusText || 'Network error'))
            });
        });
    }

    // Process image element and return base64 data
    async function processImageElement(imgElement, accessToken = null) {
        if (!imgElement) return null;
        const url = imgElement.src;
        if (!url || url.startsWith('data:')) return null;

        try {
            let base64Data, mimeType, size;

            if (url.startsWith('blob:')) {
                try {
                    const blob = await fetch(url).then(r => r.ok ? r.blob() : Promise.reject());
                    base64Data = await Utils.blobToBase64(blob);
                    mimeType = blob.type;
                    size = blob.size;
                } catch {
                    // Canvas fallback
                    const canvas = document.createElement('canvas');
                    canvas.width = imgElement.naturalWidth || imgElement.width;
                    canvas.height = imgElement.naturalHeight || imgElement.height;
                    canvas.getContext('2d').drawImage(imgElement, 0, 0);

                    const isPhoto = canvas.width * canvas.height > 50000;
                    const dataURL = isPhoto ? canvas.toDataURL('image/jpeg', 0.85) : canvas.toDataURL('image/png');
                    mimeType = isPhoto ? 'image/jpeg' : 'image/png';
                    base64Data = dataURL.split(',')[1];
                    size = Math.round((base64Data.length * 3) / 4);
                }
            } else {
                const headers = {};
                if (url.includes('backend-api') && accessToken) {
                    headers['Authorization'] = `Bearer ${accessToken}`;
                }

                const blob = await fetchViaGM(url, headers);
                base64Data = await Utils.blobToBase64(blob);
                mimeType = blob.type;
                size = blob.size;

                // Fix MIME type if it's octet-stream or empty
                if (!mimeType || mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) {
                    if (url.includes('.jpg') || url.includes('.jpeg')) {
                        mimeType = 'image/jpeg';
                    } else if (url.includes('.png')) {
                        mimeType = 'image/png';
                    } else if (url.includes('.gif')) {
                        mimeType = 'image/gif';
                    } else if (url.includes('.webp')) {
                        mimeType = 'image/webp';
                    } else {
                        // Detect from base64 magic bytes
                        const firstBytes = base64Data.substring(0, 20);
                        if (firstBytes.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
                        else if (firstBytes.startsWith('/9j/')) mimeType = 'image/jpeg';
                        else if (firstBytes.startsWith('R0lGOD')) mimeType = 'image/gif';
                        else if (firstBytes.startsWith('UklGR')) mimeType = 'image/webp';
                        else mimeType = 'image/png';
                    }
                }
            }

            return { type: 'image', format: mimeType, size, data: base64Data, original_src: url };
        } catch (e) {
            console.error('[ChatGPT] Failed to process image:', url.substring(0, 80));
            return null;
        }
    }

    const ChatGPTHandler = {
        init: () => {
            const rawFetch = window.fetch;
            window.fetch = async function(resource, options) {
                const headers = options?.headers;
                if (headers) {
                    let authHeader = null;
                    if (typeof headers === 'string') {
                        authHeader = headers;
                    } else if (headers instanceof Headers) {
                        authHeader = headers.get('Authorization');
                    } else {
                        authHeader = headers.Authorization || headers.authorization;
                    }

                    if (authHeader?.startsWith('Bearer ')) {
                        const token = authHeader.slice(7);
                        if (token && token.toLowerCase() !== 'dummy') {
                            State.chatgptAccessToken = token;
                        }
                    }
                }

                return rawFetch.apply(this, arguments);
            };
        },

        ensureAccessToken: async () => {
            if (State.chatgptAccessToken) return State.chatgptAccessToken;

            try {
                const response = await fetch('/api/auth/session?unstable_client=true');
                const session = await response.json();
                if (session.accessToken) {
                    State.chatgptAccessToken = session.accessToken;
                    return session.accessToken;
                }
            } catch (error) {
                console.error('Failed to get access token:', error);
            }

            return null;
        },

        getOaiDeviceId: () => {
            const cookieString = document.cookie;
            const match = cookieString.match(/oai-did=([^;]+)/);
            return match ? match[1] : null;
        },

        getCurrentConversationId: () => {
            const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
            return match ? match[1] : null;
        },

        getAllConversations: async () => {
            const token = await ChatGPTHandler.ensureAccessToken();
            if (!token) throw new Error(i18n.t('tokenNotFound'));

            const deviceId = ChatGPTHandler.getOaiDeviceId();
            if (!deviceId) throw new Error('Cannot get device ID');

            const headers = {
                'Authorization': `Bearer ${token}`,
                'oai-device-id': deviceId
            };

            if (State.chatgptWorkspaceType === 'team' && State.chatgptWorkspaceId) {
                headers['ChatGPT-Account-Id'] = State.chatgptWorkspaceId;
            }

            const allConversations = [];
            let offset = 0;
            let hasMore = true;

            while (hasMore) {
                const response = await fetch(`/backend-api/conversations?offset=${offset}&limit=28&order=updated`, { headers });
                if (!response.ok) throw new Error('Failed to fetch conversation list');

                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    allConversations.push(...data.items);
                    hasMore = data.items.length === 28;
                    offset += data.items.length;
                } else {
                    hasMore = false;
                }
            }

            return allConversations;
        },

        // Extract images from DOM for current conversation
        extractImagesFromDOM: async (conversationId, includeImages, accessToken = null) => {
            if (!includeImages) return {};

            const currentId = ChatGPTHandler.getCurrentConversationId();
            if (currentId !== conversationId) {
                console.log('[ChatGPT] Not current conversation, skipping DOM image extraction');
                return {};
            }

            const imageMap = {};
            let lastUserMessageId = null;  // 追踪最后的用户消息 ID，用于关联孤立的助手图片

            const messageGroups = document.querySelectorAll('[data-testid^="conversation-turn-"]');

            for (const group of messageGroups) {
                // 查找整个 group 中所有可能的 message-id
                const findMessageId = (container) => {
                    if (!container) return null;
                    return container.getAttribute('data-message-id') ||
                           container.closest('[data-message-id]')?.getAttribute('data-message-id') ||
                           group.querySelector('[data-message-id]')?.getAttribute('data-message-id');
                };

                // User messages - look for uploaded images
                const userContainer = group.querySelector('[data-message-author-role="user"]');
                if (userContainer) {
                    // 记录用户消息 ID，即使没有图片也要记录（用于关联后续的助手生成图片）
                    const userMessageId = findMessageId(userContainer);
                    if (userMessageId) {
                        lastUserMessageId = userMessageId;
                    }

                    // Find images in user message
                    const userImages = userContainer.querySelectorAll('img[src*="backend-api"], img[src*="files.oaiusercontent.com"], img[src*="oaiusercontent"]');
                    if (userImages.length > 0) {
                        const images = [];
                        for (const img of userImages) {
                            const imageData = await processImageElement(img, accessToken);
                            if (imageData) images.push(imageData);
                        }
                        if (images.length > 0 && lastUserMessageId) {
                            if (!imageMap[lastUserMessageId]) imageMap[lastUserMessageId] = {};
                            imageMap[lastUserMessageId].user = images;
                        }
                    }
                }

                // Assistant messages - look for generated images (including DALL-E generated images)
                const assistantContainer = group.querySelector('[data-message-author-role="assistant"]');
                
                // Collect all candidate assistant images from multiple sources
                const candidateImages = [];
                const seenSrcs = new Set();
                
                // Helper to add images without duplicates
                const addImages = (imgs) => {
                    for (const img of imgs) {
                        if (img.src && !seenSrcs.has(img.src)) {
                            seenSrcs.add(img.src);
                            candidateImages.push(img);
                        }
                    }
                };
                
                // 1. Images in assistant container
                if (assistantContainer) {
                    addImages(assistantContainer.querySelectorAll('img'));
                }
                
                // 2. AI-generated images - find by id pattern (image-xxxx)
                addImages(group.querySelectorAll('[id^="image-"] img'));
                
                // 3. Images with estuary/content URLs (generated content)
                addImages(group.querySelectorAll('img[src*="estuary/content"], img[src*="estuary"]'));
                
                // 4. Images with "已生成图片" or "Generated" alt text
                addImages(group.querySelectorAll('img[alt*="生成"], img[alt*="Generated"], img[alt*="generated"]'));
                
                // 5. Find imagegen containers by iterating through elements (handles class names with /)
                group.querySelectorAll('div').forEach(div => {
                    const classList = div.className || '';
                    if (classList.includes('imagegen') || classList.includes('image-gen')) {
                        addImages(div.querySelectorAll('img'));
                    }
                });
                
                // 6. Find by aria-label
                addImages(group.querySelectorAll('img[aria-label*="图片"], img[aria-label*="image"]'));
                
                // Exclude user images
                const userImgSrcs = new Set();
                group.querySelectorAll('[data-message-author-role="user"] img').forEach(img => userImgSrcs.add(img.src));
                
                const uniqueImages = candidateImages.filter(img => !userImgSrcs.has(img.src));

                if (uniqueImages.length > 0) {
                    const images = [];
                    for (const img of uniqueImages) {
                        // Skip loading/placeholder images (blurred intermediate images during generation)
                        // Check blur on img itself
                        const imgStyle = window.getComputedStyle(img);
                        const imgFilter = imgStyle.filter || imgStyle.webkitFilter || '';
                        if (imgFilter.includes('blur')) continue;

                        // Check blur on parent element (ChatGPT applies blur to parent div)
                        const parent = img.parentElement;
                        if (parent) {
                            const parentStyle = window.getComputedStyle(parent);
                            const parentFilter = parentStyle.filter || parentStyle.webkitFilter || '';
                            if (parentFilter.includes('blur')) continue;
                        }

                        // Skip images with loading/placeholder/pulse classes
                        const classList = img.className || '';
                        if (classList.includes('loading') || classList.includes('placeholder') ||
                            classList.includes('skeleton') || classList.includes('pulse')) continue;

                        // Skip images with loading aria attributes
                        if (img.getAttribute('aria-busy') === 'true' || img.getAttribute('data-loading') === 'true') continue;

                        // Wait for image to load if needed
                        if (!img.complete) {
                            await new Promise(r => {
                                img.onload = img.onerror = r;
                                setTimeout(r, 3000);
                            });
                        }

                        // Skip small images (icons/UI elements)
                        const width = img.naturalWidth || img.width || 0;
                        const height = img.naturalHeight || img.height || 0;
                        if (width < 50 || height < 50) continue;

                        const imageData = await processImageElement(img, accessToken);
                        if (imageData) images.push(imageData);
                    }
                    
                    if (images.length > 0) {
                        // 尝试多种方式获取 messageId
                        let messageId = findMessageId(assistantContainer);
                        
                        // 如果 assistantContainer 没有 messageId，尝试查找 group 中的任何 assistant 相关的 messageId
                        if (!messageId) {
                            // 方法1: 查找所有 data-message-id 属性
                            const allMessageIds = group.querySelectorAll('[data-message-id]');
                            for (const el of allMessageIds) {
                                const role = el.getAttribute('data-message-author-role');
                                if (role === 'assistant') {
                                    messageId = el.getAttribute('data-message-id');
                                    break;
                                }
                            }
                        }
                        
                        // 方法2: 在同一 group 中查找用户消息
                        if (!messageId) {
                            const userContainer = group.querySelector('[data-message-author-role="user"]');
                            const userMessageId = findMessageId(userContainer);
                            if (userMessageId) {
                                if (!imageMap[userMessageId]) imageMap[userMessageId] = {};
                                imageMap[userMessageId].assistant_generated = images;
                                continue;
                            }
                        }

                        // 方法3: 使用之前遍历过的用户消息 ID（跨 group 查找）
                        if (!messageId && lastUserMessageId) {
                            if (!imageMap[lastUserMessageId]) imageMap[lastUserMessageId] = {};
                            imageMap[lastUserMessageId].assistant_generated = images;
                            continue;
                        }

                        if (messageId) {
                            if (!imageMap[messageId]) imageMap[messageId] = {};
                            imageMap[messageId].assistant = images;
                        }
                    }
                }
            }

            return imageMap;
        },

        getConversation: async (conversationId, includeImages = false) => {
            const token = await ChatGPTHandler.ensureAccessToken();
            if (!token) {
                console.error('[ChatGPT] Token not found');
                throw new Error(i18n.t('tokenNotFound'));
            }

            const deviceId = ChatGPTHandler.getOaiDeviceId();
            if (!deviceId) {
                console.error('[ChatGPT] Device ID not found in cookies');
                throw new Error('Cannot get device ID');
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'oai-device-id': deviceId
            };

            if (State.chatgptWorkspaceType === 'team' && State.chatgptWorkspaceId) {
                headers['ChatGPT-Account-Id'] = State.chatgptWorkspaceId;
            }

            const response = await fetch(`/backend-api/conversation/${conversationId}`, { headers });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[ChatGPT] Fetch failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                    conversationId,
                    workspaceType: State.chatgptWorkspaceType
                });

                let errorMessage = `Failed to fetch conversation (${response.status}): ${errorText || response.statusText}`;
                if (response.status === 404) {
                    const currentMode = State.chatgptWorkspaceType === 'team' ? i18n.t('teamWorkspace') : i18n.t('userWorkspace');
                    const suggestMode = State.chatgptWorkspaceType === 'team' ? i18n.t('userWorkspace') : i18n.t('teamWorkspace');
                    errorMessage += `\n\n当前模式: ${currentMode}\n建议尝试切换到: ${suggestMode}`;
                    if (State.chatgptWorkspaceType === 'team') {
                        errorMessage += '并手动填写工作区ID';
                    } else {
                        errorMessage += '并手动填写个人ID';
                    }
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();

            // Extract and merge images from DOM if requested
            if (includeImages) {
                const imageMap = await ChatGPTHandler.extractImagesFromDOM(conversationId, includeImages, token);

                // Merge images into conversation data
                if (data.mapping && Object.keys(imageMap).length > 0) {
                    const messageIdToNodeId = {};
                    for (const nodeId in data.mapping) {
                        const node = data.mapping[nodeId];
                        if (node?.message?.id) {
                            messageIdToNodeId[node.message.id] = nodeId;
                        }
                    }

                    for (const [messageId, images] of Object.entries(imageMap)) {
                        const nodeId = messageIdToNodeId[messageId];
                        if (nodeId && data.mapping[nodeId]) {
                            if (!data.mapping[nodeId].loominary_images) {
                                data.mapping[nodeId].loominary_images = {};
                            }
                            if (images.user) {
                                data.mapping[nodeId].loominary_images.user = images.user;
                            }
                            if (images.assistant) {
                                data.mapping[nodeId].loominary_images.assistant = images.assistant;
                            }
                            if (images.assistant_generated) {
                                data.mapping[nodeId].loominary_images.assistant_generated = images.assistant_generated;
                            }
                        }
                    }
                }
            }

            return data;
        },

        previewConversation: async () => {
            const conversationId = ChatGPTHandler.getCurrentConversationId();
            if (!conversationId) {
                alert(i18n.t('uuidNotFound'));
                return;
            }

            try {
                const includeImages = State.includeImages || false;
                const data = await ChatGPTHandler.getConversation(conversationId, includeImages);
                const jsonString = JSON.stringify(data, null, 2);
                const filename = `chatgpt_${data.title || 'conversation'}_${conversationId.substring(0, 8)}.json`;
                await Communicator.open(jsonString, filename);
            } catch (error) {
                ErrorHandler.handle(error, 'Preview conversation', {
                    userMessage: `${i18n.t('loadFailed')} ${error.message}`
                });
            }
        },

        exportCurrent: async (btn) => {
            const conversationId = ChatGPTHandler.getCurrentConversationId();
            if (!conversationId) {
                alert(i18n.t('uuidNotFound'));
                return;
            }

            const original = btn.innerHTML;
            Utils.setButtonLoading(btn, i18n.t('exporting'));

            try {
                const includeImages = State.includeImages || false;
                const data = await ChatGPTHandler.getConversation(conversationId, includeImages);

                const filename = prompt(i18n.t('enterFilename'), data.title || i18n.t('untitledChat'));
                if (!filename) {
                    Utils.restoreButton(btn, original);
                    return;
                }

                const baseName = `chatgpt_${Utils.sanitizeFilename(filename)}_${new Date().toISOString().slice(0, 10)}`;
                Utils.downloadJSON(JSON.stringify(data, null, 2), `${baseName}.json`);
            } catch (error) {
                ErrorHandler.handle(error, 'Export conversation');
            } finally {
                Utils.restoreButton(btn, original);
            }
        },

        exportAll: async (btn, controlsArea) => {
            if (typeof fflate === 'undefined' || typeof fflate.zipSync !== 'function' || typeof fflate.strToU8 !== 'function') {
                const errorMsg = i18n.currentLang === 'zh'
                    ? '批量导出功能需要压缩库支持。\n\n由于当前平台的安全策略限制,该功能暂时不可用。\n建议使用"导出当前"功能单个导出对话。'
                    : 'Batch export requires compression library.\n\nThis feature is currently unavailable due to platform security policies.\nPlease use "Export" button to export conversations individually.';
                alert(errorMsg);
                return;
            }

            // 先探测对话数量
            const original = btn.innerHTML;
            Utils.setButtonLoading(btn, i18n.t('detectingConversations'));

            let allConvs;
            try {
                allConvs = await ChatGPTHandler.getAllConversations();
                if (!allConvs || !Array.isArray(allConvs)) throw new Error(i18n.t('fetchFailed'));
            } catch (error) {
                ErrorHandler.handle(error, 'Detect conversations');
                Utils.restoreButton(btn, original);
                return;
            }

            const totalCount = allConvs.length;
            Utils.restoreButton(btn, original);

            // 弹出确认框让用户选择导出数量
            const promptMsg = i18n.currentLang === 'zh'
                ? `${i18n.t('foundConversations')} ${totalCount} ${i18n.t('conversations')}\n\n${i18n.t('selectExportCount')}`
                : `${i18n.t('foundConversations')} ${totalCount} ${i18n.t('conversations')}\n\n${i18n.t('selectExportCount')}`;

            const userInput = prompt(promptMsg, totalCount.toString());

            // 用户取消
            if (userInput === null) {
                alert(i18n.t('exportCancelled'));
                return;
            }

            // 解析用户输入
            let exportCount = totalCount;
            const trimmedInput = userInput.trim();

            if (trimmedInput !== '' && trimmedInput !== '0') {
                const parsed = parseInt(trimmedInput, 10);
                if (isNaN(parsed) || parsed < 0) {
                    alert(i18n.t('invalidNumber'));
                    return;
                }
                exportCount = Math.min(parsed, totalCount);
            }

            // 开始导出
            const progress = Utils.createProgressElem(controlsArea);
            progress.textContent = i18n.t('preparing');
            Utils.setButtonLoading(btn, i18n.t('exporting'));

            try {
                let exported = 0;
                const zipEntries = {};

                const includeImages = State.includeImages || false;
                const currentConvId = ChatGPTHandler.getCurrentConversationId();

                // 只导出最近的 exportCount 个对话
                const convsToExport = allConvs.slice(0, exportCount);
                console.log(`Starting export of ${convsToExport.length} conversations (out of ${totalCount} total)`);

                for (let i = 0; i < convsToExport.length; i++) {
                    const conv = convsToExport[i];
                    progress.textContent = `${i18n.t('gettingConversation')} ${i + 1}/${convsToExport.length}`;

                    if (i > 0 && i % 5 === 0) {
                        await new Promise(resolve => setTimeout(resolve, Config.TIMING.BATCH_EXPORT_YIELD));
                    } else if (i > 0) {
                        await Utils.sleep(Config.TIMING.BATCH_EXPORT_SLEEP);
                    }

                    try {
                        // Note: DOM image extraction only works for the currently open conversation
                        const shouldExtractImages = includeImages && conv.id === currentConvId;
                        const data = await ChatGPTHandler.getConversation(conv.id, shouldExtractImages);
                        if (data) {
                            const title = Utils.sanitizeFilename(data.title || conv.id);
                            const filename = `chatgpt_${conv.id.substring(0, 8)}_${title}.json`;
                            zipEntries[filename] = fflate.strToU8(JSON.stringify(data, null, 2));
                            exported++;
                        }
                    } catch (error) {
                        console.error(`Failed to process ${conv.id}:`, error);
                    }
                }

                progress.textContent = `${i18n.t('compressing')}…`;
                const zipUint8 = fflate.zipSync(zipEntries, { level: 1 });
                const zipBlob = new Blob([zipUint8], { type: 'application/zip' });

                const zipFilename = `chatgpt_export_${exportCount === totalCount ? 'all' : 'recent_' + exportCount}_${new Date().toISOString().slice(0, 10)}.zip`;
                Utils.downloadFile(zipBlob, zipFilename);
                alert(`${i18n.t('successExported')} ${exported} ${i18n.t('conversations')}`);
            } catch (error) {
                ErrorHandler.handle(error, 'Export all conversations');
            } finally {
                Utils.restoreButton(btn, original);
                if (progress.parentNode) progress.parentNode.removeChild(progress);
            }
        },

        addUI: (controls) => {
            // Image inclusion toggle
            const imageToggle = Utils.createToggle(
                i18n.t('includeImages'),
                Config.IMAGE_SWITCH_ID,
                State.includeImages
            );

            const imageToggleInput = imageToggle.querySelector('input');
            imageToggleInput.addEventListener('change', (e) => {
                State.includeImages = e.target.checked;
                localStorage.setItem('includeImages', State.includeImages);
                console.log('[ChatGPT] Include images:', State.includeImages);
            });

            controls.appendChild(imageToggle);

            // Workspace type toggle
            const initialLabel = State.chatgptWorkspaceType === 'team' ? i18n.t('teamWorkspace') : i18n.t('userWorkspace');
            const workspaceToggle = Utils.createToggle(
                initialLabel,
                Config.WORKSPACE_TYPE_ID,
                State.chatgptWorkspaceType === 'team'
            );

            const toggleInput = workspaceToggle.querySelector('input');
            const toggleLabel = workspaceToggle.querySelector('.loominary-toggle-label');

            toggleInput.addEventListener('change', (e) => {
                State.chatgptWorkspaceType = e.target.checked ? 'team' : 'user';
                localStorage.setItem('chatGPTWorkspaceType', State.chatgptWorkspaceType);
                if (toggleLabel) toggleLabel.textContent = e.target.checked ? i18n.t('teamWorkspace') : i18n.t('userWorkspace');
                console.log('[ChatGPT] Workspace type changed to:', State.chatgptWorkspaceType);
                UI.recreatePanel();
            });

            controls.appendChild(workspaceToggle);
        },

        addButtons: (controls) => {
            controls.appendChild(Utils.createButton(
                `${previewIcon} ${i18n.t('viewOnline')}`,
                () => ChatGPTHandler.previewConversation()
            ));

            controls.appendChild(Utils.createButton(
                `${exportIcon} ${i18n.t('exportCurrentJSON')}`,
                (btn) => ChatGPTHandler.exportCurrent(btn)
            ));

            controls.appendChild(Utils.createButton(
                `${zipIcon} ${i18n.t('exportAllConversations')}`,
                (btn) => ChatGPTHandler.exportAll(btn, controls)
            ));

            const idLabel = document.createElement('div');
            idLabel.className = 'loominary-input-trigger';

            if (State.chatgptWorkspaceType === 'user') {
                idLabel.textContent = `${i18n.t('manualUserId')}`;
                idLabel.addEventListener('click', () => {
                    const newId = prompt(i18n.t('enterUserId'));
                    if (newId?.trim()) {
                        State.chatgptUserId = newId.trim();
                        localStorage.setItem('chatGPTUserId', State.chatgptUserId);
                        alert(i18n.t('userIdSaved'));
                    }
                });
            } else {
                idLabel.textContent = `${i18n.t('manualWorkspaceId')}`;
                idLabel.addEventListener('click', () => {
                    const newId = prompt(i18n.t('enterWorkspaceId'));
                    if (newId?.trim()) {
                        State.chatgptWorkspaceId = newId.trim();
                        localStorage.setItem('chatGPTWorkspaceId', State.chatgptWorkspaceId);
                        alert(i18n.t('workspaceIdSaved'));
                    }
                });
            }

            controls.appendChild(idLabel);
        }
    };

    // Helper function to fetch images via GM_xmlhttpRequest (routes through background proxy in extension)
    function grok_fetchViaGM(url, headers = {}) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                return reject(new Error('GM_xmlhttpRequest not available'));
            }
            GM_xmlhttpRequest({
                method: "GET",
                url,
                headers,
                responseType: "blob",
                onload: r => {
                    if (r.status >= 200 && r.status < 300) {
                        resolve(r.response);
                    } else {
                        reject(new Error(`Status: ${r.status}`));
                    }
                },
                onerror: e => reject(new Error(e.statusText || 'Network error')),
                ontimeout: () => reject(new Error('Request timeout'))
            });
        });
    }

    // Fetch image URL via GM proxy and return base64 data (bypasses canvas, gets original file)
    async function grok_fetchImageAsData(url) {
        const blob = await grok_fetchViaGM(url);
        const base64Data = await Utils.blobToBase64(blob);
        let mimeType = blob.type;
        if (!mimeType || mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) {
            const firstBytes = base64Data.substring(0, 20);
            if (firstBytes.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
            else if (firstBytes.startsWith('/9j/')) mimeType = 'image/jpeg';
            else if (firstBytes.startsWith('R0lGOD')) mimeType = 'image/gif';
            else if (firstBytes.startsWith('UklGR')) mimeType = 'image/webp';
            else mimeType = 'image/jpeg';
        }
        return { type: 'image', format: mimeType, size: blob.size, data: base64Data, original_src: url };
    }

    // Process image element and return base64 data
    async function grok_processImageElement(imgElement) {
        if (!imgElement) return null;

        const url = imgElement.src;
        if (!url || url.startsWith('data:')) return null;

        try {
            let base64Data, mimeType, size;

            if (url.startsWith('blob:')) {
                try {
                    const blob = await fetch(url).then(r => r.ok ? r.blob() : Promise.reject());
                    base64Data = await Utils.blobToBase64(blob);
                    mimeType = blob.type;
                    size = blob.size;
                } catch (blobError) {
                    // Canvas fallback for blob URLs
                    const canvas = document.createElement('canvas');
                    canvas.width = imgElement.naturalWidth || imgElement.width;
                    canvas.height = imgElement.naturalHeight || imgElement.height;
                    canvas.getContext('2d').drawImage(imgElement, 0, 0);

                    const isPhoto = canvas.width * canvas.height > 50000;
                    const dataURL = isPhoto ? canvas.toDataURL('image/jpeg', 0.85) : canvas.toDataURL('image/png');
                    mimeType = isPhoto ? 'image/jpeg' : 'image/png';
                    base64Data = dataURL.split(',')[1];
                    size = Math.round((base64Data.length * 3) / 4);
                }
            } else {
                // Try Canvas method first (more reliable for already-loaded images)
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = imgElement.naturalWidth || imgElement.width;
                    canvas.height = imgElement.naturalHeight || imgElement.height;

                    if (canvas.width === 0 || canvas.height === 0) {
                        throw new Error('Image not loaded or has zero dimensions');
                    }

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(imgElement, 0, 0);

                    const isPhoto = canvas.width * canvas.height > 50000;
                    const dataURL = isPhoto ? canvas.toDataURL('image/jpeg', 0.85) : canvas.toDataURL('image/png');

                    mimeType = isPhoto ? 'image/jpeg' : 'image/png';
                    base64Data = dataURL.split(',')[1];
                    size = Math.round((base64Data.length * 3) / 4);
                } catch (canvasError) {
                    // Fallback to GM_xmlhttpRequest if Canvas fails (CORS issues)
                    console.warn('[Grok] Canvas method failed, using GM_xmlhttpRequest fallback:', canvasError.message);

                    const blob = await grok_fetchViaGM(url);
                    base64Data = await Utils.blobToBase64(blob);
                    mimeType = blob.type;
                    size = blob.size;
                }

                // Fix MIME type if it's octet-stream or empty
                if (!mimeType || mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) {
                    if (url.includes('.jpg') || url.includes('.jpeg')) {
                        mimeType = 'image/jpeg';
                    } else if (url.includes('.png')) {
                        mimeType = 'image/png';
                    } else if (url.includes('.gif')) {
                        mimeType = 'image/gif';
                    } else if (url.includes('.webp')) {
                        mimeType = 'image/webp';
                    } else {
                        // Detect from base64 magic bytes
                        const firstBytes = base64Data.substring(0, 20);
                        if (firstBytes.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
                        else if (firstBytes.startsWith('/9j/')) mimeType = 'image/jpeg';
                        else if (firstBytes.startsWith('R0lGOD')) mimeType = 'image/gif';
                        else if (firstBytes.startsWith('UklGR')) mimeType = 'image/webp';
                        else mimeType = 'image/png';
                    }
                }
            }

            return { type: 'image', format: mimeType, size, data: base64Data, original_src: url };
        } catch (e) {
            console.error('[Grok] Failed to process image:', e);
            return null;
        }
    }

    const GrokHandler = {
        init: () => {
            // Grok doesn't require special initialization like token capture
            console.log('[Loominary] GrokHandler initialized');
        },

        getCurrentConversationId: () => {
            // Grok URL: https://grok.com/{conversationId} - ID is the last segment of path
            const pathSegments = window.location.pathname.split('/').filter(s => s);
            const lastSegment = pathSegments[pathSegments.length - 1];
            // Grok conversation IDs are typically UUID-like (36 chars) or similar long strings
            if (lastSegment && lastSegment.length >= 20) {
                return lastSegment;
            }
            return null;
        },

        getAllConversations: async () => {
            try {
                const response = await fetch('/rest/app-chat/conversations', {
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                if (!response.ok) throw new Error(`Failed to fetch conversations: ${response.status}`);
                const data = await response.json();
                return data.conversations || [];
            } catch (error) {
                console.error('[Loominary] Get all conversations error:', error);
                return null;
            }
        },

        getConversation: async (conversationId) => {
            try {
                // Step 1: Get all response nodes with tree structure
                const nodeUrl = `/rest/app-chat/conversations/${conversationId}/response-node?includeThreads=true`;
                const nodeResponse = await fetch(nodeUrl, {
                    headers: { 'Accept': 'application/json' },
                    credentials: 'include'
                });
                if (!nodeResponse.ok) throw new Error(`Failed to get response nodes: ${nodeResponse.status}`);
                const nodeData = await nodeResponse.json();
                const responseNodes = nodeData.responseNodes || [];
                const responseIds = responseNodes.map(node => node.responseId);

                if (!responseIds.length) {
                    return { conversationId, responses: [], title: null, conversationTree: null };
                }

                // Step 2: Load full conversation content
                const loadUrl = `/rest/app-chat/conversations/${conversationId}/load-responses`;
                const loadResponse = await fetch(loadUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ responseIds })
                });
                if (!loadResponse.ok) throw new Error(`Failed to load responses: ${loadResponse.status}`);
                const conversationData = await loadResponse.json();

                // Step 3: Build tree structure map
                const nodeMap = new Map();
                responseNodes.forEach(node => {
                    nodeMap.set(node.responseId, {
                        responseId: node.responseId,
                        parentResponseId: node.parentResponseId || null,
                        childResponseIds: node.childResponseIds || [],
                        threadId: node.threadId || null
                    });
                });

                // Step 4: Process and structure the data
                const processedResponses = (conversationData.responses || [])
                    .filter(r => !r.partial)
                    .sort((a, b) => new Date(a.createTime) - new Date(b.createTime))
                    .map(r => {
                        const processed = {
                            responseId: r.responseId,
                            sender: r.sender,
                            createTime: r.createTime,
                            message: r.message || ''
                        };

                        // Add tree structure information
                        const nodeInfo = nodeMap.get(r.responseId);
                        if (nodeInfo) {
                            processed.parentResponseId = nodeInfo.parentResponseId;
                            processed.childResponseIds = nodeInfo.childResponseIds;
                            if (nodeInfo.threadId) {
                                processed.threadId = nodeInfo.threadId;
                            }
                        }

                        // Process citations if present
                        if (r.sender === 'assistant' && r.cardAttachmentsJson && r.webSearchResults) {
                            const citations = [];
                            try {
                                r.cardAttachmentsJson.forEach(cardStr => {
                                    const card = JSON.parse(cardStr);
                                    if (card.cardType === 'citation_card' && card.url) {
                                        const searchResult = r.webSearchResults.find(sr => sr.url === card.url);
                                        citations.push({
                                            id: card.id,
                                            url: card.url,
                                            title: searchResult?.title || 'Source'
                                        });
                                    }
                                });
                            } catch (e) {
                                console.warn('[Loominary] Failed to parse cardAttachmentsJson:', e);
                            }
                            if (citations.length > 0) {
                                processed.citations = citations;
                            }
                            if (r.webSearchResults) {
                                processed.webSearchResults = r.webSearchResults;
                            }
                        }

                        // Include other potentially useful fields
                        if (r.attachments) processed.attachments = r.attachments;
                        if (r.cardAttachmentsJson) processed.cardAttachmentsJson = r.cardAttachmentsJson;
                        if (r.imageAttachments) processed.imageAttachments = r.imageAttachments;
                        if (r.fileAttachments) processed.fileAttachments = r.fileAttachments;

                        return processed;
                    });

                // Try to get conversation title from list if available
                let title = null;
                try {
                    const allConvs = await GrokHandler.getAllConversations();
                    const conv = allConvs?.find(c => c.conversationId === conversationId);
                    title = conv?.title || null;
                } catch (e) {
                    console.warn('[Loominary] Could not fetch title:', e);
                }

                // Step 5: Capture images from DOM if State.includeImages is true
                if (State.includeImages) {
                    const processedUrls = new Set();

                    // Helper: resolve DOM response container to a processedResponse entry
                    function resolveContainer(el) {
                        const container = el.closest('[id^="response-"]');
                        if (!container) return null;
                        const responseId = container.id.replace('response-', '');
                        return processedResponses.find(r => r.responseId === responseId) || null;
                    }

                    // Method 1: AI-generated images — start from the img element, walk up to find response
                    const allGeneratedImgs = document.querySelectorAll('[data-testid="image-viewer"] img[src*="assets.grok.com"]');

                    for (const img of allGeneratedImgs) {
                        // Skip blurred background images (check both inline style and computed)
                        const parentStyle = img.parentElement?.style;
                        if (parentStyle && parentStyle.filter && parentStyle.filter.includes('blur')) continue;

                        if (processedUrls.has(img.src)) continue;
                        processedUrls.add(img.src);

                        try {
                            // Use GM fetch directly to get original file (bypasses canvas thumbnail capture)
                            const imageData = await grok_fetchImageAsData(img.src);
                            if (!imageData) continue;

                            // Prefer DOM-position match; fallback to last assistant response
                            let target = resolveContainer(img);
                            if (!target) {
                                const assistants = processedResponses.filter(r => r.sender === 'assistant');
                                target = assistants[assistants.length - 1] || null;
                            }

                            if (target) {
                                if (!target.capturedImages) target.capturedImages = [];
                                target.capturedImages.push({ ...imageData, source: 'ai_generated' });
                                console.log(`[Grok] Captured AI image for response ${target.responseId}`);
                            }
                        } catch (e) {
                            console.error('[Grok] Failed to process AI image:', e);
                        }
                    }

                    // Method 2: User-uploaded images — figure elements with preview-image URLs
                    const allUserImages = document.querySelectorAll('figure img[src*="assets.grok.com"][src*="preview-image"]');

                    for (const img of allUserImages) {
                        if (processedUrls.has(img.src)) continue;
                        processedUrls.add(img.src);

                        try {
                            // Strip /preview-image suffix to get full-size URL, fallback to thumbnail
                            const thumbnailUrl = img.src;
                            const fullSizeUrl = thumbnailUrl.includes('/preview-image')
                                ? thumbnailUrl.split('/preview-image')[0]
                                : thumbnailUrl;
                            if (fullSizeUrl !== thumbnailUrl) processedUrls.add(fullSizeUrl);

                            let imageData = null;
                            if (fullSizeUrl !== thumbnailUrl) {
                                try {
                                    imageData = await grok_fetchImageAsData(fullSizeUrl);
                                } catch (e) {
                                    console.warn('[Grok] Full-size fetch failed, using thumbnail:', e.message);
                                }
                            }
                            if (!imageData) {
                                imageData = await grok_fetchImageAsData(thumbnailUrl);
                            }
                            if (!imageData) continue;

                            // Prefer DOM-position match; fallback to last human with any attachments
                            let target = resolveContainer(img);
                            if (!target) {
                                const humanResponses = processedResponses.filter(r =>
                                    r.sender === 'human' &&
                                    ((r.fileAttachments && r.fileAttachments.length > 0) ||
                                     (r.imageAttachments && r.imageAttachments.length > 0))
                                );
                                target = humanResponses[humanResponses.length - 1] || null;
                            }

                            if (target) {
                                if (!target.capturedImages) target.capturedImages = [];
                                target.capturedImages.push({ ...imageData, source: 'user_upload' });
                                console.log(`[Grok] Captured user-uploaded image for response ${target.responseId}`);
                            } else {
                                console.warn('[Grok] No matching response found for user-uploaded image');
                            }
                        } catch (e) {
                            console.error('[Grok] Failed to process user image:', e);
                        }
                    }
                }

                return {
                    conversationId,
                    title,
                    responses: processedResponses,
                    conversationTree: {
                        nodes: Array.from(nodeMap.values()),
                        rootNodeId: responseNodes.find(n => !n.parentResponseId)?.responseId || null
                    },
                    exportTime: new Date().toISOString(),
                    platform: 'grok'
                };
            } catch (error) {
                console.error('[Loominary] Get conversation error:', error);
                throw error;
            }
        },

        addUI: (controls) => {
            // Initialize includeImages to true by default for Grok if not set
            if (localStorage.getItem('includeImages') === null) {
                State.includeImages = true;
                localStorage.setItem('includeImages', 'true');
                console.log('[Grok] Initialized includeImages to true by default');
            }

            // Add "Include Images" toggle
            const imageToggle = Utils.createToggle(
                i18n.t('includeImages'),
                'loominary-include-images-toggle',
                State.includeImages
            );
            const imageToggleInput = imageToggle.querySelector('input');
            imageToggleInput.addEventListener('change', (e) => {
                State.includeImages = e.target.checked;
                localStorage.setItem('includeImages', State.includeImages);
                console.log('[Grok] Include images:', State.includeImages);
            });
            controls.appendChild(imageToggle);
        },

        addButtons: (controls) => {
            controls.appendChild(Utils.createButton(
                `${previewIcon} ${i18n.t('viewOnline')}`,
                async (btn) => {
                    const conversationId = GrokHandler.getCurrentConversationId();
                    if (!conversationId) {
                        alert(i18n.t('uuidNotFound'));
                        return;
                    }
                    const original = btn.innerHTML;
                    Utils.setButtonLoading(btn, i18n.t('loading'));
                    try {
                        const data = await GrokHandler.getConversation(conversationId);
                        if (!data) throw new Error(i18n.t('fetchFailed'));
                        const jsonString = JSON.stringify(data, null, 2);
                        const filename = `grok_${data.title || 'conversation'}_${conversationId.substring(0, 8)}.json`;
                        await Communicator.open(jsonString, filename);
                    } catch (error) {
                        ErrorHandler.handle(error, 'Preview conversation', {
                            userMessage: `${i18n.t('loadFailed')} ${error.message}`
                        });
                    } finally {
                        Utils.restoreButton(btn, original);
                    }
                }
            ));

            controls.appendChild(Utils.createButton(
                `${exportIcon} ${i18n.t('exportCurrentJSON')}`,
                async (btn) => {
                    const conversationId = GrokHandler.getCurrentConversationId();
                    if (!conversationId) {
                        alert(i18n.t('uuidNotFound'));
                        return;
                    }
                    const original = btn.innerHTML;
                    Utils.setButtonLoading(btn, i18n.t('exporting'));
                    try {
                        const data = await GrokHandler.getConversation(conversationId);
                        if (!data) throw new Error(i18n.t('fetchFailed'));
                        const title = data.title || conversationId.substring(0, 8);
                        const filename = `grok_${Utils.sanitizeFilename(title)}_${conversationId.substring(0, 8)}`;
                        await loominaryExportMarkdown(data, filename);
                    } catch (error) {
                        ErrorHandler.handle(error, 'Export conversation');
                    } finally {
                        Utils.restoreButton(btn, original);
                    }
                }
            ));

            controls.appendChild(Utils.createButton(
                `${zipIcon} ${i18n.t('exportAllConversations')}`,
                (btn) => GrokHandler.exportAll(btn, controls)
            ));
        },

        exportAll: async (btn, controlsArea) => {
            if (typeof fflate === 'undefined' || typeof fflate.zipSync !== 'function' || typeof fflate.strToU8 !== 'function') {
                const errorMsg = i18n.currentLang === 'zh'
                    ? '批量导出功能需要压缩库支持。\n\n由于当前平台的安全策略限制,该功能暂时不可用。\n建议使用"导出当前"功能单个导出对话。'
                    : 'Batch export requires compression library.\n\nThis feature is currently unavailable due to platform security policies.\nPlease use "Export" button to export conversations individually.';
                alert(errorMsg);
                return;
            }

            // 先探测对话数量
            const original = btn.innerHTML;
            Utils.setButtonLoading(btn, i18n.t('detectingConversations'));

            let allConvs;
            try {
                allConvs = await GrokHandler.getAllConversations();
                if (!allConvs || !Array.isArray(allConvs)) throw new Error(i18n.t('fetchFailed'));
            } catch (error) {
                ErrorHandler.handle(error, 'Detect conversations');
                Utils.restoreButton(btn, original);
                return;
            }

            const totalCount = allConvs.length;
            Utils.restoreButton(btn, original);

            // 弹出确认框让用户选择导出数量
            const promptMsg = i18n.currentLang === 'zh'
                ? `${i18n.t('foundConversations')} ${totalCount} ${i18n.t('conversations')}\n\n${i18n.t('selectExportCount')}`
                : `${i18n.t('foundConversations')} ${totalCount} ${i18n.t('conversations')}\n\n${i18n.t('selectExportCount')}`;

            const userInput = prompt(promptMsg, totalCount.toString());

            // 用户取消
            if (userInput === null) {
                alert(i18n.t('exportCancelled'));
                return;
            }

            // 解析用户输入
            let exportCount = totalCount;
            const trimmedInput = userInput.trim();

            if (trimmedInput !== '' && trimmedInput !== '0') {
                const parsed = parseInt(trimmedInput, 10);
                if (isNaN(parsed) || parsed < 0) {
                    alert(i18n.t('invalidNumber'));
                    return;
                }
                exportCount = Math.min(parsed, totalCount);
            }

            // 开始导出
            const progress = Utils.createProgressElem(controlsArea);
            progress.textContent = i18n.t('preparing');
            Utils.setButtonLoading(btn, i18n.t('exporting'));

            try {
                let exported = 0;
                const zipEntries = {};

                // 只导出最近的 exportCount 个对话
                const convsToExport = allConvs.slice(0, exportCount);
                console.log(`[Grok] Starting export of ${convsToExport.length} conversations (out of ${totalCount} total)`);

                for (let i = 0; i < convsToExport.length; i++) {
                    const conv = convsToExport[i];
                    progress.textContent = `${i18n.t('gettingConversation')} ${i + 1}/${convsToExport.length}`;

                    if (i > 0 && i % 5 === 0) {
                        await new Promise(resolve => setTimeout(resolve, Config.TIMING.BATCH_EXPORT_YIELD));
                    } else if (i > 0) {
                        await Utils.sleep(Config.TIMING.BATCH_EXPORT_SLEEP);
                    }

                    try {
                        const data = await GrokHandler.getConversation(conv.conversationId);
                        if (data) {
                            const title = Utils.sanitizeFilename(data.title || conv.conversationId);
                            const filename = `grok_${conv.conversationId.substring(0, 8)}_${title}.json`;
                            zipEntries[filename] = fflate.strToU8(JSON.stringify(data, null, 2));
                            exported++;
                        }
                    } catch (error) {
                        console.error(`[Lyra] Failed to process ${conv.conversationId}:`, error);
                    }
                }

                progress.textContent = `${i18n.t('compressing')}…`;
                const zipUint8 = fflate.zipSync(zipEntries, { level: 1 });
                const zipBlob = new Blob([zipUint8], { type: 'application/zip' });

                const zipFilename = `grok_export_${exportCount === totalCount ? 'all' : 'recent_' + exportCount}_${new Date().toISOString().slice(0, 10)}.zip`;
                Utils.downloadFile(zipBlob, zipFilename);
                alert(`${i18n.t('successExported')} ${exported} ${i18n.t('conversations')}`);
            } catch (error) {
                ErrorHandler.handle(error, 'Export all conversations');
            } finally {
                Utils.restoreButton(btn, original);
                if (progress.parentNode) progress.parentNode.removeChild(progress);
            }
        }
    };


// Version tracking system for Gemini (Optimized)
const VersionTracker = {
    tracker: null,
    scanInterval: null,
    hrefCheckInterval: null,
    currentHref: location.href,
    isTracking: false,
    isScanning: false,
    imageCache: new Map(),
    imagePool: new Map(),

    getImageHashKey: (img) => img ? `${img.size}-${img.format}-${img.data.substring(0, 100)}` : null,

    getOrFetchImage: async (imgElement, retries = 3) => {
        if (!imgElement.complete || !imgElement.naturalWidth) {
            await new Promise(r => {
                if (imgElement.complete) return r();
                imgElement.onload = imgElement.onerror = r;
                setTimeout(r, 2000);
            });
        }

        const url = imgElement.src;
        if (!url || url.startsWith('data:') || url.includes('drive-thirdparty.googleusercontent.com')
            || imgElement.classList.contains('new-file-icon') || imgElement.dataset.testId === 'new-file-icon') return null;
        if (VersionTracker.imageCache.has(url)) return VersionTracker.imageCache.get(url);

        for (let i = 1; i <= retries; i++) {
            try {
                const imageData = await gemini_processImageElement(imgElement);
                if (imageData) {
                    const hashKey = VersionTracker.getImageHashKey(imageData);
                    if (hashKey && VersionTracker.imagePool.has(hashKey)) {
                        const existing = VersionTracker.imagePool.get(hashKey);
                        VersionTracker.imageCache.set(url, existing);
                        return existing;
                    }
                    if (hashKey) VersionTracker.imagePool.set(hashKey, imageData);
                    VersionTracker.imageCache.set(url, imageData);
                    return imageData;
                }
            } catch (e) {
                if (i === retries) return null;
                await new Promise(r => setTimeout(r, 500 * i));
            }
        }
        return null;
    },

    createEmptyTracker: () => ({ turns: {}, order: [] }),

    resetTracker: (reason) => {
        VersionTracker.tracker = VersionTracker.createEmptyTracker();
        VersionTracker.imageCache.clear();
        VersionTracker.imagePool.clear();
    },

    startTracking: () => {
        if (VersionTracker.isTracking) return;
        VersionTracker.isTracking = true;
        VersionTracker.resetTracker();
        console.log('[Gemini] VersionTracker started, scan interval:', Config.TIMING.VERSION_SCAN_INTERVAL, 'ms');
        VersionTracker.scanInterval = setInterval(() => VersionTracker.scanOnce(), Config.TIMING.VERSION_SCAN_INTERVAL);
        VersionTracker.hrefCheckInterval = setInterval(() => {
            if (location.href !== VersionTracker.currentHref) {
                VersionTracker.currentHref = location.href;
                VersionTracker.resetTracker();
            }
        }, Config.TIMING.HREF_CHECK_INTERVAL);
    },

    stopTracking: () => {
        if (!VersionTracker.isTracking) return;
        VersionTracker.isTracking = false;
        clearInterval(VersionTracker.scanInterval);
        clearInterval(VersionTracker.hrefCheckInterval);
        VersionTracker.scanInterval = VersionTracker.hrefCheckInterval = null;
    },

    ensureTurn: (turnId) => {
        const tracker = VersionTracker.tracker;
        if (!tracker.turns[turnId]) {
            tracker.turns[turnId] = {
                id: turnId,
                userVersions: [], assistantVersions: [],
                userLastText: '', assistantCommittedText: '', assistantPendingText: '', assistantPendingSince: 0, assistantPendingImages: [],
                userImages: new Map(), assistantImages: new Map()
            };
            tracker.order.push(turnId);
        }
        return tracker.turns[turnId];
    },

    getTurnId: (node, idx) => node.getAttribute?.('data-message-id') || node.getAttribute?.('data-id') || `turn-${idx}`,

    areImageListsEqual: (a, b) => {
        if (!a && !b) return true;
        if (!a || !b || a.length !== b.length) return false;
        return a.every((img, i) => img.size === b[i].size && img.data === b[i].data);
    },

    handleUser: (turnId, text, images = []) => {
        const t = VersionTracker.ensureTurn(turnId);
        const value = (text || '').trim();
        if (!value && !images.length) return;

        const last = t.userVersions.at(-1);
        const lastImages = last ? (t.userImages.get(last.version) || []) : [];
        const isTextSame = last?.text === value;
        const isImagesSame = VersionTracker.areImageListsEqual(lastImages, images);

        if (isTextSame && isImagesSame) return;
        if (last?.text && !value && isImagesSame) return; // Skip intermediate edit state

        // 文本相同但图片变化（异步加载完成），更新现有版本的图片而非创建新版本
        if (isTextSame && !isImagesSame && images.length) {
            t.userImages.set(last.version, images);
            return;
        }

        const version = t.userVersions.length;
        t.userVersions.push({ version, type: version ? 'edit' : 'normal', text: value });
        if (images.length) t.userImages.set(version, images);
        t.userLastText = value;
    },

    handleAssistant: (turnId, domText, images = []) => {
        const t = VersionTracker.ensureTurn(turnId);
        const text = (domText || '').trim();
        if (!text && !images.length) return;

        const now = Date.now();
        if (text !== t.assistantPendingText) {
            t.assistantPendingText = text;
            t.assistantPendingSince = now;
            if (images.length) t.assistantPendingImages = images;
            return;
        }
        // 即使文本未变，也持续更新待处理图片（异步加载可能滞后）
        if (images.length) t.assistantPendingImages = images;
        if (now - t.assistantPendingSince < Config.TIMING.VERSION_STABLE) return;

        const userVersion = t.userVersions.at(-1)?.version ?? null;
        const last = t.assistantVersions.at(-1);
        const lastImages = last ? (t.assistantImages.get(last.version) || []) : [];

        if (last?.userVersion === userVersion && last?.text === text) {
            // 文本和 userVersion 相同时，如果只是图片变化（异步加载完成），更新现有版本的图片
            if (!VersionTracker.areImageListsEqual(lastImages, images) && images.length) {
                t.assistantImages.set(last.version, images);
            }
            t.assistantPendingSince = now;
            return;
        }

        const version = t.assistantVersions.length;
        t.assistantVersions.push({ version, type: version ? 'retry' : 'normal', userVersion, text });
        if (images.length) t.assistantImages.set(version, images);
        t.assistantCommittedText = text;
    },

    scanOnce: async () => {
        if (VersionTracker.isScanning) return;
        VersionTracker.isScanning = true;

        try {
            const turns = document.querySelectorAll('div.conversation-turn, div.single-turn, div.conversation-container');
            if (!turns.length) {
                // 每 30 秒输出一次调试信息，避免刷屏
                if (!VersionTracker._lastDebugLog || Date.now() - VersionTracker._lastDebugLog > 30000) {
                    VersionTracker._lastDebugLog = Date.now();
                    console.log('[Gemini] scanOnce: no turns found. DOM selectors tried: div.conversation-turn, div.single-turn, div.conversation-container');
                }
                return;
            }

            const includeImages = document.getElementById(Config.IMAGE_SWITCH_ID)?.checked || false;

            for (const turn of turns) {
                const idx = Array.from(turns).indexOf(turn);
                const id = VersionTracker.getTurnId(turn, idx);
                let userImages = [], assistantImages = [];

                if (includeImages) {
                    // 排除文件类型图标（drive-thirdparty.googleusercontent.com）
                    const userImgEls = [...turn.querySelectorAll('user-query img, user-query-file-preview img, .file-preview-container img')]
                        .filter(img => !img.src.includes('drive-thirdparty.googleusercontent.com'));
                    // 只获取 message-content 内的图片，排除 model-thoughts
                    const modelContent = turn.querySelector('model-response message-content');
                    const modelImgEls = modelContent ? [...modelContent.querySelectorAll('img')]
                        .filter(img => !img.src.includes('drive-thirdparty.googleusercontent.com')) : [];

                    if (userImgEls.length) userImages = (await Promise.all(userImgEls.map(i => VersionTracker.getOrFetchImage(i)))).filter(Boolean);
                    if (modelImgEls.length) assistantImages = (await Promise.all(modelImgEls.map(i => VersionTracker.getOrFetchImage(i)))).filter(Boolean);
                }

                const userText = VersionTracker.getUserText(turn);
                const assistantText = VersionTracker.getAssistantText(turn);

                // 调试日志（每 30 秒最多输出一次）
                if (!VersionTracker._lastScanDebug || Date.now() - VersionTracker._lastScanDebug > 30000) {
                    if (idx === 0) VersionTracker._lastScanDebug = Date.now();
                    console.log(`[Gemini] Turn ${idx} id=${id}: userText=${userText.length}chars, assistantText=${assistantText.length}chars`,
                        turn.querySelector('user-query') ? 'has-user-query' : 'no-user-query',
                        turn.querySelector('message-content') ? 'has-message-content' : 'no-message-content',
                        turn.querySelector('.markdown-main-panel') ? 'has-markdown-panel' : 'no-markdown-panel');
                }

                VersionTracker.handleUser(id, userText, userImages);
                VersionTracker.handleAssistant(id, assistantText, assistantImages);
            }
        } finally {
            VersionTracker.isScanning = false;
        }
    },

    getUserText: (turn) => {
        const el = turn.querySelector('user-query .query-text, .query-text-line, [data-user-text]');
        if (!el) return '';
        const clone = el.cloneNode(true);
        clone.querySelectorAll('.cdk-visually-hidden').forEach(e => e.remove());
        return clone.innerText.trim();
    },

    getAssistantText: (turn) => {
        // 严格只从 message-content 获取内容，完全排除 model-thoughts
        const messageContent = turn.querySelector('message-content');
        if (!messageContent) return '';
        
        // 优先选择 markdown-main-panel
        let panel = messageContent.querySelector('.markdown-main-panel');
        if (!panel) {
            // 回退：使用整个 message-content，但要排除思考过程
            panel = messageContent;
        }
        
        const clone = panel.cloneNode(true);
        // 移除所有不需要的元素（含 Gemini 的屏幕阅读器隐藏文本）
        clone.querySelectorAll('button.retry-without-tool-button, model-thoughts, .model-thoughts, .thoughts-header, .cdk-visually-hidden').forEach(b => b.remove());
        
        const text = htmlToMarkdown(clone);
        // 过滤掉只有思考标题的短文本（通常小于50字符且不包含换行）
        if (text.length < 50 && !text.includes('\n') && !text.includes('*') && !text.includes('#')) {
            // 可能是思考标题如"分析分析"、"Analyzing"etc，跳过
            return '';
        }
        return text;
    },

    // 导出前强制提交所有待处理的 assistant 文本（忽略 VERSION_STABLE 延迟）
    forceCommitAll: () => {
        const { turns, order } = VersionTracker.tracker;
        for (const id of order) {
            const t = turns[id];
            if (!t || !t.assistantPendingText) continue;
            const text = t.assistantPendingText;
            const images = t.assistantPendingImages || [];
            const userVersion = t.userVersions.at(-1)?.version ?? null;
            const last = t.assistantVersions.at(-1);
            if (last?.userVersion === userVersion && last?.text === text) {
                // 文本已提交，但图片可能尚未更新
                if (images.length && !VersionTracker.areImageListsEqual(t.assistantImages.get(last.version) || [], images)) {
                    t.assistantImages.set(last.version, images);
                }
                continue;
            }
            const version = t.assistantVersions.length;
            t.assistantVersions.push({ version, type: version ? 'retry' : 'normal', userVersion, text });
            if (images.length) t.assistantImages.set(version, images);
            t.assistantCommittedText = text;
        }
    },

    buildVersionedData: (title, includeImages = true) => {
        const { turns, order } = VersionTracker.tracker;
        const result = [];
        console.log('[Gemini] buildVersionedData: tracked turns =', order.length, ', turnIds =', order);

        for (const id of order) {
            const t = turns[id];
            if (!t) continue;

            const mapVersions = (versions, imgMap) => versions
                .filter(v => v.text?.trim() || v.thinking?.trim() || (includeImages && imgMap.get(v.version)?.length))
                .map(v => {
                    const d = { version: v.version, type: v.type, text: v.text };
                    if (v.userVersion !== undefined) d.userVersion = v.userVersion;
                    if (v.thinking) d.thinking = v.thinking;
                    const imgs = includeImages ? imgMap.get(v.version) : null;
                    if (imgs?.length) d.images = imgs;
                    return d;
                });

            result.push({
                turnIndex: result.length,
                human: t.userVersions.length ? { versions: mapVersions(t.userVersions, t.userImages) } : null,
                assistant: t.assistantVersions.length ? { versions: mapVersions(t.assistantVersions, t.assistantImages) } : null
            });
        }

        return { title: title || 'Gemini Chat', platform: 'gemini', exportedAt: new Date().toISOString(), conversation: result };
    }
};

VersionTracker.tracker = VersionTracker.createEmptyTracker();

window.loominaryGeminiExport = (title) => {
    const includeImages = document.getElementById(Config.IMAGE_SWITCH_ID)?.checked || false;
    return VersionTracker.buildVersionedData(title || 'Gemini Chat', includeImages);
};
window.loominaryGeminiReset = () => VersionTracker.resetTracker();

function gemini_fetchViaGM(url) {
    return new Promise((resolve, reject) => {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            return reject(new Error('GM_xmlhttpRequest not available'));
        }
        GM_xmlhttpRequest({
            method: "GET", url, responseType: "blob",
            onload: r => r.status >= 200 && r.status < 300 ? resolve(r.response) : reject(new Error(`Status: ${r.status}`)),
            onerror: e => reject(new Error(e.statusText || 'Network error'))
        });
    });
}

async function gemini_processImageElement(imgElement) {
    if (!imgElement) return null;
    const url = imgElement.src;
    if (!url || url.includes('drive-thirdparty.googleusercontent.com')
        || imgElement.classList.contains('new-file-icon') || imgElement.dataset.testId === 'new-file-icon') return null;

    // data: URI 直接提取 base64，无需 fetch
    if (url.startsWith('data:')) {
        try {
            const commaIdx = url.indexOf(',');
            if (commaIdx === -1) return null;
            const header = url.slice(0, commaIdx); // e.g. "data:image/jpeg;base64"
            const semiIdx = header.indexOf(';');
            if (semiIdx === -1) return null;
            const mimeType = header.slice(5, semiIdx); // after "data:"
            if (!mimeType.startsWith('image/')) return null;
            const base64Data = url.slice(commaIdx + 1);
            const size = Math.round((base64Data.length * 3) / 4);
            return { type: 'image', format: mimeType, size, data: base64Data, original_src: url.slice(0, 80) + '...' };
        } catch (e) {
            console.error('[Gemini] Failed to process data: URI image:', e);
            return null;
        }
    }

    try {
        let base64Data, mimeType, size;

        if (url.startsWith('blob:')) {
            try {
                const blob = await fetch(url).then(r => r.ok ? r.blob() : Promise.reject());
                base64Data = await Utils.blobToBase64(blob);
                mimeType = blob.type;
                size = blob.size;
            } catch {
                // Canvas fallback
                const canvas = document.createElement('canvas');
                canvas.width = imgElement.naturalWidth || imgElement.width;
                canvas.height = imgElement.naturalHeight || imgElement.height;
                canvas.getContext('2d').drawImage(imgElement, 0, 0);

                const isPhoto = canvas.width * canvas.height > 50000;
                const dataURL = isPhoto ? canvas.toDataURL('image/jpeg', 0.85) : canvas.toDataURL('image/png');
                mimeType = isPhoto ? 'image/jpeg' : 'image/png';
                base64Data = dataURL.split(',')[1];
                size = Math.round((base64Data.length * 3) / 4);
            }
        } else {
            const blob = await gemini_fetchViaGM(url);
            base64Data = await Utils.blobToBase64(blob);
            mimeType = blob.type;
            size = blob.size;
        }

        return { type: 'image', format: mimeType, size, data: base64Data, original_src: url };
    } catch (e) {
        console.error('[Gemini] Failed to process image:', url, e);
        return null;
    }
}

const MD_TAGS = {
    h1: c => `\n# ${c}\n`, h2: c => `\n## ${c}\n`, h3: c => `\n### ${c}\n`,
    h4: c => `\n#### ${c}\n`, h5: c => `\n##### ${c}\n`, h6: c => `\n###### ${c}\n`,
    strong: c => `**${c}**`, b: c => `**${c}**`, em: c => `*${c}*`, i: c => `*${c}*`,
    hr: () => '\n---\n', br: () => '\n', p: c => `\n${c}\n`, div: c => c,
    blockquote: c => `\n> ${c.split('\n').join('\n> ')}\n`,
    table: c => `\n${c}\n`, thead: c => c, tbody: c => c, tr: c => `${c}|\n`,
    th: c => `| **${c}** `, td: c => `| ${c} `, li: c => c
};

function htmlToMarkdown(element) {
    if (!element) return '';

    // HTML实体解码器（修复了 Gemini 的 Trusted Types 安全拦截问题）
    const decodeHtmlEntities = (str) => {
        if (!str) return '';
        try {
            // 使用 DOMParser 将字符串解析为文档，直接提取 textContent，从而完美避开 innerHTML 赋值
            const parser = new DOMParser();
            const doc = parser.parseFromString(str, 'text/html');
            return doc.documentElement.textContent || str;
        } catch (e) {
            console.error('[Loominary] HTML entity decoding failed:', e);
            return str;
        }
    };

    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent;
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const tag = node.tagName.toLowerCase();

        // ========== 数学公式处理 ==========
        // 处理 data-math 属性（Gemini 常用）
        const dataMathRaw = node.getAttribute('data-math');
        if (dataMathRaw) {
            // 解码HTML实体，确保LaTeX命令正确（如 &lt; -> <, &amp; -> &）
            const dataMath = decodeHtmlEntities(dataMathRaw);
            const content = dataMath.trim();
            // 检测是否为引用格式 [1] 或 [1, 2]
            if (/^\d+(,\s*\d+)*$/.test(content)) {
                // 检查后面是否跟着单位（区分引用和数值）
                let next = node.nextSibling;
                while (next && next.nodeType === 3 && !next.textContent.trim()) next = next.nextSibling;
                if (next) {
                    const text = (next.nodeType === 3 ? next.textContent : next.textContent || '').trim().toLowerCase();
                    const units = ['min', 's', 'sec', 'h', 'hr', 'd', 'day', 'g', 'kg', 'mg', 'l', 'ml', 'm', 'cm', 'mm', 'km', '%', '分', '秒', '时', '天', '克', '升', '米'];
                    if (units.some(u => text.startsWith(u))) {
                        return `$${content}$`; // 数值 + 单位
                    }
                }
                return `[${content}]`; // 引用
            }
            // 块级公式
            if (node.classList.contains('math-block')) {
                return `\n$$${dataMath}$$\n`;
            }
            return `$${dataMath}$`;
        }

        // 处理其他数学属性（data-tex, data-latex, KaTeX）
        const potentialLatexRaw = node.getAttribute('data-tex') || node.getAttribute('data-latex') || node.getAttribute('alt') || node.getAttribute('aria-label');
        if (potentialLatexRaw && (tag === 'math' || tag === 'img' || node.classList.contains('math') || /[=^\\_{]/.test(potentialLatexRaw))) {
            const potentialLatex = decodeHtmlEntities(potentialLatexRaw);
            let clean = potentialLatex.replace(/^Image of /, '').replace(/^Math formula: /, '');
            if (!clean.startsWith('$')) clean = `$${clean}$`;
            return clean;
        }

        // math 标签
        if (tag === 'math') {
            const annotation = node.querySelector('annotation[encoding="application/x-tex"]');
            if (annotation) {
                const latex = decodeHtmlEntities(annotation.textContent.trim());
                return `$${latex}$`;
            }
            return node.textContent;
        }

        // KaTeX 元素
        if (node.classList.contains('katex-mathml')) {
            const annotation = node.querySelector('annotation');
            if (annotation) {
                const latex = decodeHtmlEntities(annotation.textContent);
                return `$${latex}$`;
            }
        }
        if (node.classList.contains('katex-html')) return '';

        // ========== 表格修复处理 ==========
        if (tag === 'table') {
            let md = '\n';
            let rows = Array.from(node.rows || node.querySelectorAll('tr'));

            // 提取数据矩阵
            let matrix = rows.map(row => {
                const cells = row.cells?.length > 0 ? Array.from(row.cells) : Array.from(row.querySelectorAll('td, th'));
                return cells.map(cell => processNode(cell).replace(/(\r\n|\n|\r)/gm, ' ').trim());
            });

            // 过滤完全空的行
            matrix = matrix.filter(row => row.some(cell => cell !== ''));
            if (matrix.length === 0) return '';

            // 确定最大列数
            const maxCols = matrix.reduce((max, row) => Math.max(max, row.length), 0);

            // 移除单列伪标题（如果表格明显是多列的）
            if (matrix.length > 1 && matrix[0].length === 1 && maxCols > 1) {
                matrix.shift();
            }

            // 生成 Markdown
            matrix.forEach((row, rIndex) => {
                // 填充到相同列数
                while (row.length < maxCols) row.push('');
                md += '| ' + row.join(' | ') + ' |\n';
                // 在第一行后添加分隔符
                if (rIndex === 0) {
                    md += '| ' + Array(maxCols).fill(':---').join(' | ') + ' |\n';
                }
            });
            return md + '\n';
        }

        const children = [...node.childNodes].map(processNode).join('');

        if (MD_TAGS[tag]) return MD_TAGS[tag](children);

        if (tag === 'code') {
            const inPre = node.parentElement?.tagName.toLowerCase() === 'pre';
            if (children.includes('\n') || inPre) return inPre ? children : `\n\`\`\`\n${children}\n\`\`\`\n`;
            return `\`${children}\``;
        }
        if (tag === 'pre') {
            const code = node.querySelector('code');
            if (code) {
                const lang = code.className.match(/language-(\w+)/)?.[1] || '';
                return `\n\`\`\`${lang}\n${code.textContent}\n\`\`\`\n`;
            }
            return `\n\`\`\`\n${children}\n\`\`\`\n`;
        }
        if (tag === 'a') {
            const href = node.getAttribute('href');
            return href ? `[${children}](${href})` : children;
        }
        if (tag === 'ul') return `\n${[...node.children].map(li => `- ${processNode(li).replace(/^\n+/, '').replace(/\n+$/, '')}`).join('\n')}\n`;
        if (tag === 'ol') {
            const start = parseInt(node.getAttribute('start')) || 1;
            return `\n${[...node.children].map((li, i) => `${start + i}. ${processNode(li).replace(/^\n+/, '').replace(/\n+$/, '')}`).join('\n')}\n`;
        }

        return children;
    }

    let result = processNode(element).replace(/^\s+/, '').replace(/\n{3,}/g, '\n\n').trim();

    // 后处理：移除图片标注文本（如 "$, AI generated$" "$，AI 生成$"）
    result = result.replace(/\$[,，]\s*AI.{1,100}?\$/g, '');

    // 后处理：修复独立成行的引用 [1, 2]
    result = result.replace(/([^\n])\n+(\[[\d,\s.]+\])\n+([^\n])/g, (match, prevChar, citation, nextChar) => {
        const isNextPunctuation = /[。，；：！？.,;:!?]/.test(nextChar);
        return `${prevChar} ${citation}${isNextPunctuation ? '' : ' '}${nextChar}`;
    });

    return result;
}

// ==================== AI Studio XHR 拦截 ====================
const AiStudioXHR = {
    capturedData: null,
    capturedTimestamp: 0,

    init: () => {
        if (State.currentPlatform !== 'aistudio') return;
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url) {
            this._aistudio_url = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(body) {
            this.addEventListener('load', function() {
                if (this._aistudio_url && (
                    this._aistudio_url.includes('ResolveDriveResource') ||
                    this._aistudio_url.includes('CreatePrompt') ||
                    this._aistudio_url.includes('UpdatePrompt')
                )) {
                    try {
                        const rawText = this.responseText.replace(/^\)\]\}'/, '').trim();
                        let json = JSON.parse(rawText);
                        if (Array.isArray(json) && json.length > 0) {
                            // Normalize: ResolveDriveResource returns [[...]], CreatePrompt/UpdatePrompt returns [...]
                            if (typeof json[0] === 'string' && json[0].startsWith('prompts/')) {
                                json = [json];
                            }
                            AiStudioXHR.capturedData = json;
                            AiStudioXHR.capturedTimestamp = Date.now();
                            console.log('[Loominary AI Studio] XHR intercepted:', rawText.length, 'chars');
                        }
                    } catch (err) {
                        console.error('[Loominary AI Studio] XHR parse error:', err.message);
                    }
                }
            });
            return originalSend.apply(this, arguments);
        };
        console.log('[Loominary AI Studio] XHR interceptor installed');
    },

    isTurn: (arr) => {
        if (!Array.isArray(arr)) return false;
        return arr.includes('user') || arr.includes('model');
    },

    findHistory: (node, depth = 0) => {
        if (depth > 4 || !Array.isArray(node)) return null;
        if (node.slice(0, 5).some(child => AiStudioXHR.isTurn(child))) return node;
        for (const child of node) {
            if (Array.isArray(child)) {
                const result = AiStudioXHR.findHistory(child, depth + 1);
                if (result) return result;
            }
        }
        return null;
    },

    extractText: (turn) => {
        const candidates = [];
        const scan = (item, d = 0) => {
            if (d > 3) return;
            if (typeof item === 'string' && item.length > 1 && !['user', 'model', 'function'].includes(item)) {
                candidates.push(item);
            } else if (Array.isArray(item)) {
                item.forEach(sub => scan(sub, d + 1));
            }
        };
        scan(turn.slice(0, 3));
        return candidates.sort((a, b) => b.length - a.length)[0] || '';
    },

    isThinking: (turn) => Array.isArray(turn) && turn.length > 19 && turn[19] === 1,
    isResponse: (turn) => Array.isArray(turn) && turn.length > 16 && turn[16] === 1,
    isCodeExec: (turn) => Array.isArray(turn) && turn.length > 10 && Array.isArray(turn[10]) && turn[10][0] === 1 && typeof turn[10][1] === 'string',
    isCodeResult: (turn) => Array.isArray(turn) && turn.length > 11 && Array.isArray(turn[11]) && turn[11][0] === 1 && typeof turn[11][1] === 'string',

    // 将 XHR 数据转换为 Loominary 的 conversation 格式
    parseToConversation: () => {
        if (!AiStudioXHR.capturedData) return null;
        try {
            const root = AiStudioXHR.capturedData[0];
            const history = AiStudioXHR.findHistory(root);
            if (!history) return null;

            const pairs = [];
            let pendingThinking = [];
            let pendingCode = [];
            let currentUser = null;

            for (const turn of history) {
                if (!Array.isArray(turn)) continue;
                const isUser = turn.includes('user');
                const isModel = turn.includes('model');

                if (isUser) {
                    const text = AiStudioXHR.extractText(turn);
                    if (text) currentUser = text;
                    pendingThinking = [];
                    pendingCode = [];
                } else if (isModel) {
                    const thinking = AiStudioXHR.isThinking(turn);
                    const response = AiStudioXHR.isResponse(turn);
                    const codeExec = AiStudioXHR.isCodeExec(turn);
                    const codeResult = AiStudioXHR.isCodeResult(turn);

                    if (codeExec) pendingCode.push({ type: 'code', content: turn[10][1] });
                    if (codeResult) pendingCode.push({ type: 'result', content: turn[11][1] });
                    if ((codeExec || codeResult) && !response && !thinking) continue;

                    if (thinking && !response) {
                        const text = AiStudioXHR.extractText(turn);
                        if (text) pendingThinking.push(text);
                    } else {
                        let text = AiStudioXHR.extractText(turn);
                        let assistantText = '';

                        // 添加代码执行（保留在正文中）
                        if (pendingCode.length > 0) {
                            for (const block of pendingCode) {
                                if (block.type === 'code') {
                                    assistantText += `<details>\n<summary><strong>Executable Code</strong></summary>\n\n\`\`\`python\n${block.content}\n\`\`\`\n\n</details>\n\n`;
                                } else if (block.type === 'result') {
                                    assistantText += `<details>\n<summary><strong>Code Execution Result</strong></summary>\n\n\`\`\`\n${block.content}\n\`\`\`\n\n</details>\n\n`;
                                }
                            }
                            pendingCode = [];
                        }

                        if (text) assistantText += text;

                        // 思考内容单独存储到 thinking 字段
                        const thinkingText = pendingThinking.length > 0 ? pendingThinking.join('\n\n').trim() : undefined;
                        pendingThinking = [];

                        if (assistantText || thinkingText) {
                            const assistantObj = { text: assistantText.trim() };
                            if (thinkingText) assistantObj.thinking = thinkingText;
                            pairs.push({
                                human: { text: currentUser || '[No preceding user prompt found]' },
                                assistant: assistantObj
                            });
                            currentUser = null;
                        }
                    }
                }
            }

            // 如果最后有未配对的用户消息
            if (currentUser) {
                pairs.push({
                    human: { text: currentUser },
                    assistant: { text: '[Model response is pending]' }
                });
            }

            return pairs.length > 0 ? pairs : null;
        } catch (e) {
            console.error('[Loominary AI Studio] XHR parse error:', e);
            return null;
        }
    },

    getTitle: () => {
        if (!AiStudioXHR.capturedData) return null;
        try {
            const root = AiStudioXHR.capturedData[0];
            if (Array.isArray(root[4]) && typeof root[4][0] === 'string') return root[4][0];
        } catch (e) {}
        return null;
    }
};

function getAIStudioScroller() {
    for (const sel of ['ms-chat-session ms-autoscroll-container', 'mat-sidenav-content', '.chat-view-container']) {
        const el = document.querySelector(sel);
        if (el && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)) return el;
    }
    return document.documentElement;
}

async function extractDataIncremental_AiStudio(includeImages = true) {
    for (const turn of document.querySelectorAll('ms-chat-turn')) {
        if (collectedData.has(turn)) continue;

        const userEl = turn.querySelector('.chat-turn-container.user');
        const modelEl = turn.querySelector('.chat-turn-container.model');
        const turnData = { type: 'unknown', text: '', images: [] };

        if (userEl) {
            turnData.type = 'user';
            const textEl = userEl.querySelector('.user-prompt-container .turn-content');
            if (textEl) {
                const clone = textEl.cloneNode(true);
                // 移除 author-label（含时间戳如 "User 14:56"）
                clone.querySelectorAll('.author-label, .turn-separator').forEach(e => e.remove());
                let text = clone.innerText.trim();
                if (text) turnData.text = text;
            }
            if (includeImages) {
                const imgs = userEl.querySelectorAll('.user-prompt-container img');
                console.log('[Loominary AI Studio DOM] user turn: img elements found:', imgs.length, [...imgs].map(i => i.src?.slice(0, 50)));
                turnData.images = (await Promise.all([...imgs].map(gemini_processImageElement))).filter(Boolean);
                console.log('[Loominary AI Studio DOM] user turn: images processed:', turnData.images.length);
            }
        } else if (modelEl) {
            const chunks = modelEl.querySelectorAll('ms-prompt-chunk');
            const texts = [], thinkingTexts = [], imgPromises = [];

            chunks.forEach(chunk => {
                const thoughtChunk = chunk.querySelector('ms-thought-chunk');
                if (thoughtChunk) {
                    const cmark = thoughtChunk.querySelector('ms-cmark-node');
                    if (cmark) {
                        const md = htmlToMarkdown(cmark);
                        if (md) thinkingTexts.push(md);
                    }
                    return;
                }
                // ms-image-chunk 内的图片（模型生成的图片）
                if (includeImages) {
                    const imageChunk = chunk.querySelector('ms-image-chunk img');
                    if (imageChunk) {
                        imgPromises.push(gemini_processImageElement(imageChunk));
                        return;
                    }
                }
                const cmark = chunk.querySelector('ms-cmark-node');
                if (cmark) {
                    const md = htmlToMarkdown(cmark);
                    if (md) texts.push(md);
                    if (includeImages) [...cmark.querySelectorAll('img')].forEach(i => imgPromises.push(gemini_processImageElement(i)));
                }
            });

            const text = texts.join('\n\n').trim();
            const thinkingText = thinkingTexts.join('\n\n').trim();
            if (text || thinkingText) { turnData.type = 'model'; turnData.text = text; }
            if (thinkingText) turnData.thinking = thinkingText;
            if (includeImages) turnData.images = (await Promise.all(imgPromises)).filter(Boolean);
            console.log('[Loominary AI Studio DOM] model turn: text=' + text.length + 'chars, thinking=' + thinkingText.length + 'chars, images=' + turnData.images.length, 'chunks=' + chunks.length);
        }

        if (turnData.type !== 'unknown' && (turnData.text || turnData.images.length)) {
            collectedData.set(turn, turnData);
        }
    }
}

const ScraperHandler = {
    handlers: {
        gemini: {
            getTitle: () => {
                const domTitle = document.querySelector('[data-test-id="conversation-title"]')?.textContent?.trim();
                if (domTitle) return domTitle;
                const input = prompt('请输入对话标题 / Enter title:', '对话');
                return input === null ? null : (input || i18n.t('untitledChat'));
            },
            extractData: async (includeImages = true) => {
                const data = [];
                const turns = document.querySelectorAll("div.conversation-turn, div.single-turn, div.conversation-container");

                for (const container of turns) {
                    const userEl = container.querySelector("user-query .query-text, .query-text-line");
                    // 严格只从 message-content 获取内容
                    const messageContent = container.querySelector("message-content");
                    const modelEl = messageContent?.querySelector(".markdown-main-panel");

                    let humanText = "";
                    if (userEl) {
                        const userClone = userEl.cloneNode(true);
                        userClone.querySelectorAll('.cdk-visually-hidden').forEach(e => e.remove());
                        humanText = userClone.innerText.trim();
                    }
                    let assistantText = "";

                    if (modelEl) {
                        const clone = modelEl.cloneNode(true);
                        clone.querySelectorAll('button.retry-without-tool-button, model-thoughts, .model-thoughts, .thoughts-header, .cdk-visually-hidden').forEach(b => b.remove());
                        assistantText = htmlToMarkdown(clone);
                    } else if (messageContent) {
                        // 回退：使用整个 message-content
                        const clone = messageContent.cloneNode(true);
                        clone.querySelectorAll('button.retry-without-tool-button, model-thoughts, .model-thoughts, .thoughts-header, .cdk-visually-hidden').forEach(b => b.remove());
                        assistantText = htmlToMarkdown(clone);
                    }
                    
                    // 过滤掉只有思考标题的短文本
                    if (assistantText.length < 50 && !assistantText.includes('\n') && !assistantText.includes('*') && !assistantText.includes('#')) {
                        assistantText = "";
                    }

                    let userImages = [], modelImages = [];
                    if (includeImages) {
                        const uImgs = container.querySelectorAll("user-query img, user-query-file-preview img, .file-preview-container img");
                        // 只从 message-content 获取图片
                        const mImgs = messageContent?.querySelectorAll("img") || [];
                        userImages = (await Promise.all([...uImgs].map(gemini_processImageElement))).filter(Boolean);
                        modelImages = (await Promise.all([...mImgs].map(gemini_processImageElement))).filter(Boolean);
                    }

                    if (humanText || assistantText || userImages.length || modelImages.length) {
                        const human = { text: humanText };
                        const assistant = { text: assistantText };
                        if (userImages.length) human.images = userImages;
                        if (modelImages.length) assistant.images = modelImages;
                        data.push({ human, assistant });
                    }
                }
                return data;
            }
        },

        aistudio: {
            getTitle: () => {
                return AiStudioXHR.getTitle() || 'AI_Studio_Chat';
            },
            extractData: async (includeImages = true) => {
                console.log('[Loominary AI Studio] extractData called, includeImages:', includeImages);
                // 优先使用 XHR 拦截数据（即时、完整）
                const xhrResult = AiStudioXHR.parseToConversation();
                console.log('[Loominary AI Studio] XHR result:', xhrResult ? xhrResult.length + ' pairs' : 'null');
                if (xhrResult && xhrResult.length > 0) {
                    console.log('[Loominary AI Studio] Using XHR path');
                    // XHR 不含图片，通过滚动 DOM 补充提取
                    if (includeImages) {
                        console.log('[Loominary AI Studio] Starting DOM image collection');
                        const turns = document.querySelectorAll('ms-chat-turn');
                        console.log('[Loominary AI Studio] ms-chat-turn elements found:', turns.length);

                        if (turns.length > 0) {
                            const scroller = getAIStudioScroller();
                            scroller.scrollTop = 0;
                            await Utils.sleep(Config.TIMING.SCROLL_TOP_WAIT);

                            const imageMap = new Map();
                            const collectImages = async () => {
                                const currentTurns = document.querySelectorAll('ms-chat-turn');
                                for (const turn of currentTurns) {
                                    if (imageMap.has(turn)) continue;
                                    const allImgs = turn.querySelectorAll('ms-image-chunk img');
                                    const userImgs = [...turn.querySelectorAll('.chat-turn-container.user ms-image-chunk img')]
                                        .filter(img => !img.src.includes('drive-thirdparty.googleusercontent.com'));
                                    const modelImgs = [...turn.querySelectorAll('.chat-turn-container.model ms-image-chunk img')]
                                        .filter(img => !img.src.includes('drive-thirdparty.googleusercontent.com'));
                                    if (allImgs.length) {
                                        console.log('[Loominary AI Studio] Turn has', allImgs.length, 'img(s), user:', userImgs.length, 'model:', modelImgs.length,
                                            [...allImgs].map(i => i.src?.slice(0, 60)));
                                    }
                                    if (userImgs.length || modelImgs.length) {
                                        imageMap.set(turn, {
                                            userImages: (await Promise.all(userImgs.map(gemini_processImageElement))).filter(Boolean),
                                            modelImages: (await Promise.all(modelImgs.map(gemini_processImageElement))).filter(Boolean)
                                        });
                                    } else {
                                        imageMap.set(turn, null);
                                    }
                                }
                            };

                            let lastScrollTop = -1;
                            while (true) {
                                await collectImages();
                                if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 10) break;
                                lastScrollTop = scroller.scrollTop;
                                scroller.scrollTop += scroller.clientHeight * 0.85;
                                await Utils.sleep(Config.TIMING.SCROLL_DELAY);
                                if (scroller.scrollTop === lastScrollTop) break;
                            }
                            await collectImages();

                            const totalWithImages = [...imageMap.values()].filter(v => v !== null).length;
                            console.log('[Loominary AI Studio] Image collection done, turns with images:', totalWithImages);

                            // 按 DOM 顺序合并图片到 XHR pairs
                            let pairIdx = 0;
                            let pendingUserImages = null;
                            for (const turn of document.querySelectorAll('ms-chat-turn')) {
                                const data = imageMap.get(turn);
                                const isUser = turn.querySelector('.chat-turn-container.user');
                                const isModel = turn.querySelector('.chat-turn-container.model');
                                if (isUser && data?.userImages?.length) {
                                    pendingUserImages = data.userImages;
                                }
                                if (isModel) {
                                    if (pairIdx < xhrResult.length) {
                                        if (pendingUserImages) {
                                            xhrResult[pairIdx].human.images = pendingUserImages;
                                            pendingUserImages = null;
                                        }
                                        if (data?.modelImages?.length) {
                                            xhrResult[pairIdx].assistant.images = data.modelImages;
                                        }
                                    }
                                    pairIdx++;
                                }
                            }
                            console.log('[Loominary AI Studio] Image merge done, pairs processed:', pairIdx);
                        }
                    }
                    return xhrResult;
                }
                console.log('[Loominary AI Studio] Using DOM fallback path');

                // DOM 回退（滚动提取）
                collectedData.clear();
                const scroller = getAIStudioScroller();
                scroller.scrollTop = 0;
                await Utils.sleep(Config.TIMING.SCROLL_TOP_WAIT);

                let lastScrollTop = -1;
                while (true) {
                    await extractDataIncremental_AiStudio(includeImages);
                    if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 10) break;
                    lastScrollTop = scroller.scrollTop;
                    scroller.scrollTop += scroller.clientHeight * 0.85;
                    await Utils.sleep(Config.TIMING.SCROLL_DELAY);
                    if (scroller.scrollTop === lastScrollTop) break;
                }

                await extractDataIncremental_AiStudio(includeImages);
                await Utils.sleep(500);

                const sorted = [];
                document.querySelectorAll('ms-chat-turn').forEach(t => {
                    if (collectedData.has(t)) sorted.push(collectedData.get(t));
                });

                const paired = [];
                let lastHuman = null;

                for (const item of sorted) {
                    if (item.type === 'user') {
                        lastHuman = lastHuman || { text: '', images: [] };
                        lastHuman.text = (lastHuman.text ? lastHuman.text + '\n' : '') + item.text;
                        if (item.images?.length) lastHuman.images.push(...item.images);
                    } else if (item.type === 'model') {
                        const human = { text: lastHuman?.text || "[No preceding user prompt found]" };
                        if (lastHuman?.images?.length) human.images = lastHuman.images;
                        const assistant = { text: item.text };
                        if (item.thinking) assistant.thinking = item.thinking;
                        if (item.images?.length) assistant.images = item.images;
                        paired.push({ human, assistant });
                        lastHuman = null;
                    }
                }

                if (lastHuman) {
                    const human = { text: lastHuman.text };
                    if (lastHuman.images?.length) human.images = lastHuman.images;
                    paired.push({ human, assistant: { text: "[Model response is pending]" } });
                }
                return paired;
            }
        }
    },

    buildConversationJson: async (platform, title) => {
        const handler = ScraperHandler.handlers[platform];
        if (!handler) throw new Error('Invalid platform handler');

        if (platform === 'gemini' && document.getElementById(Config.CANVAS_SWITCH_ID)?.checked) {
            // 导出前强制扫描一次，避免因 URL 变更重置或时序问题导致数据为空
            VersionTracker.isScanning = false; // 防止卡死
            await VersionTracker.scanOnce();
            VersionTracker.forceCommitAll();
            const includeImagesForVersioned = document.getElementById(Config.IMAGE_SWITCH_ID)?.checked || false;
            const versionedData = VersionTracker.buildVersionedData(title, includeImagesForVersioned);
            if (versionedData.conversation.length > 0) return versionedData;
            // 版本追踪数据为空，回退到普通提取
        }

        const includeImages = document.getElementById(Config.IMAGE_SWITCH_ID)?.checked || false;
        const conversation = await handler.extractData(includeImages);
        if (!conversation?.length) throw new Error(i18n.t('noContent'));

        return { title, platform, exportedAt: new Date().toISOString(), conversation };
    },

    addButtons: (controlsArea, platform) => {
        const handler = ScraperHandler.handlers[platform];
        if (!handler) return;

        const colors = { gemini: '#1a73e8', aistudio: '#777779' };
        const color = colors[platform] || '#4285f4';
        const useInline = platform === 'gemini';

        const createToggle = (label, id, state, onChange) => {
            const toggle = Utils.createToggle(label, id, state);
            const input = toggle.querySelector('.loominary-switch input');
            if (input) {
                input.addEventListener('change', onChange);
                const slider = toggle.querySelector('.loominary-slider');
                if (slider) slider.style.setProperty('--theme-color', color);
            }
            return toggle;
        };

        if (platform === 'gemini') {
            controlsArea.appendChild(createToggle(i18n.t('versionTracking') || '版本追踪', Config.CANVAS_SWITCH_ID, State.includeCanvas, e => {
                State.includeCanvas = e.target.checked;
                localStorage.setItem('includeCanvas', State.includeCanvas);
                e.target.checked ? VersionTracker.startTracking() : VersionTracker.stopTracking();
            }));
            if (State.includeCanvas) VersionTracker.startTracking();
        }

        if (platform === 'gemini' || platform === 'aistudio') {
            controlsArea.appendChild(createToggle(i18n.t('includeImages'), Config.IMAGE_SWITCH_ID, State.includeImages, e => {
                State.includeImages = e.target.checked;
                localStorage.setItem('includeImages', State.includeImages);
            }));
        }

        const createActionBtn = (icon, label, action) => {
            const btn = Utils.createButton(`${icon} ${i18n.t(label)}`, action, useInline);
            if (useInline) Object.assign(btn.style, { backgroundColor: color, color: 'white' });
            return btn;
        };

        controlsArea.appendChild(createActionBtn(previewIcon, 'viewOnline', async btn => {
            const title = handler.getTitle();
            if (!title) return;
            const original = btn.innerHTML;
            Utils.setButtonLoading(btn, i18n.t('loading'));
            let progress = platform === 'aistudio' ? Utils.createProgressElem(controlsArea) : null;
            if (progress) progress.textContent = i18n.t('loading');
            try {
                const json = await ScraperHandler.buildConversationJson(platform, title);
                const filename = `${platform}_${Utils.sanitizeFilename(title)}_${new Date().toISOString().slice(0, 10)}.json`;
                await Communicator.open(JSON.stringify(json, null, 2), filename);
            } catch (e) {
                ErrorHandler.handle(e, 'Preview conversation', { userMessage: `${i18n.t('loadFailed')} ${e.message}` });
            } finally {
                Utils.restoreButton(btn, original);
                progress?.remove();
            }
        }));

        controlsArea.appendChild(createActionBtn(exportIcon, 'exportCurrentJSON', async btn => {
            const title = handler.getTitle();
            if (!title) return;
            const original = btn.innerHTML;
            Utils.setButtonLoading(btn, i18n.t('exporting'));
            let progress = platform === 'aistudio' ? Utils.createProgressElem(controlsArea) : null;
            if (progress) progress.textContent = i18n.t('exporting');
            try {
                const json = await ScraperHandler.buildConversationJson(platform, title);
                const baseName = `${platform}_${Utils.sanitizeFilename(title)}_${new Date().toISOString().slice(0, 10)}`;
                await loominaryExportMarkdown(json, baseName);
            } catch (e) {
                ErrorHandler.handle(e, 'Export conversation');
            } finally {
                Utils.restoreButton(btn, original);
                progress?.remove();
            }
        }));
    }
};


    const UI = {

        injectStyle: () => {
            const platformColors = {
                claude: '#141413',
                chatgpt: '#10A37F',
                grok: '#000000',
                gemini: '#1a73e8',

                aistudio: '#777779'
            };
            const buttonColor = platformColors[State.currentPlatform] || '#4285f4';
            console.log('[Loominary] Current platform:', State.currentPlatform);
            console.log('[Loominary] Button color:', buttonColor);
            document.documentElement.style.setProperty('--loominary-button-color', buttonColor);
            console.log('[Loominary] CSS variable --loominary-button-color set to:', buttonColor);
            const linkId = 'loominary-fetch-external-css';
                                    GM_addStyle(`
                #loominary-controls {
                    position: fixed !important;
                    top: 50% !important;
                    right: 0 !important;
                    transform: translateY(-50%) translateX(10px) !important;
                    background: white !important;
                    border: 1px solid #dadce0 !important;
                    border-radius: 8px !important;
                    padding: 16px 16px 8px 16px !important;
                    width: 136px !important;
                    z-index: 999999 !important;
                    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;
                    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                }

                #loominary-controls.collapsed {
                    transform: translateY(-50%) translateX(calc(100% - 35px + 6px)) !important;
                    opacity: 0.6 !important;
                    background: white !important;
                    border-color: #dadce0 !important;
                    border-radius: 8px 0 0 8px !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                    pointer-events: none !important;
                }
                #loominary-controls.collapsed .loominary-main-controls {
                    opacity: 0 !important;
                    pointer-events: none !important;
                }

                #loominary-controls:hover {
                    opacity: 1 !important;
                }

                #loominary-toggle-button {
                    position: absolute !important;
                    left: 0 !important;
                    top: 50% !important;
                    transform: translateY(-50%) translateX(-50%) !important;
                    cursor: pointer !important;
                    width: 32px !important;
                    height: 32px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    background: #ffffff !important;
                    color: var(--loominary-button-color) !important;
                    border-radius: 50% !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
                    border: 1px solid #dadce0 !important;
                    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    z-index: 1000 !important;
                    pointer-events: all !important;
                }

                #loominary-controls.collapsed #loominary-toggle-button {
                    z-index: 2 !important;
                    left: 16px !important;
                    transform: translateY(-50%) translateX(-50%) !important;
                    width: 21px !important;
                    height: 21px !important;
                    background: var(--loominary-button-color) !important;
                    color: white !important;
                }

                #loominary-controls.collapsed #loominary-toggle-button:hover {
                    box-shadow:
                        0 4px 12px rgba(0,0,0,0.25),
                        0 0 0 3px rgba(255,255,255,0.9) !important;
                    transform: translateY(-50%) translateX(-50%) scale(1.15) !important;
                    opacity: 0.9 !important;
                }

                .loominary-main-controls {
                    margin-left: 0px !important;
                    padding: 0 3px !important;
                    transition: opacity 0.7s !important;
                }

                .loominary-title {
                    font-size: 16px !important;
                    font-weight: 700 !important;
                    color: #202124 !important;
                    text-align: center;
                    margin-bottom: 12px !important;
                    padding-bottom: 0px !important;
                    letter-spacing: 0.3px !important;
                }

                .loominary-input-trigger {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 3px !important;
                    font-size: 10px !important;
                    margin: 10px auto 0 auto !important;
                    padding: 2px 6px !important;
                    border-radius: 3px !important;
                    background: transparent !important;
                    cursor: pointer !important;
                    transition: all 0.15s !important;
                    white-space: nowrap !important;
                    color: #5f6368 !important;
                    border: none !important;
                    font-weight: 500 !important;
                    width: fit-content !important;
                }

                .loominary-input-trigger:hover {
                    background: #f1f3f4 !important;
                    color: #202124 !important;
                }

                .loominary-button {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: flex-start !important;
                    gap: 8px !important;
                    width: 100% !important;
                    padding: 8px 12px !important;
                    margin: 8px 0 !important;
                    border: none !important;
                    border-radius: 6px !important;
                    background: var(--loominary-button-color) !important;
                    color: white !important;
                    font-size: 11px !important;
                    font-weight: 500 !important;
                    cursor: pointer !important;
                    letter-spacing: 0.3px !important;
                    height: 32px !important;
                    box-sizing: border-box !important;
                }
                .loominary-button svg {
                    width: 16px !important;
                    height: 16px !important;
                    flex-shrink: 0 !important;
                }
                .loominary-button:disabled {
                    opacity: 0.6 !important;
                    cursor: not-allowed !important;
                }

                .loominary-status {
                    font-size: 10px !important;
                    padding: 6px 8px !important;
                    border-radius: 4px !important;
                    margin: 4px 0 !important;
                    text-align: center !important;
                }
                .loominary-status.success {
                    background: #e8f5e9 !important;
                    color: #2e7d32 !important;
                    border: 1px solid #c8e6c9 !important;
                }
                .loominary-status.error {
                    background: #ffebee !important;
                    color: #c62828 !important;
                    border: 1px solid #ffcdd2 !important;
                }

                .loominary-toggle {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    font-size: 11px !important;
                    font-weight: 500 !important;
                    color: #5f6368 !important;
                    margin: 3px 0 !important;
                    gap: 8px !important;
                    padding: 4px 8px !important;
                }

                .loominary-toggle:last-of-type {
                    margin-bottom: 14px !important;
                }

                .loominary-switch {
                    position: relative !important;
                    display: inline-block !important;
                    width: 32px !important;
                    height: 16px !important;
                    flex-shrink: 0 !important;
                }
                .loominary-switch input {
                    opacity: 0 !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                .loominary-slider {
                    position: absolute !important;
                    cursor: pointer !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background-color: #ccc !important;
                    transition: .3s !important;
                    border-radius: 34px !important;
                    --theme-color: var(--loominary-button-color);
                }
                .loominary-slider:before {
                    position: absolute !important;
                    content: "" !important;
                    height: 12px !important;
                    width: 12px !important;
                    left: 2px !important;
                    bottom: 2px !important;
                    background-color: white !important;
                    transition: .3s !important;
                    border-radius: 50% !important;
                }
                input:checked + .loominary-slider {
                    background-color: var(--theme-color, var(--loominary-button-color)) !important;
                }
                input:checked + .loominary-slider:before {
                    transform: translateX(16px) !important;
                }

                .loominary-loading {
                    display: inline-block !important;
                    width: 14px !important;
                    height: 14px !important;
                    border: 2px solid rgba(255, 255, 255, 0.3) !important;
                    border-radius: 50% !important;
                    border-top-color: #fff !important;
                    animation: loominary-spin 0.8s linear infinite !important;
                }
                @keyframes loominary-spin {
                    to { transform: rotate(360deg); }
                }

                .loominary-progress {
                    font-size: 10px !important;
                    color: #5f6368 !important;
                    margin-top: 4px !important;
                    text-align: center !important;
                    padding: 4px !important;
                    background: #f8f9fa !important;
                    border-radius: 4px !important;
                }

                .loominary-lang-toggle {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 3px !important;
                    font-size: 10px !important;
                    margin: 4px auto 0 auto !important;
                    padding: 2px 6px !important;
                    border-radius: 3px !important;
                    background: transparent !important;
                    cursor: pointer !important;
                    transition: all 0.15s !important;
                    white-space: nowrap !important;
                    color: #5f6368 !important;
                    border: none !important;
                    font-weight: 500 !important;
                    width: fit-content !important;
                }
                .loominary-lang-toggle:hover {
                    background: #f1f3f4 !important;
                    color: #202124 !important;
                }
            `);
        },

        toggleCollapsed: () => {
            State.isPanelCollapsed = !State.isPanelCollapsed;
            localStorage.setItem('exporterCollapsed', State.isPanelCollapsed);
            const panel = document.getElementById(Config.CONTROL_ID);
            const toggle = document.getElementById(Config.TOGGLE_ID);
            if (!panel || !toggle) return;
            if (State.isPanelCollapsed) {
                panel.classList.add('collapsed');
                safeSetInnerHTML(toggle, collapseIcon);
            } else {
                panel.classList.remove('collapsed');
                safeSetInnerHTML(toggle, expandIcon);
            }
        },

        recreatePanel: () => {
            document.getElementById(Config.CONTROL_ID)?.remove();
            State.panelInjected = false;
            UI.createPanel();
        },

        createPanel: () => {
            if (document.getElementById(Config.CONTROL_ID) || State.panelInjected) return false;

            const container = document.createElement('div');
            container.id = Config.CONTROL_ID;

            const color = getComputedStyle(document.documentElement)
            .getPropertyValue('--loominary-button-color')
            .trim() || '#141413';
            container.style.setProperty('--loominary-button-color', color);

            if (State.isPanelCollapsed) container.classList.add('collapsed');

            if (State.currentPlatform === 'gemini') {
                Object.assign(container.style, {
                    position: 'fixed',
                    top: '50%',
                    right: '0',
                    transform: 'translateY(-50%) translateX(10px)',
                    background: 'white',
                    border: '1px solid #dadce0',
                    borderRadius: '8px',
                    padding: '16px 16px 8px 16px',
                    width: '136px',
                    zIndex: '999999',
                    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
                    transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    boxSizing: 'border-box'
                });
            }

            const toggle = document.createElement('div');
            toggle.id = Config.TOGGLE_ID;
            safeSetInnerHTML(toggle, State.isPanelCollapsed ? collapseIcon : expandIcon);
            toggle.addEventListener('click', UI.toggleCollapsed);
            container.appendChild(toggle);

            const controls = document.createElement('div');
            controls.className = 'loominary-main-controls';

            if (State.currentPlatform === 'gemini') {
                Object.assign(controls.style, {
                    marginLeft: '0px',
                    padding: '0 3px',
                    transition: 'opacity 0.7s'
                });
            }

            const title = document.createElement('div');
            title.className = 'loominary-title';
            const titles = {
                claude: 'Claude',
                chatgpt: 'ChatGPT',
                grok: 'Grok',
                gemini: 'Gemini', aistudio: 'AI Studio'
            };
            title.textContent = titles[State.currentPlatform] || 'Exporter';
            controls.appendChild(title);

            if (State.currentPlatform === 'claude') {
                ClaudeHandler.addUI(controls);
                ClaudeHandler.addButtons(controls);

                const inputLabel = document.createElement('div');
                inputLabel.className = 'loominary-input-trigger';
                inputLabel.textContent = `${i18n.t('manualUserId')}`;
                inputLabel.addEventListener('click', () => {
                    const newId = prompt(i18n.t('enterUserId'), State.capturedUserId);
                    if (newId?.trim()) {
                        State.capturedUserId = newId.trim();
                        localStorage.setItem('claudeUserId', State.capturedUserId);
                        alert(i18n.t('userIdSaved'));
                        UI.recreatePanel();
                    }
                });
                controls.appendChild(inputLabel);
            }
            if (State.currentPlatform === 'chatgpt') {
                ChatGPTHandler.addUI(controls);
                ChatGPTHandler.addButtons(controls);
            }
            if (State.currentPlatform === 'grok') {
                GrokHandler.addUI(controls);
                GrokHandler.addButtons(controls);
            }
            if (['gemini', 'aistudio'].includes(State.currentPlatform)) {
                ScraperHandler.addButtons(controls, State.currentPlatform);
            }

            const langToggle = document.createElement('div');
            langToggle.className = 'loominary-lang-toggle';
            langToggle.textContent = `🌐 ${i18n.getLanguageShort()}`;
            langToggle.addEventListener('click', () => {
                i18n.setLanguage(i18n.currentLang === 'zh' ? 'en' : 'zh');
                UI.recreatePanel();
            });
            controls.appendChild(langToggle);

            container.appendChild(controls);
            document.body.appendChild(container);
            State.panelInjected = true;

            const panel = document.getElementById(Config.CONTROL_ID);
            if (State.isPanelCollapsed) {
                panel.classList.add('collapsed');
                safeSetInnerHTML(toggle, collapseIcon);
            } else {
                panel.classList.remove('collapsed');
                safeSetInnerHTML(toggle, expandIcon);
            }

            return true;
        }
    };

    const init = () => {
        if (!State.currentPlatform) return;

        if (State.currentPlatform === 'claude') ClaudeHandler.init();
        if (State.currentPlatform === 'chatgpt') ChatGPTHandler.init();
        if (State.currentPlatform === 'grok') GrokHandler.init();
        if (State.currentPlatform === 'aistudio') AiStudioXHR.init();

        UI.injectStyle();

        const initPanel = () => {
            UI.createPanel();
            if (['claude', 'chatgpt', 'grok', 'gemini', 'aistudio'].includes(State.currentPlatform)) {
                let lastUrl = window.location.href;
                let panelCheckTimer = null;
                new MutationObserver(() => {
                    // URL 变化时重建面板
                    if (window.location.href !== lastUrl) {
                        lastUrl = window.location.href;
                        setTimeout(() => {
                            if (!document.getElementById(Config.CONTROL_ID)) {
                                State.panelInjected = false;
                                UI.createPanel();
                            }
                        }, 1000);
                    }
                    // SPA 框架可能在初始化时移除我们的面板，防抖检测并重建
                    if (State.panelInjected && !document.getElementById(Config.CONTROL_ID)) {
                        clearTimeout(panelCheckTimer);
                        panelCheckTimer = setTimeout(() => {
                            if (!document.getElementById(Config.CONTROL_ID)) {
                                State.panelInjected = false;
                                UI.createPanel();
                            }
                        }, 500);
                    }
                }).observe(document.body, { childList: true, subtree: true });
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(initPanel, Config.TIMING.PANEL_INIT_DELAY));
        } else {
            setTimeout(initPanel, Config.TIMING.PANEL_INIT_DELAY);
        }
    };


    init();
})();