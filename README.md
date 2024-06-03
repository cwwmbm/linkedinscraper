# UPDATE November 2023
I've implemented a website version of this that doesn't require any script launches. https://jobbix.co


# UPDATE August 2023.

New version includes OpenAI integration for cover letter generation. See below for how to configure config.json file.

## LinkedIn Job Scraper

This is a Python application that scrapes job postings from LinkedIn and stores them in a SQLite database. The application also provides a web interface to view the job postings and mark them as applied, rejected,interview, and hidden.
![Screenshot image](./screenshot/screenshot1.png)

### Problem

If you spent any amount of time looking for jobs on LinkedIn you know how frustrating it is. The same job postings keep showing up in your search results, and you have to scroll through pages and pages of irrelevant job postings to find the ones that are relevant to you, only to see the ones you applied for weeks ago. This application aims to solve this problem by scraping job postings from LinkedIn and storing them in a SQLite database. You can filter out job postings based on keywords in Title and Description (tired of seeing Clinical QA Manager when you search for software QA jobs? Just filter out jobs that have "clinical" in the title). The jobs are sorted by date posted, not by what LinkedIn thinks is relevant to you. No sponsored job posts. No duplicate job posts. No irrelevant job posts. Just the jobs you want to see.

### IMPORTANT NOTE

If you are using this application, please be aware that LinkedIn does not allow scraping of its website. Use this application at your own risk. It's recommended to use proxy servers to avoid getting blocked by LinkedIn (more on proxy servers below).

### Prerequisites

- Python 3.6 or higher
- Flask
- Requests
- BeautifulSoup
- Pandas
- SQLite3
- Pysocks

### Installation

1. Clone the repository to your local machine.
2. Install the required packages using pip: `pip install -r requirements.txt`
3. Create a `config.json` file in the root directory of the project. See the `config.json` section below for details on the configuration options. Config_example.json is provided as an example, feel free to use it as a template.
4. Run the scraper using the command `python main.py`. Note: run this first first to populate the database with job postings prior to running app.py.
4. Run the application using the command `python app.py`.
5. Open a web browser and navigate to `http://127.0.0.1:5000` to view the job postings.

### Usage

The application consists of two main components: the scraper and the web interface.

#### Scraper

The scraper is implemented in `main.py`. It scrapes job postings from LinkedIn based on the search queries and filters specified in the `config.json` file. The scraper removes duplicate and irrelevant job postings based on the specified keywords and stores the remaining job postings in a SQLite database.

To run the scraper, execute the following command:

```
python main.py
```

#### Web Interface

The web interface is implemented using Flask in `app.py`. It provides a simple interface to view the job postings stored in the SQLite database. Users can mark job postings as applied, rejected, interview, or hidden, and the changes will be saved in the database.

When the job is marked as "applied" it will be highlighted in light blue so that it's obvious at a glance which jobs are applied to. "Rejecetd" will mark the job in red, whereas "Interview" will mark the job in green. Upon clicking "Hide" the job will dissappear from the list. There's currently no functionality to reverse these actions (i.e. unhine, un-apply, etc). To reverse it you'd have to go to the database and change values in applied, hidden, interview, or rejected columns.

To run the web interface, execute the following command:

```
python app.py
```

Then, open a web browser and navigate to `http://127.0.0.1:5000` to view the job postings.

### Configuration

The `config.json` file contains the configuration options for the scraper and the web interface. Below is a description of each option:

- `proxies`: The proxy settings for the requests library. Set the `http` and `https` keys with the appropriate proxy URLs.
- `headers`: The headers to be sent with the requests. Set the `User-Agent` key with a valid user agent string. If you don't know your user agen, google "my user agent" and it will show it.
- `OpenAI_API_KEY`: Your OpenAI API key. You can get it from your OpenAI dashboard.
- `OpenAI_Model`: The name of the OpenAI model to use for cover letter generation. GPT-4 family of models produces best results, but also the most expensive one.
- `resume_path`: Local path to your resume in PDF format (only PDF is supported at this time). For best results it's advised that your PDF resume is formatted in a way that's easy for the AI to parse. Use a single column format, avoid images. You may get unpredictable results if it's in a two-column format.
- `search_queries`: An array of search query objects, each containing the following keys:
  - `keywords`: The keywords to search for in the job title.
  - `location`: The location to search for jobs.
  - `f_WT`: The job type filter. Values are as follows:
        -  0 - onsite
        -  1 - hybrid
        -  2 - remote
        -  empty (no value) - any one of the above.
- `desc_words`: An array of keywords to filter out job postings based on their description.
- `title_include`: An array of keywords to filter job postings based on their title. Keep *only* jobs that have at least one of the words from 'title_words' in its title. Leave empty if you don't want to filter by title.
- `title_exclude`: An array of keywords to filter job postings based on their title. Discard jobs that have ANY of the word from 'title_words' in its title. Leave empty if you don't want to filter by title.
- `company_exclude`: An array of keywords to filter job postings based on the company name. Discard jobs come from a certain company because life is too short to work for assholes.
- `languages`: Script will auto-detect the language from the description. If the language is not in this list, the job will be discarded. Leave empty if you don't want to filter by language. Use "en" for English, "de" for German, "fr" for French, "es" for Spanish, etc. See documentation for langdetect for more details.
- `timespan`: The time range for the job postings. "r604800" for the past week, "r84600" for the last 24 hours. Basically "r" plus 60 * 60 * 24 * <number of days>.
- `jobs_tablename`: The name of the table in the SQLite database where the job postings will be stored.
- `filtered_jobs_tablename`: The name of the table in the SQLite database where the filtered job postings will be stored.
- `db_path`: The path to the SQLite database file.
- `pages_to_scrape`: The number of pages to scrape for each search query.
- `rounds`: The number of times to run the scraper. LinkedIn doesn't always show the same results for the same search query, so running the scraper multiple times will increase the number of job postings scraped. I set up a cron job that runs every hour during the day.
- `days_toscrape`: The number of days to scrape. The scraper will ignore job postings older than this number of days.

### What remains to be done

- [ ] Add functionality to unhide and un-apply jobs.
- [ ] Add functionality to sort jobs by date added to the databse. Current sorting is by date posted on LinkedIn. Some jobs (~1-5%) are not being picked up by the search (and as such this scraper) until days after they are posted. This is a known issue with LinkedIn and there's nothing I can do about it, however sorting jobs by dated added to the database will make it easier to find those jobs.
- [ ] Add front end functionality to configure search, and execute that search from UI. Currently configuration is done in json file and search is executed from command line.


### Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

### License

This project is licensed under the MIT License.X
Write README.md file for this project. Make it detailed as possible.
X
