Collection of unRAID userscripts

## Installation

These scripts were designed to work on unRAID, however there shouldn't be any reason it wouldn't work on any Unix based system. <br>
However, on unRAID simply ensure you have `UserScripts` installed from the appstore > navigate to the `UserScripts` location within `Settings`> create a new script and then set your cron interval.

> Note: Most backup scripts use PIGZ for compression <br>
> If you'd like to use pigz you'll need to download it using NerdPack, which is also in the appstore

## Updating

Simply copy from the new script from <br>
`#------------- DO NOT MODIFY BELOW THIS LINE -------------#`<br>
to the bottom then paste that information over what you have in your script

## Versioning

I've started to put version numbers on each of my scripts, you can find the version at the very bottom of every script.
I do my best to keep up with everything

1. 0.0.X versions are bug fixes
2. 0.X.0 versions are minor changes
3. X.0.0 versions are major changes

## Submitting Pull Requests

I have no problem adding features or fixing issues with these scripts. However if you're going to submit a PR to correct my code **PLEASE** add detailed notes as to why this change needs to be made (ELI5 or Explain Like I'm 5). I'm not a coder but wish to learn what I can to make my life a bit easier. This will help me grow and make better content in the futre.

**Please note that these scripts are tested by me and a few friends. They very well may work for you but they are not tested under all conditions.** <br>

**Please test and use at your own risk.**

Scripts are still a work in progress and are not 100% tested

The plex backup script is a modified version of this script
https://github.com/rcodehub/unraid-plex-script

Features:

- All backup scripts feature a locking file that is placed in the `/tmp` dir this prevents any script from being run twice (useful if you're compressing a large tar archive)
- All backup scripts come with optional pigz compression
  - Scripts also come with variable to easily change pigz compression
- Most sripts feature discord intigration

Future plans: <br>

1. ~~Add discord notifications to plex script via this [repo](https://github.com/ChaoticWeg/discord.sh).~~
2. ~~Update appdata script to be "better" script based upon this [repo](https://github.com/SpartacusIam/unraid-scripts).~~
3. Notifiarr integration with passthrough?
4. Better documentation to readme

Finally I'm **not a coder**, this was simply me playing around and killing time at work. I know very little about bash about 90% of this was googled and probably is the worst way to go about this process, if you want to clean up the code and make it more presentable or add a feature please make a Pull Request.

Thanks

## Neat scripts I've found

1. [Automatic-Preroll](https://github.com/TheHumanRobot/Automatic-Preroll) This script has been depreciated but I still use it. The new version has a GUI.
2. bullmoose20 has some amazing scripts he writes, most importantly the plex-bloat-fix.py script [here](https://github.com/bullmoose20/Plex-Stuff) I find especially useful.
3. You can't have a list of scripts to use without including [JBOPS](https://github.com/blacktwin/JBOPS). I specifically use the Inactive User script and the kill stream script.

If you think there are some other neat ones I should include or try out please let me know.
