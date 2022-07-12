Collection of unRAID userscripts

**Please note that these scripts are tested by me and a few friends. They very well may work for you but they are not tested under all conditions.** <br>

**Please test and use at your own risk.**

Scripts are still a work in progress and are not 100% tested

The plex backup script is a modified version of this script
https://github.com/rcodehub/unraid-plex-script

Features:
* All backup scripts feature a locking file that is placed in the `/tmp` dir this prevents any script from being run twice (useful if you're compressing a large tar archive)
* All backup scripts come with optional pigz compression
  * Scripts also come with variable to easily change pigz compression
* All Scripts feature discord intigration
  * Requires download of discord.sh found [here](https://github.com/chaoticweg/discord.sh/releases/tag/v1.6.1)
  * `discordLoc` variable is the location that you placed the discord.sh file

Future plans: <br>

1. ~~Add discord notifications to plex script via this [repo](https://github.com/ChaoticWeg/discord.sh).~~
2. ~~Update appdata script to be "better" script based upon this [repo](https://github.com/SpartacusIam/unraid-scripts).~~
3. Better documentation to readme

Finally I'm **not coder**, this was simply me playing around and killing time at work. I know very little about bash about 90% of this was googled and probably is the worst way to go about this process, if you want to clean up the code and make it more presentable or add a feature pleas emake a Pull Request.

Thanks