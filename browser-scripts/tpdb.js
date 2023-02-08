// ==UserScript==
// @name        ThePosterDB Downloader
// @version     1.0
// @description Downloads all posters on the feed page on theposterdb.com's site in sequential order
// @author      Drazzilb
// @match       https://theposterdb.com/feed*
// @grant       none
// ==/UserScript==

(function () {
  "use strict";

  // Create the button
  const button = document.createElement("button");
  button.innerHTML = '<i class="fa fa-download"></i>';
  button.style.backgroundColor = "green";
  button.style.color = "white";
  button.style.padding = "10px 20px";
  button.style.borderRadius = "50%";
  button.style.cursor = "pointer";
  button.style.position = "fixed";
  button.style.left = "0";
  button.style.top = "50%";
  button.style.transform = "translateY(-50%)";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";

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
      button.style.backgroundColor = "red";
      button.innerHTML = '<i class="fa fa-times"></i>';
      downloadPosters(0);
    } else {
      button.style.backgroundColor = "green";
      button.innerHTML = '<i class="fa fa-download"></i>';
    }
  });

  function downloadPosters(i) {
    const links = document.querySelectorAll(
      'a[download][href^="https://theposterdb.com/api/assets/"]'
    );

    if (i === links.length || !downloading) {
      button.style.backgroundColor = "green";
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
