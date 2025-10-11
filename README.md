# LinkedIn Job Scraper - Modern Edition

A comprehensive LinkedIn job scraping application with a modern Svelte frontend, OpenRouter AI integration, and advanced job analysis capabilities.

![Screenshot image](./screenshot/screenshot1.png)

## 🚀 New Features (2024 Update)

- **Modern Svelte Frontend**: Complete rewrite with a responsive, modern UI
- **OpenRouter Integration**: Switched from OpenAI to OpenRouter for more flexibility and cost-effectiveness
- **Advanced Job Analysis**: AI-powered analysis of job descriptions with customizable questions
- **Enhanced Database Schema**: Added metadata field for storing analysis results
- **Real-time Updates**: Dynamic UI updates without page refreshes
- **Improved User Experience**: Better navigation, loading states, and error handling

## 📋 Problem Statement

LinkedIn job searching can be frustrating:
- Same job postings appear repeatedly
- Irrelevant sponsored content clutters results
- No easy way to track application status
- Difficult to analyze job requirements systematically

This application solves these problems by:
- Scraping and deduplicating job postings
- Providing advanced filtering capabilities
- Offering AI-powered job analysis
- Tracking application status with a modern interface

## ⚠️ Important Notice

LinkedIn does not permit scraping of its website. Use this application at your own risk. Consider using proxy servers to avoid being blocked.

## 🛠 Prerequisites

### Backend
- Python 3.8 or higher
- All packages listed in `requirements.txt`

### Frontend
- Node.js 18 or higher
- npm or yarn

## 📦 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd linkedinscraper
```

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Copy and configure the config file
cp config_example.json config.json
# Edit config.json with your settings (see Configuration section)
```

### 3. Frontend Setup
```bash
# Navigate to the Svelte app
cd svelte-app

# Install dependencies
npm install
```

## 🚀 Usage

### Development Mode

1. **Start the Flask Backend**:
```bash
python app.py
```
The backend will be available at `http://localhost:5001`

2. **Start the Svelte Frontend** (in a new terminal):
```bash
cd svelte-app
npm run dev
```
The frontend will be available at `http://localhost:5173`

3. **Run the Scraper** (optional, to populate with jobs):
```bash
python main.py
```

### Production Mode

1. **Build the Svelte App**:
```bash
cd svelte-app
npm run build
```

2. **Start the Flask Backend**:
```bash
python app.py
```

## 🔧 Configuration

The `config.json` file contains all configuration options:

### Core Settings
- `db_path`: Path to SQLite database file
- `resume_path`: Path to your resume PDF file

### OpenRouter Integration
- `OpenRouter_API_KEY`: Your OpenRouter API key
- `OpenRouter_Model`: Model to use (e.g., "openai/gpt-3.5-turbo")

### Job Analysis Questions
- `analysis_questions`: Array of questions for AI analysis of job descriptions

Example:
```json
{
  "analysis_questions": [
    "What are the key responsibilities and main duties for this role?",
    "What technical skills and qualifications are required?",
    "What is the experience level required (junior, mid-level, senior)?",
    "What technologies, frameworks, or tools are mentioned?",
    "What soft skills or personal qualities are emphasized?",
    "What does the company culture appear to be like based on the description?"
  ]
}
```

### Search Configuration
- `search_queries`: Array of search configurations
  - `keywords`: Job title keywords (required)
  - `location`: Job location (required)
  - `f_WT`: Work type (0=onsite, 1=hybrid, 2=remote, ""=any)
  - `f_JT`: Job type filter (C=contract, F=full-time, P=part-time, etc.)
  - **Dynamic Parameters**: Any additional LinkedIn search parameters can be added and will be automatically included in the search URL

**Example with custom parameters:**
```json
{
  "keywords": "software architect",
  "location": "Norway",
  "f_WT": "2",
  "f_JT": "C",
  "f_E": "3,4",
  "f_C": "Information Technology"
}
```

**Note**: All parameters except `keywords` and `location` are dynamically included in search URLs. The global `timespan` setting is automatically applied as `f_TPR`.

### Filtering Options
- `desc_words`: Keywords to filter out from descriptions
- `title_include`: Only include jobs with these title keywords
- `title_exclude`: Exclude jobs with these title keywords
- `company_exclude`: Exclude jobs from specific companies
- `languages`: Accepted job description languages (e.g., ["en", "de"])

### Scraping Settings
- `timespan`: Time range for jobs (e.g., "r604800" for past week)
- `pages_to_scrape`: Number of pages to scrape per query
- `rounds`: Number of scraping rounds
- `days_to_scrape`: Maximum job age in days

### Network Settings
- `proxies`: Proxy configuration for requests
- `headers`: HTTP headers (including User-Agent)

## 🎨 Frontend Features

### Job List View
- Grid layout of job cards
- Status indicators (Applied, Interview, Rejected, Analyzed)
- Real-time filtering and search
- Responsive design

### Job Detail View
- Full job description display
- AI analysis results
- Action buttons for status updates
- Resume and cover letter generation
- Analysis trigger functionality

### Key Components
- `JobList.svelte`: Displays job listings
- `JobDetail.svelte`: Shows individual job details
- Modern responsive design with LinkedIn-inspired styling

## 🤖 AI Features

### Job Analysis
- Customizable analysis questions in config
- AI-powered analysis of job descriptions
- Results stored in database metadata field
- Real-time analysis trigger from UI

### Content Generation
- AI-tailored resume generation
- Custom cover letter creation
- Based on job requirements and your resume

## 🛠 API Endpoints

### Job Management
- `GET /get_all_jobs`: Fetch all jobs
- `GET /job_details/<id>`: Get specific job details
- `POST /mark_applied/<id>`: Mark job as applied
- `POST /mark_interview/<id>`: Mark job for interview
- `POST /mark_rejected/<id>`: Mark job as rejected
- `POST /hide_job/<id>`: Hide job from list

### AI Features
- `POST /analyze_job/<id>`: Analyze job with AI
- `POST /get_resume/<id>`: Generate tailored resume
- `POST /get_CoverLetter/<id>`: Generate cover letter

## 📁 Project Structure

```
linkedinscraper/
├── app.py                 # Flask backend
├── main.py               # Job scraper
├── config.json           # Configuration
├── requirements.txt      # Python dependencies
├── plan.md              # Development plan
├── svelte-app/          # Frontend application
│   ├── src/
│   │   ├── routes/
│   │   │   └── +page.svelte
│   │   └── lib/
│   │       └── components/
│   │           ├── JobList.svelte
│   │           └── JobDetail.svelte
│   ├── package.json
│   └── vite.config.js
├── data/                # SQLite database location
├── templates/           # Legacy HTML templates
└── static/             # Legacy static files
```

## 🔄 Database Schema

The jobs table includes:
- Standard job fields (title, company, location, description, etc.)
- Status fields (applied, interview, rejected, hidden)
- AI-generated content (resume, cover_letter)
- **New**: `metadata` field for analysis results (JSON)

## 🚧 Recent Changes

### Backend Improvements
- Migrated from OpenAI to OpenRouter API
- Added job analysis endpoint
- Enhanced database schema with metadata field
- Improved error handling and logging

### Frontend Overhaul
- Complete rewrite in Svelte/SvelteKit
- Modern responsive design
- Real-time updates without page refresh
- Enhanced user experience with loading states
- Proxy configuration for development

### Configuration Updates
- Updated config structure for OpenRouter
- Added analysis questions configuration
- Maintained backward compatibility where possible

## 🔮 Future Enhancements

- [ ] Bulk job analysis functionality
- [ ] Advanced filtering and sorting options
- [ ] Export functionality for job data and analysis
- [ ] Dashboard with analytics and insights
- [ ] Mobile app version
- [ ] Integration with job boards beyond LinkedIn
- [ ] Advanced AI features (salary prediction, fit scoring)

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss your ideas.

### Development Setup
1. Follow installation instructions
2. Make changes in appropriate branch
3. Test both frontend and backend
4. Submit pull request with clear description

## 📄 License

This project is licensed under the MIT License.

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure Flask CORS is properly configured
2. **API Connection Issues**: Check OpenRouter API key and model settings
3. **Database Errors**: Verify database permissions and schema
4. **Node.js Issues**: Ensure Node.js 18+ is installed

### Getting Help

- Check the [plan.md](plan.md) file for implementation details
- Review configuration examples in `config_example.json`
- Ensure all dependencies are installed correctly

---

**Note**: This application is for educational and personal use only. Always respect LinkedIn's terms of service and use responsibly.
