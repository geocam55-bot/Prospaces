import{r as o}from"./index-B-ZfHu6b.js";function c(e,t=300){const[r,u]=o.useState(e);return o.useEffect(()=>{const n=setTimeout(()=>{u(e)},t);return()=>{clearTimeout(n)}},[e,t]),r}export{c as u};
