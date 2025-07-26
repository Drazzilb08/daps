def init_db_schema(conn):
    with conn:
        # Plex media cache
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS plex_media_cache (
                plex_id TEXT,
                instance_name TEXT,
                asset_type TEXT,
                library_name TEXT,
                title TEXT,
                normalized_title TEXT,
                folder TEXT,
                year TEXT,
                guids TEXT,
                labels TEXT,
                last_indexed TEXT,
                PRIMARY KEY (plex_id, instance_name)
            );
            """
        )
        # ARR Database
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS media_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_type TEXT,
                title TEXT,
                normalized_title TEXT,
                year TEXT,
                tmdb_id INTEGER,
                tvdb_id INTEGER,
                imdb_id TEXT,
                folder TEXT,
                tags TEXT,
                season_number INTEGER,
                matched BOOL,
                last_indexed TEXT,
                instance_name TEXT,
                source TEXT,
                original_file TEXT,
                renamed_file TEXT,
                file_hash TEXT,
                UNIQUE(asset_type, title, year, tmdb_id, tvdb_id, imdb_id, season_number, instance_name)
            );
            """
        )
        # Collection table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS collections_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_type TEXT,
                title TEXT,
                normalized_title TEXT,
                alternate_titles TEXT,
                normalized_alternate_titles TEXT,
                year INTEGER,
                tmdb_id INTEGER,
                tvdb_id INTEGER,
                imdb_id TEXT,
                folder TEXT,
                library_name TEXT,
                instance_name TEXT,
                last_indexed TEXT,
                matched INTEGER DEFAULT 0,
                original_file TEXT,
                renamed_file TEXT,
                UNIQUE (title, library_name, instance_name)
            )
            """
        )
        # Poster source stats (for frontend stats and analytics)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS poster_source_stats (
                source_folder TEXT PRIMARY KEY,
                poster_count INTEGER,
                last_updated TEXT
            );
            """
        )
        # Orphaned posters table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS orphaned_posters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_type TEXT,
                title TEXT,
                year TEXT,
                season INTEGER,
                file_path TEXT UNIQUE,
                date_orphaned TEXT
            );
            """
        )
        # Poster cache table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS poster_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                normalized_title TEXT,
                year INTEGER,
                tmdb_id INTEGER,
                tvdb_id INTEGER,
                imdb_id TEXT,
                season_number INTEGER,
                folder TEXT,
                file TEXT,
                UNIQUE(title, year, tmdb_id, tvdb_id, imdb_id, season_number, file)
            );
            """
        )
        # normalized_title index on poster_cache
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS poster_cache_normalized_title_idx
                ON poster_cache (normalized_title)
            ;
            """
        )
        # tmdb_id index on poster_cache
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS poster_cache_tmdb_id_idx
                ON poster_cache (tmdb_id)
            ;
            """
        )
        # tvdb_id index on poster_cache
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS poster_cache_tvdb_id_idx
                ON poster_cache (tvdb_id)
            ;
            """
        )
        # imdb_id index on poster_cache
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS poster_cache_imdb_id_idx
                ON poster_cache (imdb_id)
            ;
            """
        )
        # Holiday status table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS holiday_status (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                last_active_holiday TEXT
            );
            """
        )
        # initiate run state
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS run_state (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                module_name TEXT NOT NULL UNIQUE,
                last_run TEXT,
                last_run_successful INTEGER DEFAULT 0,
                last_run_status TEXT,
                last_run_message TEXT,
                last_duration INTEGER,
                last_run_by TEXT
            );
            """
        )
        # Webhook Jobs
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                received_at TEXT,
                payload TEXT,
                status TEXT DEFAULT 'pending',
                result TEXT,
                error TEXT,
                attempts INTEGER DEFAULT 0,
                max_attempts INTEGER DEFAULT 3,
                scheduled_at TEXT DEFAULT NULL
            );
            """
        )
