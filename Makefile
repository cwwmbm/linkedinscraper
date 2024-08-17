
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

# Command to clone the database with a timestamp
clone_db:
	@echo "Cloning database..."
	@cp $(DB_PATH) $(dir $(DB_PATH))db_`date +%Y%m%d_%H%M%S`_clone.sqlite
	@echo "Database cloned successfully as db_`date +%Y%m%d_%H%M%S`_clone.sqlite"

# Command to run the script without the scheduler
run_bot:
	@echo "Running script without schedule..."
	@python3 main.py

# Command to run the script with the scheduler
run_scheduled_bot:
	@echo "Running script with schedule..."
	@python3 main.py schedule.json

# Command to clean out log folder
clean_logs:
	@echo "Cleaning logs..."
	@rm -rf logs/*
	@echo "Logs cleaned successfully."

# Create command to create resume
