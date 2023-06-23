# **Warning**: Massive changes to python scripts, Requires requirements update

# NOHL
## Appreciation
First and formost I'd like to thank s0up4200 for his original script [here](https://github.com/s0up4200/scripts-for-the-arrs-and-brrs/blob/main/hardlink-radarr.py) gave me the idea for this version for the script. <br>

Thank you

## Overview
NOHL.py is a  script scans your media dir for files that aren't hardlinked, deletes the season (or file if the season isn't completely aired)/movie and then pushes a request to radarr/sonarr to download either the episode/season/movie
You can control it by unmonitoring movies/shows/seasons or you can add an exclude list for series also can include/exclude profiles (based upon the name you gave the profile w/in sonarr/radarr) if you leave it blank it will just do ALL

... More documentation to follow

# queinatorr
## Overview
... Placeholder

# Movie-Deletarr
## Overview

... Placeholder

# Renamer
## Overview
These are simple scripts that do not require much. Renamer hooks into your Radarr instance for Movie's names, Sonarr for your TV Show names and Plex for your collection names. 

The script will then parse over a list of posters that you download from sites such as [TPDb](http://www.theposterdb.com). The script will then use a bit of fuzzy matching to determine which file matches to which movie (this is done through the file's name and the movie title). If a match is found that is above the threshold it will then rename the file if needed or move the file to an assets directory. The intent of this script is to be used with the assets directory of Plex Meta Manager as the file's need to be named a certain way for it to pick them up.

I have ran this extensivly on a batch of over 5000 movies and a poster catalog of over 16,000 posters with very very few false posatives with the default thresholds (only 1 that I found to be exact). However your milage my vary.

**See config file for config settings**

Few notes: 
1. Please run in dry mode prior to any run to make sure you're not getting any false posatives. 
2. If you'd like to see if your threshold settings are too restrictive you can turn the loggin to INFO and it will give you a what if the score was 5 less.

## Installation/Usage
The script is simple just download the repo:

Fill out the head of the script 
If you need help finding the plex token look [here](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)

I recommend running all python scripts in a virtual enviroment, documents [here](https://www.google.com/search?client=safari&rls=en&q=virtual+python+enviroment&ie=UTF-8&oe=UTF-8)<br>
`source /path/to/virtual/enviroment`

Install requirements:<br>
`pip install -r requirements.txt`

Run script:<br>
`python /path/to/script/renamer.py`

You should see a progress the script connecting to the service you set up in the head of the script:

Here is an example of what a run would look like:
![img](../screenshots/renamer.py.png)

# Unmatched Assets

## Overview
This is a super simple script that takes your assets directory from PMM and bumps it against your media directory to check what assets your missing. I like to have complete sets of all my posters and have them all matching. This is very helpful to see what all I'm missing.

This script will also do Collections, however to accomplish this the script needs access to your plex's API just fill out that portion of the script and it will output what collections do not have custom assets in the assets dir of Plex-Meta-Manager

# Renameinatorr

Credit: This script was originally written in powershell by AngryCuban13 from his repo [here](https://github.com/angrycuban13/Just-A-Bunch-Of-Starr-Scripts)

Thanks to him and others who have helped me in making this script a thing.

## Description

This is a script for renaming media files for unlimited number of Sonarr and/or Radarr instances. The script can be run in a dry-run mode to preview changes without enacting any changes. The script can also be ran in a unattended mode where it will continuously cycle through all movies and series after they have all been tagged and renamed and then reset its self. The script also provides the option to reset all tags for any connected Sonarr/Radarr instances, this can be useful to start from the beginning if you change your naming scheme.

In order to use the script, you need to provide the URLs and API keys for your Sonarr and/or Radarr instances. The script will then connect to each instance, retrieve the list of movies or series, and rename the media files accordingly.

# Upgradinatorr

## Description

This is a script for upgrading your media using an unlimited number of Sonarr or Radarr instances. The script can be ran in a dry-run mode to preview how things will happen without actually pinging any of your indexers/trackers. The script can also be ran in an unattended mode where it will cycle through your entire Radarr or Sonarr library and reset its self when all Movies or Series have been tagged.


# Config File
```yml
global:
  radarr:
    - name: radarr_1
      api: abcdefghijlmnop
      url: http://192.168.1.200:7878
    - name: radarr_2
      api: abcdefghijklmnop
      url: http://localhost:1212
  sonarr:
    - name: sonarr_1
      api: abcdefghijlmnop
      url: http://192.168.1.200:8989
    - name: sonarr_2
      api: abcdefghijlmnop
      url: http://192.168.1.200:9090

upgradinatorr:
  log_level: info
  dry_run: true
  radarr:
    - name: radarr_1
      count:
      monitored: true
      status: released
      tag_name:
      unattended: false
    - name: radarr_2
      count:
      monitored: true
      status: released
      tag_name:
      unattended: false
  sonarr:
    - name: sonarr_1
      count:
      monitored: true
      status: released
      tag_name:
      unattended: false
    - name: sonarr_2
      count:
      monitored: true
      status: released
      tag_name:
      unattended: false
      dry_run: false

renameinator:
  log_level: info
  dry_run: true
  radarr:
    - name: radarr_1
      count: 1
      tag_name: renamed
      unattended: false
      reset: false
      dry_run: true
  sonarr:
    - name: sonarr_1
      count: 1
      tag_name: renamed
      unattended: false
      reset: false
      dry_run: true
```

## Overview
In this setup You can see two Radarr and two Sonarr instances are used, the script will support an unlimited amount, the key take away from this is the `name:` entry. The `name:` entry needs to match for radarr/sonarr so if you see in the example you have radarr_1 in the script options it needs to match for the global settings (this way it knows what settings to use for what instance).
<br>**Global Options:**<br>
```yml
global:
  radarr:
    - name: radarr_1
      api: abcdefghijlmnop
      url: http://192.168.1.200:7878
    - name: radarr_2
      api: abcdefghijklmnop
      url: http://localhost:1212
  sonarr:
    - name: sonarr_1
      api: abcdefghijlmnop
      url: http://192.168.1.200:8989
    - name: sonarr_2
      api: abcdefghijlmnop
      url: http://192.168.1.200:9090
```
This information should be fairly self explanitory, just remember that if you add more radarr or sonarrr instances just make sure the `name:` field matches to the the script setting's `name:` field 
<br>**Upgradinator options:**
```yml
upgradinatorr:
  log_level: info
  dry_run: true
  radarr:
    - name: radarr_1
      count:
      monitored: true
      status: released
      tag_name:
      unattended: false
    - name: radarr_2
      count:
      monitored: true
      status: released
      tag_name:
      unattended: false
  sonarr:
    - name: sonarr_1
      count:
      monitored: true
      status: released
      tag_name:
      unattended: false
    - name: sonarr_2
      count:
      monitored: true
      status: released
      tag_name:
      unattended: false
      dry_run: false
```

* `log_level`: 
    *  Log levels are info, critical, debug
    *  Each log level will display different information within the logs 
    *  Default: `info`
 *  `dry_run`:
    *  Run script without actually performaing any final actions:
    *  Default: false
 *  Radarr Instances:
    *  `name`: This must match the name of of the radarr in the global settings
    *  'count`: Must be an integer 
       *  Options: 1 - ∞ 
          *  **Warning:** I will not be responsible for any issues that are caused by you hitting a tracker/indexer's server. Please be conservative with this number
       *  Default: 1
    *  `monitored`: Do you want the script to search monitored or unmonitored movies
       *  Options: true or false
       *  Default: true
    *  `status`: The current status of the film as listed on TMDB.
       *  Options: "tba", "announced", "incinemas", "released", "deleted", "all"
       *  Default: released
    *  `tag_name`: The tag name you would like to use to keep track of what has been searched and what hasn't
       *  Options: Any unique string
       *  Default: `None` This field is required
    *  `unattended`: Do you wish for the script to reset its self after it has tagged all available movies
       *  Options: true or false
       *  Default: false
 *  Sonarr Instances:
    *  All options are the same except for `status`
    *  `status`: he current status of the film as listed on TheTVDb.
       *  Options: "continuing", "ended", "upcoming", "deleted", "all"
       *  Default: continuing
<br>**Renameinator options:**
```yml
renameinator:
  log_level: info
  dry_run: true
  radarr:
    - name: radarr_1
      count: 1
      tag_name: renamed
      unattended: false
      reset: false
  sonarr:
    - name: sonarr_1
      count: 1
      tag_name: renamed
      unattended: false
      reset: false
```
Most of these options are similar to `Upgradinatorr` except for the `reset` variable the options are `true` or `false` defaulting to `false` 