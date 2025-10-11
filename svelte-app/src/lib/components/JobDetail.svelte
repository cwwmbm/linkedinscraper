<script>
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { marked } from 'marked';

	export let job;

	const dispatch = createEventDispatcher();

	let isAnalyzing = false;
	let analysisError = null;
	let isGeneratingResume = false;
	let isGeneratingCoverLetter = false;
	let showResume = false;
	let showCoverLetter = false;
	let showAnalysis = false;
	let config = null;
	let contentSectionsElement;

	// Scroll to top when job changes
	$: if (job && contentSectionsElement) {
		contentSectionsElement.scrollTop = 0;
	}

	// Fetch config to know question types
	async function fetchConfig() {
		try {
			const response = await fetch('/api/config');
			if (response.ok) {
				config = await response.json();
			}
		} catch (error) {
			console.error('Error fetching config:', error);
		}
	}

	onMount(() => {
		fetchConfig();
	});


	async function analyzeJob() {
		if (isAnalyzing) return;
		
		isAnalyzing = true;
		analysisError = null;
		
		try {
			const response = await fetch(`/api/analyze_job/${job.id}`, {
				method: 'POST'
			});
			
			if (!response.ok) {
				throw new Error(`Failed to analyze job: ${response.status}`);
			}
			
			const result = await response.json();
			
			// Update the job object with the analysis results
			job.metadata = JSON.stringify(result.analysis);
			
			// Update the parent component with the analyzed job
			dispatch('jobUpdated', {
				id: job.id,
				updatedFields: { metadata: job.metadata },
				fullJob: job
			});
			
			alert('Job analysis completed successfully!');
		} catch (error) {
			analysisError = error.message;
			console.error('Error analyzing job:', error);
		} finally {
			isAnalyzing = false;
		}
	}

	async function generateResume() {
		if (isGeneratingResume) return;
		
		isGeneratingResume = true;
		
		try {
			const response = await fetch(`/api/get_resume/${job.id}`, {
				method: 'POST'
			});
			
			if (!response.ok) {
				throw new Error(`Failed to generate resume: ${response.status}`);
			}
			
			const result = await response.json();
			job.resume = result.resume;
			
			dispatch('jobUpdated', {
				id: job.id,
				updatedFields: { resume: job.resume },
				fullJob: job
			});
			alert('Resume generated successfully!');
		} catch (error) {
			alert(`Error generating resume: ${error.message}`);
		} finally {
			isGeneratingResume = false;
		}
	}

	async function generateCoverLetter() {
		if (isGeneratingCoverLetter) return;
		
		isGeneratingCoverLetter = true;
		
		try {
			const response = await fetch(`/api/get_CoverLetter/${job.id}`, {
				method: 'POST'
			});
			
			if (!response.ok) {
				throw new Error(`Failed to generate cover letter: ${response.status}`);
			}
			
			const result = await response.json();
			job.cover_letter = result.cover_letter;
			
			dispatch('jobUpdated', {
				id: job.id,
				updatedFields: { cover_letter: job.cover_letter },
				fullJob: job
			});
			alert('Cover letter generated successfully!');
		} catch (error) {
			alert(`Error generating cover letter: ${error.message}`);
		} finally {
			isGeneratingCoverLetter = false;
		}
	}

	async function markAsApplied() {
		try {
			const response = await fetch(`/api/mark_applied/${job.id}`, {
				method: 'POST'
			});
			
			if (response.ok) {
				job.applied = 1;
				dispatch('jobUpdated', {
					id: job.id,
					updatedFields: { applied: job.applied },
					fullJob: job
				});
			}
		} catch (error) {
			alert(`Error marking as applied: ${error.message}`);
		}
	}

	async function markAsInterview() {
		try {
			const response = await fetch(`/api/mark_interview/${job.id}`, {
				method: 'POST'
			});
			
			if (response.ok) {
				job.interview = 1;
				dispatch('jobUpdated', {
					id: job.id,
					updatedFields: { interview: job.interview },
					fullJob: job
				});
			}
		} catch (error) {
			alert(`Error marking as interview: ${error.message}`);
		}
	}

	async function markAsRejected() {
		try {
			const response = await fetch(`/api/mark_rejected/${job.id}`, {
				method: 'POST'
			});
			
			if (response.ok) {
				job.rejected = 1;
				dispatch('jobUpdated', {
					id: job.id,
					updatedFields: { rejected: job.rejected },
					fullJob: job
				});
			}
		} catch (error) {
			alert(`Error marking as rejected: ${error.message}`);
		}
	}

	async function toggleJobVisibility() {
		const isHidden = job.hidden;
		const action = isHidden ? 'unhide' : 'hide';
		const endpoint = isHidden ? 'unhide_job' : 'hide_job';
		
		try {
			const response = await fetch(`/api/${endpoint}/${job.id}`, {
				method: 'POST'
			});
			
			if (response.ok) {
				job.hidden = isHidden ? 0 : 1;
				dispatch('jobUpdated', {
					id: job.id,
					updatedFields: { hidden: job.hidden },
					fullJob: job
				});
			}
		} catch (error) {
			alert(`Error ${action}ing job: ${error.message}`);
		}
	}

	function handleKeydown(event) {
		if (event.key === '`' && !event.ctrlKey && !event.altKey && !event.metaKey) {
			event.preventDefault();
			toggleJobVisibility();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
	});

	function formatDate(dateString) {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString();
	}

	function parseMetadata(metadataString) {
		try {
			return JSON.parse(metadataString);
		} catch {
			return null;
		}
	}

	$: metadata = job.metadata ? parseMetadata(job.metadata) : null;

	// Separate boolean and text questions based on config
	function categorizeQuestions(metadata) {
		if (!metadata) {
			return { booleanQuestions: [], textQuestions: [] };
		}

		const booleanQuestions = [];
		const textQuestions = [];

		Object.entries(metadata).forEach(([key, answer]) => {
			let questionConfig = null;
			let displayTitle = key;

			// If we have config, try to find the question config
			if (config && config.analysis_questions) {
				// First try to match by title (new format)
				questionConfig = config.analysis_questions.find(q => q.title === key);
				
				// If not found, try to match by question text (old format)
				if (!questionConfig) {
					questionConfig = config.analysis_questions.find(q => q.question === key);
					if (questionConfig) {
						displayTitle = questionConfig.title;
					}
				}
			}

			// Determine if it's boolean based on config or answer format
			const isBoolean = (questionConfig && questionConfig.type === 'boolean') ||
				             /^[✅❌❔\s]+$/.test(answer.trim());

			if (isBoolean) {
				booleanQuestions.push({ title: displayTitle, answer });
			} else {
				textQuestions.push({ title: displayTitle, answer });
			}
		});

		return { booleanQuestions, textQuestions };
	}

	$: questionCategories = categorizeQuestions(metadata);

	// Function to render markdown
	function renderMarkdown(text) {
		if (!text) return '';
		return marked(text);
	}
</script>

<div class="job-detail">
	<div class="job-info">
		<div class="title-section">
			<h1 class="job-title">{job.title || 'N/A'}</h1>
			<div class="action-buttons">
				{#if job.job_url}
					<a
						href={job.job_url}
						target="_blank"
						rel="noopener noreferrer"
						class="action-btn linkedin"
						title="View on LinkedIn"
					>
						🔗
					</a>
				{/if}
				<button
					class="action-btn generate"
					on:click={generateResume}
					disabled={isGeneratingResume}
					title="Generate Resume"
				>
					{isGeneratingResume ? '⏳' : '📄'}
				</button>
				<button
					class="action-btn generate"
					on:click={generateCoverLetter}
					disabled={isGeneratingCoverLetter}
					title="Generate Cover Letter"
				>
					{isGeneratingCoverLetter ? '⏳' : '📝'}
				</button>
				<button
					class="action-btn analyze"
					on:click={analyzeJob}
					disabled={isAnalyzing}
					title="Analyze Job"
				>
					{isAnalyzing ? '⏳' : '🔍'}
				</button>
				<button
					class="action-btn status applied"
					on:click={markAsApplied}
					disabled={job.applied}
					title="Mark as Applied"
				>
					✓
				</button>
				<button
					class="action-btn status interview"
					on:click={markAsInterview}
					disabled={job.interview}
					title="Mark as Interview"
				>
					💬
				</button>
				<button
					class="action-btn status rejected"
					on:click={markAsRejected}
					disabled={job.rejected}
					title="Mark as Rejected"
				>
					✗
				</button>
				<button
					class="action-btn"
					class:hide={!job.hidden}
					class:unhide={job.hidden}
					on:click={toggleJobVisibility}
					title={job.hidden ? "Unhide Job (Press ` key)" : "Hide Job (Press ` key)"}
				>
					{job.hidden ? '👁️' : '👁️‍🗨️'}
				</button>
			</div>
		</div>
		
		<div class="job-meta">
			<div class="company">{job.company || 'N/A'}</div>
			<div class="location">{job.location || 'N/A'}</div>
			<div class="date">Posted: {formatDate(job.date)}</div>
		</div>

		<div class="job-status-badges">
			{#if job.applied}
				<span class="status applied">Applied</span>
			{/if}
			{#if job.interview}
				<span class="status interview">Interview</span>
			{/if}
			{#if job.rejected}
				<span class="status rejected">Rejected</span>
			{/if}
			{#if job.metadata}
				<span class="status analyzed">Analyzed</span>
			{/if}
		</div>
		
		{#if analysisError}
			<div class="error">Error: {analysisError}</div>
		{/if}
	</div>

	<div class="content-sections" bind:this={contentSectionsElement}>
		{#if metadata}
			<div class="section">
				{#if questionCategories.booleanQuestions.length > 0 || questionCategories.textQuestions.length > 0}
					<div class="analysis-results-container">
						<!-- Boolean questions row at the top -->
						{#if questionCategories.booleanQuestions.length > 0}
							<div class="boolean-row">
								{#each questionCategories.booleanQuestions as { title, answer }}
									<div class="boolean-item">
										<span class="boolean-title">{title}</span>
										<span class="boolean-answer">{answer}</span>
									</div>
								{/each}
							</div>
						{/if}
						
						<!-- Text questions row at the bottom -->
						{#if questionCategories.textQuestions.length > 0}
							<div class="text-row">
								{#each questionCategories.textQuestions as { title, answer }}
									<div class="text-item">
										<div class="text-title">{title}</div>
										<div class="text-answer">{@html renderMarkdown(answer)}</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<!-- Fallback: show raw metadata if categorization fails -->
					<div class="analysis-fallback">
						{#each Object.entries(metadata) as [question, answer]}
							<div class="analysis-item-fallback">
								<h4 class="question-fallback">{question}</h4>
								<div class="answer-fallback">{@html renderMarkdown(answer)}</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<div class="section">
			<h3>Job Description</h3>
			<div class="job-description">
				{job.job_description || 'No description available'}
			</div>
		</div>

		{#if job.resume}
			<div class="section">
				<h3>Generated Resume</h3>
				<div class="generated-content">
					{job.resume}
				</div>
			</div>
		{/if}

		{#if job.cover_letter}
			<div class="section">
				<h3>Generated Cover Letter</h3>
				<div class="generated-content">
					{job.cover_letter}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.job-detail {
		height: 100%;
		display: flex;
		flex-direction: column;
		background-color: white;
		border-radius: 8px;
		border: 1px solid #e1e5e9;
		overflow: hidden;
	}

	.job-info {
		padding: 1rem;
		border-bottom: 1px solid #e1e5e9;
		flex-shrink: 0;
	}

	.title-section {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
		gap: 1rem;
	}

	.job-title {
		color: #0a66c2;
		font-size: 1.5rem;
		line-height: 1.2;
		margin: 0;
		flex: 1;
	}

	.action-buttons {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.action-btn {
		width: 40px;
		height: 40px;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 1.2rem;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-btn.linkedin {
		background-color: #0077b5;
		color: white;
	}

	.action-btn.linkedin:hover {
		background-color: #005885;
		transform: translateY(-1px);
	}

	.action-btn.generate {
		background-color: #0a66c2;
		color: white;
	}

	.action-btn.generate:hover:not(:disabled) {
		background-color: #004182;
		transform: translateY(-1px);
	}

	.action-btn.analyze {
		background-color: #ffc107;
		color: #212529;
	}

	.action-btn.analyze:hover:not(:disabled) {
		background-color: #e0a800;
		transform: translateY(-1px);
	}

	.action-btn.status.applied {
		background-color: #28a745;
		color: white;
	}

	.action-btn.status.applied:hover:not(:disabled) {
		background-color: #218838;
		transform: translateY(-1px);
	}

	.action-btn.status.interview {
		background-color: #007bff;
		color: white;
	}

	.action-btn.status.interview:hover:not(:disabled) {
		background-color: #0056b3;
		transform: translateY(-1px);
	}

	.action-btn.status.rejected {
		background-color: #dc3545;
		color: white;
	}

	.action-btn.status.rejected:hover:not(:disabled) {
		background-color: #c82333;
		transform: translateY(-1px);
	}

	.action-btn.hide {
		background-color: #6c757d;
		color: white;
	}

	.action-btn.hide:hover:not(:disabled) {
		background-color: #5a6268;
		transform: translateY(-1px);
	}

	.action-btn.unhide {
		background-color: #28a745;
		color: white;
	}

	.action-btn.unhide:hover:not(:disabled) {
		background-color: #218838;
		transform: translateY(-1px);
	}

	.job-meta {
		display: flex;
		gap: 1rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
		font-size: 0.9rem;
	}

	.company {
		font-weight: 600;
		color: #333;
	}

	.location, .date {
		color: #666;
	}

	.job-status-badges {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}

	.status {
		padding: 0.25rem 0.6rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
	}

	.status.applied {
		background-color: #d4edda;
		color: #155724;
	}

	.status.interview {
		background-color: #cce7ff;
		color: #004085;
	}

	.status.rejected {
		background-color: #f8d7da;
		color: #721c24;
	}

	.status.analyzed {
		background-color: #fff3cd;
		color: #856404;
	}

	.error {
		color: #dc3545;
		font-size: 0.75rem;
		margin-top: 0.5rem;
		padding: 0.5rem;
		background-color: #f8d7da;
		border-radius: 4px;
	}

	.content-sections {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section {
		background: #fafafa;
		border: 1px solid #e1e5e9;
		border-radius: 6px;
		padding: 1rem;
	}

	.section h3 {
		color: #333;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #e1e5e9;
		font-size: 1rem;
		font-weight: 600;
	}

	.job-description, .generated-content {
		line-height: 1.5;
		color: #555;
		white-space: pre-wrap;
		font-size: 0.9rem;
		max-height: 300px;
		overflow-y: auto;
	}

	.analysis-results-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.boolean-row {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.boolean-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		border-left: 3px solid #0a66c2;
		background-color: transparent;
		margin: 0;
		min-width: 150px;
		flex: 1;
	}

	.boolean-title {
		color: #0a66c2;
		font-size: 0.85rem;
		font-weight: 600;
		margin: 0;
		margin-right: 1rem;
	}

	.boolean-answer {
		color: #333;
		font-size: 1rem;
		font-weight: bold;
		flex-shrink: 0;
	}

	.text-row {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.text-item {
		border-left: 3px solid #0a66c2;
		padding-left: 0.75rem;
		margin: 0;
		flex: 1;
		min-width: 300px;
	}

	.text-title {
		color: #0a66c2;
		font-size: 0.9rem;
		margin: 0 0 0.5rem 0;
		font-weight: 600;
	}

	.text-answer {
		color: #555;
		line-height: 1.4;
		font-size: 0.85rem;
		margin: 0;
	}

	/* Fallback styles for old analysis data */
	.analysis-fallback {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.analysis-item-fallback {
		border-left: 3px solid #0a66c2;
		padding-left: 0.75rem;
	}

	.question-fallback {
		color: #0a66c2;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.answer-fallback {
		color: #555;
		line-height: 1.4;
		font-size: 0.85rem;
	}

	/* Mobile responsiveness for analysis rows */
	@media (max-width: 768px) {
		.boolean-row {
			flex-direction: column;
			gap: 0.5rem;
		}
		
		.boolean-item {
			min-width: auto;
		}
		
		.text-row {
			flex-direction: column;
			gap: 1rem;
		}
		
		.text-item {
			min-width: auto;
		}
	}

	/* Scrollbar styling */
	.content-sections::-webkit-scrollbar,
	.job-description::-webkit-scrollbar,
	.generated-content::-webkit-scrollbar {
		width: 6px;
	}

	.content-sections::-webkit-scrollbar-track,
	.job-description::-webkit-scrollbar-track,
	.generated-content::-webkit-scrollbar-track {
		background: #f1f1f1;
		border-radius: 3px;
	}

	.content-sections::-webkit-scrollbar-thumb,
	.job-description::-webkit-scrollbar-thumb,
	.generated-content::-webkit-scrollbar-thumb {
		background: #c1c1c1;
		border-radius: 3px;
	}

	.content-sections::-webkit-scrollbar-thumb:hover,
	.job-description::-webkit-scrollbar-thumb:hover,
	.generated-content::-webkit-scrollbar-thumb:hover {
		background: #a8a8a8;
	}
</style>