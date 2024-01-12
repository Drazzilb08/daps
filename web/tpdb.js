// ==UserScript==
// @name        ThePosterDB Downloader
// @version     1.1
// @description Downloads all posters on the feed page on theposterdb.com's site in sequential order
// @author      Drazzilb | Modified by s0len
// @match       https://theposterdb.com/feed*
// @grant       GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  // Add custom CSS to the page
  const customStyles = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@100;300;400;500;600;700;800;900&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Poppins', sans-serif;
}

.fa-download {
  /* width: 250px;
  min-height: 100vh;*/
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 120px;
  background: none;
}

.button {
  display: flex;
  position: fixed;
  padding: 16px 30px;
  font-size: 1.5rem;
  color: #6eff3e;
  border: 2px solid rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  text-shadow: 0 0 15px #6eff3e;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.1rem;
  transition: 0.5s;
  z-index: 1;
  top: 50%;
  left: 35px;
}

.button:hover {
  color: #fff;
  border: 2px solid rgba(0, 0, 0, 0);
  box-shadow: 0 0 0px #6eff3e;
}

.button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  /*width: 100%;
  height: 100%;*/
  background: #6eff3e;
  z-index: -1;
  transform: scale(0);
  transition: 0.5s;
}

.button:hover::before {
  transform: scale(1);
  transition-delay: 0.5s;
  box-shadow: 0 0 10px #6eff3e,
    0 0 30px #6eff3e,
    0 0 60px #6eff3e;
}

.button span {
  position: absolute;
  background: #6eff3e;
  pointer-events: none;
  border-radius: 2px;
  box-shadow: 0 0 10px #6eff3e,
    0 0 20px #6eff3e,
    0 0 30px #6eff3e,
    0 0 50px #6eff3e,
    0 0 100px #6eff3e;
  transition: 0.5s ease-in-out;
  transition-delay: 0.25s;
}

.button:hover span {
  opacity: 0;
  transition-delay: 0s;
}

.button span:nth-child(2),
.button span:nth-child(4) {
  width: 20px;
  height: 4px;
}

.button:hover span:nth-child(2),
.button:hover span:nth-child(4) {
  transform: translateX(0);
}

.button span:nth-child(3),
.button span:nth-child(5) {
  width: 4px;
  height: 20px;
}

.button:hover span:nth-child(2),
.button:hover span:nth-child(4) {
  transform: translateY(0);
}

.button span:nth-child(2) {
  top: calc(50% - 2px);
  left: -30px;
  transform-origin: left;
}

.button:hover span:nth-child(2) {
  left: 50%;
}

.button span:nth-child(4) {
  top: calc(50% - 2px);
  right: -30px;
  transform-origin: right;
}

.button:hover span:nth-child(4) {
  right: 50%;
}

.button span:nth-child(3) {
  left: calc(50% - 2px);
  top: -30px;
  transform-origin: top;
}

.button:hover span:nth-child(3) {
  top: 50%;
}

.button span:nth-child(5) {
  left: calc(50% - 2px);
  bottom: -30px;
  transform-origin: bottom;
}

.button:hover span:nth-child(5 ) {
  bottom: 50%;
}`;

  // Inject custom styles into the page
  GM_addStyle(customStyles);

  // Create the button
  const button = document.createElement("div");
  button.innerHTML = '<i class="fa fa-download"></i>';
  button.className = 'button';

  // Append four spans to create the effect from the provided CSS
  for (let i = 0; i < 4; i++) {
    let span = document.createElement('span');
    button.appendChild(span);
  }

  // Add the button to the page
  document.body.appendChild(button);

  // Handle button hover
  button.addEventListener("mouseover", function () {
    button.title = downloading ? "Stop Downloads" : "Download All Posters";
  });

  // Handle button click
  let downloading = false;
  button.addEventListener("click", function () {
    downloading = !downloading;
    if (downloading) {
      button.style.backgroundColor = "#ff1867";
      button.style.color = "#111";
      button.innerHTML = '<i class="fa fa-times"></i>';
      downloadPosters(0);
    } else {
      button.style.backgroundColor = "#6eff3e";
      button.style.color = "#FFF";
      button.innerHTML = '<i class="fa fa-download"></i>';
    }
  });

  function downloadPosters(i) {
    const links = document.querySelectorAll(
      'a[download][href^="https://theposterdb.com/api/assets/"]'
    );

    if (i === links.length || !downloading) {
      button.style.backgroundColor = "#6eff3e";
      button.innerHTML = '<i class="fa fa-download"></i>';
      downloading = false;
      return;
    }

    const link = links[i];
    const url = link.getAttribute("href");
    const name = link.getAttribute("download");

    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob";
    xhr.onload = function () {
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(xhr.response);
      a.download = name;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      setTimeout(function () {
        downloadPosters(i + 1);
      }, 500);
    };

    xhr.send();
  }
})();