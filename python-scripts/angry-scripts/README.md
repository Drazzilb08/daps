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