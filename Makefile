
# Define the database path from the config
DB_PATH = /Users/esquire/code/linkedinscraper/data/linkedinscraper.db

.PHONY: create_db reset_db

# Command to create the database directory if it doesn't exist
create_db_dir:
	@mkdir -p $(dir $(DB_PATH))

# Command to create the database
create_db: create_db_dir
	@echo "Creating database..."
	@sqlite3 $(DB_PATH) "CREATE TABLE IF NOT EXISTS jobs ( \
		id INTEGER PRIMARY KEY AUTOINCREMENT, \
		title TEXT NOT NULL, \
		company TEXT NOT NULL, \
		location TEXT NOT NULL, \
		description TEXT, \
		posted_date TEXT, \
		date TEXT, \
		job_url TEXT NOT NULL, \
		job_description TEXT, \
		date_loaded TEXT, \
		hidden INTEGER DEFAULT 0, \
		applied INTEGER DEFAULT 0, \
		interview INTEGER DEFAULT 0, \
		rejected INTEGER DEFAULT 0, \
		cover_letter TEXT, \
		resume TEXT, \
		confidence_score INTEGER DEFAULT 0, \
		analysis TEXT \
	);"
	@echo "Database created successfully."

# Command to reset the database
reset_db: create_db_dir
	@echo "Resetting database..."
	@rm -f $(DB_PATH)
	@$(MAKE) create_db
	@echo "Database reset successfully."

# Command to start proxy server
start_proxy:
	mitmproxy --mode regular --listen-port 8080

# Create command to create resume
