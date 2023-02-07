import os

# Define the paths to the assets directory and media directories
assets_path = '/mnt/user/appdata/plex-meta-manager/assets'
media_paths = ['/mnt/user/data/media/anime movies/',
               '/mnt/user/data/media/documentary movies/',
               '/mnt/user/data/media/movies/',
               '/mnt/user/data/media/anime series/',
               '/mnt/user/data/media/animated series',
               '/mnt/user/data/media/documentary series',
               '/mnt/user/data/media/series/']

# Get a list of all the image files in the assets directory
assets_files = [f for f in os.listdir(assets_path) if os.path.isfile(os.path.join(assets_path, f))]

# Get a list of all the folders in each media directory
media_folders = []
for media_path in media_paths:
    media_folders += [d for d in os.listdir(media_path) if os.path.isdir(os.path.join(media_path, d))]

# Find folders in media that do not have a matching pair in assets
no_match_folders = [folder for folder in media_folders if folder + ".jpg" not in assets_files]

# Save the output to the logs/output.txt file
output_file = os.path.join("logs", "output.txt")
os.makedirs(os.path.dirname(output_file), exist_ok=True)
with open(output_file, "w") as f:
    for media_path in media_paths:
        f.write(f"Checking {media_path}:\n")
        for folder in sorted(no_match_folders):
            if os.path.join(media_path, folder) in [os.path.join(media_path, d) for d in os.listdir(media_path)]:
                f.write(f"    {folder}\n")
    total_folders = sum([len(os.listdir(p)) for p in media_paths])
    percentage = 100 * len(no_match_folders) / total_folders
    f.write(f"\n{len(no_match_folders)} unmatched folders found: Percent complete: ({100 - percentage:.2f}% of total {total_folders}).\n")

# Print the names of the folders that do not have a matching pair
for media_path in media_paths:
    print(f"Checking {media_path}:")
    for folder in sorted(no_match_folders):
        if os.path.join(media_path, folder) in [os.path.join(media_path, d) for d in os.listdir(media_path)]:
            print(f"    {folder}")
print(f"\n{len(no_match_folders)} unmatched folders found: Percent complete: ({100 - percentage:.2f}% of total {total_folders}).\n")

