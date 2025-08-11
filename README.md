<div align="center">

<img src="daps_logo.png" alt="DAPS Logo" width="130" />

# DAPS

Automate, optimize, and take control of your media libraries—with a slick, modern UI.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub Issues](https://img.shields.io/github/issues/Drazzilb08/daps.svg)](https://github.com/Drazzilb08/daps/issues)
[![GitHub PRs](https://img.shields.io/github/issues-pr/Drazzilb08/daps.svg)](https://github.com/Drazzilb08/daps/pulls)
[![GitHub Stars](https://img.shields.io/github/stars/Drazzilb08/daps.svg)](https://github.com/Drazzilb08/daps/stargazers)
[![Python](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://www.python.org/)
[![Bash](https://img.shields.io/badge/bash-5.0%2B-green.svg)](https://www.gnu.org/software/bash/)

</div>

---

## 🚀 Quickstart

See the [Wiki](https://github.com/Drazzilb08/daps/wiki) for full install and usage docs.

### **Docker Compose (recommended)**
Create a `docker-compose.yml` with:
```yaml
version: "3.9"

services:
  daps:
    container_name: daps
    image: ghcr.io/drazzilb08/daps:latest
    ports:
      - "8000:8000"
    volumes:
      - /path/to/config:/config
      - /path/to/kometa/assets/:/kometa
      - /path/to/posters:/posters
      - /path/to/media:/media
    environment:
      - PUID=${PUID}
      - PGID=${PGID}
      - TZ=${TIMEZONE}
    restart: unless-stopped
```
Start it with:
```bash
docker compose up -d
```

### **Docker (single run)**
```bash
docker run -d \
  -v /path/to/config:/config \
  -v /path/to/posters:/posters \
  -v /path/to/media:/media \
  -p 8000:8000 \
  ghcr.io/drazzilb08/daps:latest
```

### **Local (manual install)**
```bash
git clone https://github.com/Drazzilb08/daps.git
cd daps
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 main.py poster_renamerr
```

To run the frontend (in a separate terminal):

```bash
cd daps/ui
npm install
npm run dev
```

Then open the Web UI: [http://localhost:8000](http://localhost:8000)

---

## 🙋‍♂️ Contributing & Support

Pull requests are welcome for fixes, docs, or new module ideas.  
If you spot a bug or want a feature, open an [Issue](https://github.com/Drazzilb08/daps/issues) or jump into a PR.

---

<div align="center">
  
Made with ❤️ by Drazzilb  
If DAPS saved you time, star the repo, tell a friend, or buy yourself a cookie.

</div>