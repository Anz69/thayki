import{j as t}from"./app-CeHiiIgs.js";if(typeof document<"u"&&!document.getElementById("gb-styles")){const e=document.createElement("style");e.id="gb-styles",e.textContent=`
    @keyframes gb-spin {
      from { transform: translate(-50%, -50%) rotate(0deg); }
      to   { transform: translate(-50%, -50%) rotate(360deg); }
    }
  `,document.head.appendChild(e)}function r({children:e,radius:n=20,borderWidth:a=2,speed:s=4,className:d="",innerClass:o=""}){return t.jsxs("div",{className:`relative overflow-hidden ${d}`,style:{borderRadius:n,padding:a},children:[t.jsx("div",{style:{position:"absolute",top:"50%",left:"50%",width:"220%",aspectRatio:"1",background:"conic-gradient(from 180deg at 50% 50%, #E2319B 0deg, #B331E2 68.4deg, #E2314C 360deg)",animation:`gb-spin ${s}s linear infinite`}}),t.jsx("div",{className:`relative ${o}`,style:{background:"#F5F5F7",borderRadius:Math.max(0,n-a)},children:e})]})}export{r as G};
