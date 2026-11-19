/* v184: preservar fallback quando imagem não estiver publicada. */
(function(){'use strict';var modal=document.getElementById('signupModal');if(!modal)return;var im=new Image();im.onload=function(){if(im.naturalWidth===1672&&im.naturalHeight===941)modal.classList.add('sf184-image-ready');};im.onerror=function(){modal.classList.remove('sf184-image-ready');};im.src='/art-132/sonorafan-cadastro-referencia-exata.webp';})();
/* v188: habilita a nova arte somente depois que o arquivo de imagem
   existir e tiver sido carregado com sucesso. Mantém o layout antigo
   como fallback enquanto o upload binário não for concluído. */
(function(){
  'use strict';
  var modal=document.getElementById('signupModal');
  if(!modal)return;
  var candidate=new Image();
  candidate.onload=function(){
    if(candidate.naturalWidth===1672 && candidate.naturalHeight===941){
      modal.classList.add('sf188-backstage-ready');
    }
  };
  candidate.onerror=function(){modal.classList.remove('sf188-backstage-ready');};
  candidate.src='/art-132/sonorafan-cadastro-backstage-final.avif?v=188';
})();
