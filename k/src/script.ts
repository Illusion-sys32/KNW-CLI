import { NativeBridge } from './scripts/Modules.js';



document.addEventListener('DOMContentLoaded', function() {
  var darkTheme = NativeBridge.sys.getDarkTheme();
  if (darkTheme) {
      document.body.style.backgroundColor = 'black';
      document.body.style.color = 'white';
  } else {
      document.body.style.backgroundColor = 'white';
      document.body.style.color = 'black';

  };
    var btn = document.getElementById('btn');
    btn?.addEventListener('click', function() {
      NativeBridge.sys.openURL("https://google.com",false)
    });  
});
alert("hy")