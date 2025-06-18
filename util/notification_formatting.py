import os
from typing import Any, Dict, List, Tuple

from util.notification import get_random_joke


def format_for_discord(
    config: Any, output: Any
) -> Tuple[Dict[int, List[Dict[str, Any]]], bool]:
    """Format notification output for Discord embeds and chunking.

    Args:
        config: Module config object (must have 'module_name').
        output: Output from the module to be formatted.

    Returns:
        Tuple of (embed field dict, success bool).
    """
    DISCORD_FIELD_CHAR_LIMIT = 1000
    DISCORD_EMBED_CHAR_LIMIT = 5000
    DISCORD_FIELD_COUNT_LIMIT = 25

    def chunk_code_fields(
        name: str, text: str, inline: bool = False
    ) -> List[Dict[str, Any]]:
        """Chunk a string into Discord embed fields by char limit.

        Args:
          name: Name of the field (used for the first chunk).
          text: The code/text to chunk.
          inline: Whether this field should be inline.

        Returns:
          List of Discord embed field dicts.
        """
        fields: List[Dict[str, Any]] = []
        lines = text.split("\n")
        buffer = ""
        first = True
        for line in lines:
            candidate = buffer + line + "\n"
            if len(candidate) > DISCORD_FIELD_CHAR_LIMIT:
                # Discord embed field value chunk limit reached.
                field = {
                    "name": name if first else "",
                    "value": f"```{buffer.rstrip()}```",
                }
                if inline:
                    field["inline"] = True
                fields.append(field)
                buffer = line + "\n"
                first = False
            else:
                buffer = candidate
        if buffer:
            field = {"name": name if first else "", "value": f"```{buffer.rstrip()}```"}
            if inline:
                field["inline"] = True
            fields.append(field)
        return fields

    def split_fields(fields: List[Dict[str, Any]]) -> Dict[int, List[Dict[str, Any]]]:
        """Split embed fields into multiple Discord embeds by char and field limits.

        Args:
          fields: List of Discord embed field dicts.

        Returns:
          Dict mapping embed index to list of fields for that embed.
        """
        expanded: List[Dict[str, Any]] = []
        for f in fields:
            name = f.get("name", "")
            inline = f.get("inline", False)
            val = f.get("value", "")
            if val == "":
                chunk = {"name": name, "value": ""}
                if inline:
                    chunk["inline"] = True
                expanded.append(chunk)
                continue
            # Unwrap code block if present
            content = (
                val[3:-3] if val.startswith("```") and val.endswith("```") else val
            )
            lines = content.split("\n")
            buffer = ""
            first = True
            for line in lines:
                candidate = buffer + line + "\n"
                if len(candidate) > DISCORD_FIELD_CHAR_LIMIT:
                    chunk = {
                        "name": name if first else "",
                        "value": f"```{buffer.strip()}```",
                    }
                    if inline:
                        chunk["inline"] = True
                    expanded.append(chunk)
                    buffer = line + "\n"
                    first = False
                else:
                    buffer = candidate
            if buffer:
                chunk = {
                    "name": name if first else "",
                    "value": f"```{buffer.strip()}```",
                }
                if inline:
                    chunk["inline"] = True
                expanded.append(chunk)
        # Batch fields into embeds, respecting Discord's limits.
        result: Dict[int, List[Dict[str, Any]]] = {}
        batch: List[Dict[str, Any]] = []
        size_acc = 0
        idx = 1
        limit = (
            DISCORD_EMBED_CHAR_LIMIT + 500
        )  # Discord embed character limit (buffered)
        for f in expanded:
            est = len(f.get("name", "")) + len(f.get("value", "")) + 30
            if len(batch) >= DISCORD_FIELD_COUNT_LIMIT or size_acc + est > limit:
                result[idx] = batch
                idx += 1
                batch = []
                size_acc = 0
            batch.append(f)
            size_acc += est
        if batch:
            result[idx] = batch
        return result

    def chunk_flat_content(
        header: str, content: str, footer: str = ""
    ) -> List[Dict[str, Any]]:
        """Chunk plain content into Discord message blocks under 1900 chars.

        Args:
          header: Header to prepend to the first chunk.
          content: The content to chunk.
          footer: Footer to append to the last chunk.

        Returns:
          List of Discord message dicts (with 'content' key).
        """
        CHUNK_LIMIT = 1900
        lines = content.split("\n")
        results = []
        buffer_lines: List[str] = []
        first_chunk = True

        def flush_chunk(buf_lines: List[str], is_last: bool) -> None:
            chunk_text = "\n".join(buf_lines)
            parts: List[str] = []
            if first_chunk and header:
                parts.append(header)
            parts.append(f"```{chunk_text}```")
            if is_last and footer:
                parts.append(footer)
            results.append({"content": "\n".join(parts)})

        for line in lines:
            buffer_lines.append(line)
            total_len = sum(len(l) for l in buffer_lines) + len(buffer_lines) - 1
            if total_len > CHUNK_LIMIT:
                overflow_line = buffer_lines.pop()
                flush_chunk(buffer_lines, is_last=False)
                first_chunk = False
                buffer_lines = [overflow_line]
        if buffer_lines:
            flush_chunk(buffer_lines, is_last=True)
        return results

    def fmt_poster_renamerr(o: Any) -> List[Dict[str, Any]]:
        """Format poster_renamerr output for Discord embeds.

        Args:
          o: Output data for poster_renamerr.

        Returns:
          List of Discord embed field dicts.
        """
        fields: List[Dict[str, Any]] = []
        for assets in o.values():
            for a in assets:
                title = a.get("title", "")
                year = f" ({a.get('year')})" if a.get("year") else ""
                msgs = sorted(a.get("discord_messages", []))
                text = "\n".join([f"{title}{year}"] + [f"\t{m}" for m in msgs])
                fields.extend(chunk_code_fields(f"{title}{year}", text))
        return fields

    def fmt_renameinatorr(o: Any) -> List[Dict[str, Any]]:
        """Format renameinatorr output for Discord embeds.

        Args:
          o: Output data for renameinatorr.

        Returns:
          List of Discord embed field dicts.
        """
        grouped: Dict[str, List[str]] = {}
        for inst in o.values():
            for item in inst.get("data", []):
                title = item.get("title", "Unknown")
                year = item.get("year")
                name = f"{title}{f' ({year})' if year else ''}"
                lst = grouped.setdefault(name, [])
                if np := item.get("new_path_name"):
                    lst.append(
                        f"Folder:\n{item.get('path_name','').lstrip('/')} -> {np.lstrip('/')}"
                    )
                for old, new in item.get("file_info", {}).items():
                    lst.append(old.lstrip("/"))
                    lst.append(new.lstrip("/"))
        fields: List[Dict[str, Any]] = []
        for name, lines in grouped.items():
            if not lines:
                continue
            text = "\n".join(lines)
            fields.append({"name": name, "value": f"```{text}```"})
        return fields

    def fmt_health_checkarr(o: Any) -> List[Dict[str, Any]]:
        """Format health_checkarr output for Discord embeds.

        Args:
          o: Output data for health_checkarr.

        Returns:
          List of Discord embed field dicts.
        """
        fields: List[Dict[str, Any]] = []
        grouped: Dict[str, List[str]] = {}
        for item in output:
            title = item.get("title", "Untitled")
            year = f" ({item.get('year')})" if item.get("year") else ""
            db_id = (
                item["tvdb_id"]
                if item["instance_type"] == "sonarr"
                else item.get("tmdb_id")
            )
            grouped.setdefault(item["instance_name"], []).append(
                f"{title}{year}\t{db_id}"
            )
        for instance, lines in grouped.items():
            text = "\n".join(lines)
            fields.extend(chunk_code_fields(instance, text))
        if fields:
            summary = (
                "🔍 The following items were flagged as removed from TMDB/TVDB and would be deleted."
                if output and output[0].get("dry_run")
                else "🧹 The following items were deleted as they were removed from TMDB/TVDB."
            )
            fields.insert(0, {"name": "Summary", "value": f"```{summary}```"})
        return fields

    def fmt_nohl(o: Any) -> List[Dict[str, Any]]:
        """Format nohl output for Discord embeds.

        Args:
          o: Output data for nohl.

        Returns:
          List of Discord embed field dicts.
        """
        fields: List[Dict[str, Any]] = []
        scanned = o.get("scanned", {})
        for path, results in scanned.items():
            title = f"Scanned: {os.path.basename(path).capitalize()}"
            lines: List[str] = []
            for item in results.get("movies", []):
                lines.append(f"{item['title']} ({item['year']})")
            for item in results.get("series", []):
                lines.append(f"{item['title']} ({item['year']})")
                for season in item.get("season_info", []):
                    lines.append(f"\tSeason: {season['season_number']}")
                    for episode in season.get("episodes", []):
                        lines.append(f"\t\tEpisode: {episode}")
            if lines:
                fields.extend(chunk_code_fields(title, "\n".join(lines)))
            else:
                fields.append(
                    {
                        "name": "✅ All Scanned files are hardlinked!",
                        "value": "",
                    }
                )
        resolved = o.get("resolved", {})
        for instance, data in resolved.items():
            srv = data.get("server_name", instance)
            inst_type = data.get("instance_type", "")
            title = f"Resolved: {srv}"
            sm = data.get("data", {}).get("search_media", [])
            if not sm:
                fields.append(
                    {
                        "name": f"✅ {srv} all resolve files are hardlinked!",
                        "value": "",
                    }
                )
                continue
            lines: List[str] = []
            for item in sm:
                if inst_type == "radarr":
                    lines.append(f"{item['title']} ({item['year']})")
                else:
                    lines.append(f"{item['title']} ({item['year']})")
                    for season in item.get("seasons", []):
                        lines.append(f"\tSeason {season['season_number']}")
                        if not season.get("season_pack", False):
                            for ep in season.get("episode_data", []):
                                lines.append(f"\t\tEpisode {ep['episode_number']}")
                lines.append("")
            if lines:
                fields.extend(chunk_code_fields(title, "\n".join(lines)))
        summary = o.get("summary", {})
        if not all(value == 0 for value in summary.values()):
            title = "Summary"
            lines = [
                f"Total Non-Hardlinked Scanned Movies: {summary.get('total_scanned_movies', 0)}",
                f"Total Non-Hardlinked Scanned Series: {summary.get('total_scanned_series', 0)}",
                f"Total Non-Hardlinked Resolved Movies: {summary.get('total_resolved_movies', 0)}",
                f"Total Non-Hardlinked Resolved Series: {summary.get('total_resolved_series', 0)}",
            ]
            fields.extend(chunk_code_fields(title, "\n".join(lines)))
        return fields

    def fmt_upgradinatorr(o: Any) -> List[Dict[str, Any]]:
        """Format upgradinatorr output for Discord embeds.

        Args:
          o: Output data for upgradinatorr.

        Returns:
          List of Discord embed field dicts.
        """
        fields: List[Dict[str, Any]] = []
        for inst, data in o.items():
            srv = data.get("server_name", inst)
            lines: List[str] = []
            for item in data.get("data", []):
                dl = item.get("download") or {}
                if dl:
                    title = item.get("title", "Unknown")
                    year = f" ({item.get('year')})" if item.get("year") else ""
                    lines.append(f"{title}{year}")
                    for t, score in dl.items():
                        lines.append(f"\t{t}")
                        lines.append(f"\tCF Score: {score}")
                    lines.append("")
            if lines:
                fields.extend(chunk_code_fields(srv, "\n".join(lines).strip()))
        return fields

    def fmt_labelarr(o: Any) -> List[Dict[str, Any]]:
        """Format labelarr output for Discord embeds.

        Args:
          o: Output data for labelarr.

        Returns:
          List of Discord embed field dicts.
        """
        fields: List[Dict[str, Any]] = []
        summary = f"Synced {len(o)} items across configured Plex libraries."
        fields.append({"name": "Summary", "value": f"```{summary}```"})
        label_changes: Dict[Tuple[str, str], List[str]] = {}
        for item in o:
            for label, action in item["add_remove"].items():
                key = (label, action)
                label_changes.setdefault(key, []).append(
                    f"{item['title']} ({item['year']})"
                )
        for (label, action), items in label_changes.items():
            verb = "added to" if action == "add" else "removed from"
            fields.append(
                {
                    "name": f"Label: `{label}` has been {verb}:",
                    "value": f"```{chr(10).join(items)}```",
                    "inline": False,
                }
            )
        return fields

    def fmt_jduparr(o: Any) -> List[Dict[str, Any]]:
        """Format jduparr output for Discord flat messages.

        Args:
          o: Output data for jduparr.

        Returns:
          List of Discord message dicts (with 'content' key).
        """
        results: List[Dict[str, Any]] = []
        for item in o:
            source_dir = item.get("source_dir", "Unknown")
            field_message = item.get("field_message", "")
            parsed_files = item.get("output", [])
            sub_count = item.get("sub_count", 0)
            dir = os.path.basename(source_dir).capitalize()
            header = f"_\nSource Directory: '__**{dir}**__'\n{field_message}"
            footer = f"\nPowered by: Drazzilb | {get_random_joke()}"
            lines = [f"\t{line}" for line in parsed_files]
            lines.append(f"\tTotal items re-linked in '{dir}': {sub_count}")
            content = "\n".join(lines)
            results.extend(chunk_flat_content(header, content, footer))
        return results

    registry: Dict[str, Dict[str, Any]] = {
        "poster_renamerr": {"formatter": fmt_poster_renamerr, "type": "embedded"},
        "renameinatorr": {"formatter": fmt_renameinatorr, "type": "embedded"},
        "health_checkarr": {"formatter": fmt_health_checkarr, "type": "embedded"},
        "nohl": {"formatter": fmt_nohl, "type": "embedded"},
        "upgradinatorr": {"formatter": fmt_upgradinatorr, "type": "embedded"},
        "labelarr": {"formatter": fmt_labelarr, "type": "embedded"},
        "jduparr": {"formatter": fmt_jduparr, "type": "flat"},
    }
    formatter_entry = registry.get(config.module_name)
    if not formatter_entry:
        return {}, True
    formatter = formatter_entry["formatter"]
    output_type = formatter_entry["type"]
    formatted_output = formatter(output)
    if output_type == "flat":
        return formatted_output, True
    return split_fields(formatted_output), True


def format_for_email(config: Any, output: Any) -> Tuple[str, bool]:
    """Format notification output for email (HTML).

    Args:
      config: Module config object (must have 'module_name').
      output: Output from the module to be formatted.

    Returns:
      Tuple of (HTML email body, success bool).
    """

    def fmt_labelarr(o: Any) -> str:
        """Format labelarr output for email.

        Args:
          o: Output data for labelarr.

        Returns:
          HTML string.
        """
        from collections import defaultdict

        summary_html = f"<div class='summary'><strong>Synced {len(o)} items across configured Plex libraries.</strong></div>"
        label_changes = defaultdict(list)
        for item in o:
            for label, action in item["add_remove"].items():
                key = (label, action)
                label_changes[key].append(f"{item['title']} ({item['year']})")
        blocks = []
        for (label, action), items in label_changes.items():
            verb = "added to" if action == "add" else "removed from"
            blocks.append(
                f"<div class='group'><h3>Label: {label} has been {verb}</h3><ul>"
            )
            for entry in items:
                blocks.append(f"<li>{entry}</li>")
            blocks.append("</ul></div>")
        return summary_html + "\n" + "\n".join(blocks)

    def wrap_email(title: str, body: str) -> str:
        """Wrap formatted output in an HTML email template.

        Args:
          title: Email subject/title.
          body: HTML content.

        Returns:
          HTML string.
        """
        return f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.5; color: #333; }}
                h2 {{ color: #2c3e50; }}
                h3 {{ margin-top: 1em; border-bottom: 1px solid #ccc; }}
                .instance {{ margin-bottom: 2em; padding: 1em; background: #f9f9f9; border-left: 5px solid #ccc; }}
                .media {{ margin-bottom: 1em; }}
                .title {{ font-weight: bold; font-size: 1.1em; margin-bottom: 0.3em; }}
                .files {{ margin-left: 1em; }}
                .files ul {{ list-style: disc; padding-left: 1.5em; }}
                .files li {{ margin-bottom: 0.25em; }}
                .label {{ font-weight: bold; }}
                .folder-rename {{ margin: 0.5em 0; color: #d35400; }}
                .summary {{ background: #ecf0f1; padding: 0.5em 1em; margin-top: 1em; border-left: 5px solid #27ae60; }}
                .no-change {{ color: #999; font-style: italic; margin-top: 0.5em; }}
                .all-linked {{ color: #27ae60; font-weight: bold; }}
                .group {{ margin-bottom: 2em; padding: 1em; background: #f9f9f9; border-left: 5px solid #ccc; }}
                .item {{ margin-bottom: 1em; }}
                .footer {{ margin-top: 2em; font-size: 0.9em; color: #999; }}
            </style>
        </head>
        <body>
            <h2>{title} Notification</h2>
            {body}
            <div class="footer">Powered by: Drazzilb | “{get_random_joke()}”</div>
        </body>
        </html>
        """.strip()

    def fmt_poster_renamerr(o: Any) -> str:
        """Format poster_renamerr output for email (HTML).

        Args:
          o: Output data for poster_renamerr.

        Returns:
          HTML string.
        """

        def render_group(title: str, assets: List[Dict[str, Any]]) -> str:
            if not assets:
                return ""
            block: List[str] = [f"<div class='group'><h3>{title}</h3>"]
            for asset in assets:
                name = asset.get("title", "")
                year = f" ({asset.get('year')})" if asset.get("year") else ""
                renamed = sorted(asset.get("messages", []))
                if not renamed:
                    continue
                block.append(
                    f"<div class='item'><div class='title'><strong>{name}{year}</strong></div>"
                )
                block.append("<div class='files'><ul>")
                for msg in renamed:
                    block.append(f"<li>{msg}</li>")
                block.append("</ul></div></div>")
            block.append("</div>")
            return "\n".join(block)

        return "\n".join(
            [
                render_group("Collections", o.get("collections", [])),
                render_group("Movies", o.get("movies", [])),
                render_group("Series", o.get("series", [])),
            ]
        )

    def fmt_renameinatorr(o: Any) -> str:
        """Format renameinatorr output for email (HTML).

        Args:
          o: Output data for renameinatorr.

        Returns:
          HTML string.
        """
        sections: List[str] = []
        for inst, inst_data in o.items():
            server_name = inst_data.get("server_name", inst).capitalize()
            title_header = f"{server_name} Rename List"
            section: List[str] = [
                f"<div class='instance'>",
                f"<h3>{title_header}</h3>",
            ]
            renamed_count = 0
            folder_renamed_count = 0
            for item in inst_data["data"]:
                title = item.get("title", "Unknown")
                year = f" ({item.get('year')})" if item.get("year") else ""
                file_info = item.get("file_info", {})
                folder_renamed = item.get("new_path_name")
                if not file_info and not folder_renamed:
                    continue
                section.append(f"<div class='media'>")
                section.append(
                    f"<div class='title'><strong>{title}{year}</strong></div>"
                )
                if folder_renamed:
                    section.append(
                        f"<div class='folder-rename'>📁 Folder Renamed:<br><span>{item['path_name']}</span> ➜ <span>{folder_renamed}</span></div>"
                    )
                    folder_renamed_count += 1
                if file_info:
                    section.append("<div class='files'><strong>🎬 Files:</strong><ul>")
                    for old, new in file_info.items():
                        section.append(
                            f"<li><span class='label'>Original:</span> {old}<br><span class='label'>New:</span> {new}</li>"
                        )
                        renamed_count += 1
                    section.append("</ul></div>")
                section.append("</div>")
            if renamed_count or folder_renamed_count:
                summary = [
                    f"<div class='summary'>",
                    f"<h4>{server_name} Rename Summary</h4>",
                    f"<p>Total Items: {len(inst_data['data'])}</p>",
                ]
                if renamed_count:
                    summary.append(f"<p>Total Renamed Items: {renamed_count}</p>")
                if folder_renamed_count:
                    summary.append(
                        f"<p>Total Folder Renames: {folder_renamed_count}</p>"
                    )
                summary.append("</div>")
                section.extend(summary)
            else:
                section.append(
                    f"<div class='no-change'>No items renamed in {server_name}.</div>"
                )
            section.append("</div>")
            sections.append("\n".join(section))
        return "".join(sections)

    def fmt_health_checkarr(o: Any) -> str:
        """Format health_checkarr output for email (HTML).

        Args:
          o: Output data for health_checkarr.

        Returns:
          HTML string.
        """
        grouped: Dict[str, List[str]] = {}
        for item in o:
            name = item.get("title", "Untitled")
            year = f" ({item.get('year')})" if item.get("year") else ""
            db_id = item.get("tvdb_id") or item.get("tmdb_id")
            key = item["instance_name"]
            grouped.setdefault(key, []).append(f"{name}{year} - {db_id}")
        sections: List[str] = []
        for instance, entries in grouped.items():
            block: List[str] = [
                f"<div class='instance'>",
                f"<h3>{instance}</h3>",
                "<ul>",
            ]
            for entry in entries:
                block.append(f"<li>{entry}</li>")
            block.append("</ul></div>")
            sections.append("\n".join(block))
        return "".join(sections)

    def fmt_upgradinatorr(o: Any) -> str:
        """Format upgradinatorr output for email (HTML).

        Args:
          o: Output data for upgradinatorr.

        Returns:
          HTML string.
        """
        sections: List[str] = []
        for inst, data in o.items():
            server_name = data.get("server_name", inst).capitalize()
            section: List[str] = [
                f"<div class='instance'>",
                f"<h3>{server_name}</h3>",
            ]
            for item in data.get("data", []):
                title = item.get("title", "Unknown")
                year = f" ({item.get('year')})" if item.get("year") else ""
                downloads = item.get("download", {})
                if not downloads:
                    continue
                section.append(f"<div class='media'>")
                section.append(
                    f"<div class='title'><strong>{title}{year}</strong></div>"
                )
                section.append("<div class='files'><ul>")
                for quality, score in downloads.items():
                    section.append(
                        f"<li><span class='label'>{quality}:</span> CF Score: {score}</li>"
                    )
                section.append("</ul></div>")
                section.append("</div>")
            section.append("</div>")
            sections.append("\n".join(section))
        return "".join(sections)

    def fmt_nohl(o: Any) -> str:
        """Format nohl output for email (HTML).

        Args:
          o: Output data for nohl.

        Returns:
          HTML string.
        """

        sections: List[str] = []
        for inst_name, inst_data in o.items():
            server_name = inst_data.get("server_name", inst_name).capitalize()
            section: List[str] = [f"<div class='instance'><h3>{server_name}</h3>"]
            search_media = inst_data.get("data", {}).get("search_media", [])
            filtered_media = inst_data.get("data", {}).get("filtered_media", [])
            if not search_media:
                section.append(
                    "<div class='all-linked'>✅ All files are already hardlinked.</div>"
                )
            else:
                section.append(
                    "<div class='media'><div class='title'><strong>❌ Non-hardlinked Files:</strong></div><ul>"
                )
                for item in search_media:
                    title = item.get("title", "Unknown")
                    year = f" ({item.get('year')})" if item.get("year") else ""
                    section.append(f"<li>{title}{year}")
                    seasons = item.get("seasons", [])
                    if seasons:
                        section.append("<ul>")
                        for season in seasons:
                            section.append(f"<li>Season {season.get('season_number')}")
                            episodes = season.get("episode_data", [])
                            if episodes:
                                section.append("<ul>")
                                for ep in episodes:
                                    section.append(
                                        f"<li>Episode {ep.get('episode_number')}</li>"
                                    )
                                section.append("</ul>")
                            section.append("</li>")
                        section.append("</ul>")
                    section.append("</li>")
                section.append("</ul></div>")
            if filtered_media:
                section.append(
                    "<div class='media'><div class='title'><strong>🎛️ Filtered Media:</strong></div><ul>"
                )
                for item in filtered_media:
                    title = item.get("title", "Unknown")
                    year = f" ({item.get('year')})" if item.get("year") else ""
                    section.append(f"<li>{title}{year}<ul>")
                    if not item.get("monitored"):
                        section.append("<li>⏭️ Skipped (not monitored)</li>")
                    elif item.get("exclude_media"):
                        section.append("<li>⛔ Skipped (excluded)</li>")
                    elif item.get("quality_profile"):
                        section.append(
                            f"<li>📉 Skipped (quality: {item['quality_profile']})</li>"
                        )
                    section.append("</ul></li>")
                section.append("</ul></div>")
            section.append("</div>")
            sections.append("\n".join(section))
        return "".join(sections)

    def fmt_unmatched_assets(output: dict) -> str:
        """
        Format unmatched_assets output for email (HTML).
        Args:
            output: Output data for unmatched_assets.
        Returns:
            HTML string.
        """
        sections = []
        o = output.get("unmatched_dict", {})
        asset_types = ["movies", "series", "collections"]
        for asset_type in asset_types:
            data_set = o.get(asset_type, [])
            if data_set:
                block = [
                    f"<div class='group'>",
                    f"<h3>Unmatched {asset_type.title()}</h3>",
                    "<ul>",
                ]
                for item in data_set:
                    title = item.get("title", "Unknown")
                    year = f" ({item['year']})" if item.get("year") else ""
                    if asset_type == "series":
                        missing_seasons = item.get("missing_seasons", [])
                        missing_main = item.get("missing_main_poster", False)
                        if missing_seasons and missing_main:
                            block.append(f"<li><strong>{title}{year}</strong><ul>")
                            for season in missing_seasons:
                                block.append(
                                    f"<li>Season: {season} <span style='color:#e74c3c;'>&larr; Missing</span></li>"
                                )
                            block.append("</ul></li>")
                        elif missing_seasons:
                            block.append(f"<li><strong>{title}{year}</strong><ul>")
                            for season in missing_seasons:
                                block.append(f"<li>Season: {season}</li>")
                            block.append("</ul></li>")
                        elif missing_main:
                            block.append(
                                f"<li><strong>{title}{year}</strong> <span style='color:#e74c3c;'>&larr; Main series poster missing</span></li>"
                            )
                        else:
                            block.append(f"<li><strong>{title}{year}</strong></li>")
                    else:
                        block.append(f"<li>{title}{year}</li>")
                block.append("</ul></div>")
                sections.append("".join(block))
        # Summary block for unmatched_assets
        summary_data = output.get("summary")
        if summary_data:
            summary_block = [
                "<div class='summary'>",
                "<h4>Statistics</h4>",
                "<table>",
            ]
            for row in summary_data:
                if len(row) == 1:
                    summary_block.append(f"<tr><th colspan='4'>{row[0]}</th></tr>")
                elif len(row) == 4:
                    summary_block.append(
                        f"<tr><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td></tr>"
                    )
                else:
                    summary_block.append(
                        "<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>"
                    )
            summary_block.append("</table></div>")
            sections.append("".join(summary_block))
        return "".join(sections)

    def fmt_jduparr(output: Any) -> str:
        """Format jduparr output for email (HTML).

        Args:
          output: Output data for jduparr.

        Returns:
          HTML string.
        """
        total_count = 0
        blocks: List[str] = []
        for item in output:
            path = item.get("source_dir", "Unknown Path")
            field_message = item.get("field_message", "")
            parsed_files = item.get("output", [])
            sub_count = item.get("sub_count", 0)
            total_count += sub_count
            block: List[str] = [f"<div class='group'><h3>{os.path.basename(path)}</h3>"]
            block.append(f"<div class='summary'>{field_message}</div>")
            if parsed_files:
                block.append("<div class='files'><ul>")
                for fname in parsed_files:
                    block.append(f"<li>{fname}</li>")
                block.append("</ul></div>")
            block.append(
                f"<div class='summary'><strong>Total items for '{os.path.basename(path)}': {sub_count}</strong></div>"
            )
            block.append("</div>")
            blocks.append("".join(block))
        blocks.append(
            f"<div class='summary'><strong>Total items relinked: {total_count}</strong></div>"
        )
        return "\n".join(blocks)

    registry: Dict[str, Any] = {
        "poster_renamerr": fmt_poster_renamerr,
        "renameinatorr": fmt_renameinatorr,
        "health_checkarr": fmt_health_checkarr,
        "nohl": fmt_nohl,
        "upgradinatorr": fmt_upgradinatorr,
        "unmatched_assets": fmt_unmatched_assets,
        "labelarr": fmt_labelarr,
        "jduparr": fmt_jduparr,
    }
    formatter = registry.get(config.module_name)
    if not formatter:
        return "", False
    inner = formatter(output)
    return wrap_email(config.module_name.replace("_", " ").title(), inner), True
