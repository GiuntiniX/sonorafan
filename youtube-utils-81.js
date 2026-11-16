'use strict';
/** Decodifica entidades HTML devolvidas por alguns titulos da YouTube Data API. */
function decodeYouTubeEntities(value) {
  const named={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',ndash:'–',mdash:'—',hellip:'…',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”'};
  return String(value??'').replace(/&(#(?:x[0-9a-fA-F]+|[0-9]+)|[a-zA-Z]+);/g,(match,code)=>{
    if(code[0]!=='#')return named[code]??match;
    const hex=/^#x/i.test(code);
    const number=Number.parseInt(code.slice(hex?2:1),hex?16:10);
    if(!Number.isInteger(number)||number<=0||number>0x10ffff||(number>=0xd800&&number<=0xdfff))return match;
    return String.fromCodePoint(number);
  });
}
module.exports={decodeYouTubeEntities};
