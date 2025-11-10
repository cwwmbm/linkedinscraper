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
	let notes = '';
	let isSavingNotes = false;
	let saveNotesTimeout = null;
	let notesSaved = false;
	let toastMessage = '';
	let showToast = false;

	function showToastNotification(message) {
		toastMessage = message;
		showToast = true;
		setTimeout(() => {
			showToast = false;
		}, 3000); // Hide after 3 seconds
	}

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
		loadNotes();
	});

	// Load notes when job changes
	$: if (job) {
		loadNotes();
	}

	async function loadNotes() {
		if (!job || !job.id) return;

		try {
			// First try to get notes from the job object if it exists
			if (job.notes !== undefined) {
				notes = job.notes || '';
				return;
			}

			// Otherwise fetch from API - NestJS returns the full job object
			const response = await fetch(`/api/jobs/${job.id}`);
			if (response.ok) {
				const result = await response.json();
				notes = result.notes || '';
				// Update the job object with the loaded notes
				job.notes = notes;
			}
		} catch (error) {
			console.error('Error loading notes:', error);
		}
	}

	async function saveNotes() {
		if (!job || !job.id) return;

		isSavingNotes = true;
		notesSaved = false;

		try {
			const response = await fetch(`/api/jobs/${job.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ notes })
			});

			if (response.ok) {
				const result = await response.json();
				job.notes = notes;

				// Update the parent component
				dispatch('jobUpdated', {
					id: job.id,
					updatedFields: { notes: job.notes },
					fullJob: job
				});

				notesSaved = true;
				setTimeout(() => {
					notesSaved = false;
				}, 2000);
			} else {
				console.error('Failed to save notes:', response.status);
			}
		} catch (error) {
			console.error('Error saving notes:', error);
		} finally {
			isSavingNotes = false;
		}
	}

	function debouncedSaveNotes() {
		if (saveNotesTimeout) {
			clearTimeout(saveNotesTimeout);
		}
		
		saveNotesTimeout = setTimeout(() => {
			saveNotes();
		}, 1000); // 1 second debounce
	}

	// Watch for notes changes and debounce save
	$: if (notes !== undefined && job && job.id) {
		// Only trigger save if notes actually changed from what's stored
		if (notes !== (job.notes || '')) {
			debouncedSaveNotes();
		}
	}


	async function analyzeJob() {
		if (isAnalyzing) return;

		isAnalyzing = true;
		analysisError = null;

		try {
			const response = await fetch(`/api/jobs/${job.id}/analysis`, {
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

			showToastNotification('Job analysis completed successfully!');
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
			const response = await fetch(`/api/jobs/${job.id}/resume`, {
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
			showToastNotification('Resume generated successfully!');
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
			const response = await fetch(`/api/jobs/${job.id}/cover-letter`, {
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
			showToastNotification('Cover letter generated successfully!');
		} catch (error) {
			alert(`Error generating cover letter: ${error.message}`);
		} finally {
			isGeneratingCoverLetter = false;
		}
	}

	async function downloadResumePdf() {
		try {
			const response = await fetch(`/api/jobs/${job.id}/resume/pdf`);

			if (!response.ok) {
				throw new Error(`Failed to download resume PDF: ${response.status}`);
			}

			// Get the blob from response
			const blob = await response.blob();

			// Create a download link
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `resume_${job.company.replace(/[^a-z0-9]/gi, '_')}_${job.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			showToastNotification('Resume PDF downloaded!');
		} catch (error) {
			console.error('Error downloading resume PDF:', error);
			showToastNotification('Failed to download resume PDF');
		}
	}

	async function downloadCoverLetterPdf() {
		try {
			const response = await fetch(`/api/jobs/${job.id}/cover-letter/pdf`);

			if (!response.ok) {
				throw new Error(`Failed to download cover letter PDF: ${response.status}`);
			}

			// Get the blob from response
			const blob = await response.blob();

			// Create a download link
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `cover_letter_${job.company.replace(/[^a-z0-9]/gi, '_')}_${job.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			showToastNotification('Cover letter PDF downloaded!');
		} catch (error) {
			console.error('Error downloading cover letter PDF:', error);
			showToastNotification('Failed to download cover letter PDF');
		}
	}

	async function markAsApplied() {
		try {
			// Toggle behavior: if already applied, set to 0, otherwise set to 1
			const newStatus = job.applied === 1 ? 0 : 1;
			const updateData = { applied: newStatus };

			// Clear other statuses when setting to applied
			if (newStatus === 1) {
				updateData.interview = 0;
				updateData.rejected = 0;
				updateData.blocked = 0;
			}

			const response = await fetch(`/jobs/${job.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updateData)
			});

			if (response.ok) {
				const result = await response.json();
				job.applied = result.applied;
				job.interview = result.interview;
				job.rejected = result.rejected;
				job.blocked = result.blocked;

				dispatch('jobUpdated', {
					id: job.id,
					updatedFields: {
						applied: job.applied,
						interview: job.interview,
						rejected: job.rejected,
						blocked: job.blocked
					},
					fullJob: job
				});
			}
		} catch (error) {
			alert(`Error marking as applied: ${error.message}`);
		}
	}

	async function markAsInterview() {
		try {
			// Toggle behavior: if already interview, set to 0, otherwise set to 1
			const newStatus = job.interview === 1 ? 0 : 1;
			const updateData = { interview: newStatus };

			// Clear other statuses when setting to interview
			if (newStatus === 1) {
				updateData.applied = 0;
				updateData.rejected = 0;
				updateData.blocked = 0;
			}

			const response = await fetch(`/jobs/${job.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updateData)
			});

			if (response.ok) {
				const result = await response.json();
				job.applied = result.applied;
				job.interview = result.interview;
				job.rejected = result.rejected;
				job.blocked = result.blocked;

				dispatch('jobUpdated', {
					id: job.id,
					updatedFields: {
						applied: job.applied,
						interview: job.interview,
						rejected: job.rejected,
						blocked: job.blocked
					},
					fullJob: job
				});
			}
		} catch (error) {
			alert(`Error marking as interview: ${error.message}`);
		}
	}

	async function markAsRejected() {
		try {
			// Toggle behavior: if already rejected, set to 0, otherwise set to 1
			const newStatus = job.rejected === 1 ? 0 : 1;
			const updateData = { rejected: newStatus };

			// Clear other statuses when setting to rejected
			if (newStatus === 1) {
				updateData.applied = 0;
				updateData.interview = 0;
				updateData.blocked = 0;
			}

			const response = await fetch(`/jobs/${job.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updateData)
			});

			if (response.ok) {
				const result = await response.json();
				job.applied = result.applied;
				job.interview = result.interview;
				job.rejected = result.rejected;
				job.blocked = result.blocked;

				dispatch('jobUpdated', {
					id: job.id,
					updatedFields: {
						applied: job.applied,
						interview: job.interview,
						rejected: job.rejected,
						blocked: job.blocked
					},
					fullJob: job
				});
			}
		} catch (error) {
			alert(`Error marking as rejected: ${error.message}`);
		}
	}

	async function markAsBlocked() {
		try {
			// Toggle behavior: if already blocked, set to 0, otherwise set to 1
			const newStatus = job.blocked === 1 ? 0 : 1;
			const updateData = { blocked: newStatus };

			// Clear other statuses when setting to blocked
			if (newStatus === 1) {
				updateData.applied = 0;
				updateData.interview = 0;
				updateData.rejected = 0;
			}

			const response = await fetch(`/jobs/${job.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updateData)
			});

			if (response.ok) {
				const result = await response.json();
				job.applied = result.applied;
				job.interview = result.interview;
				job.rejected = result.rejected;
				job.blocked = result.blocked;

				dispatch('jobUpdated', {
					id: job.id,
					updatedFields: {
						applied: job.applied,
						interview: job.interview,
						rejected: job.rejected,
						blocked: job.blocked
					},
					fullJob: job
				});
			}
		} catch (error) {
			alert(`Error marking as blocked: ${error.message}`);
		}
	}

	async function toggleJobVisibility() {
		const isHidden = job.hidden;
		const newHiddenValue = isHidden ? 0 : 1;
		const action = isHidden ? 'unhide' : 'hide';

		try {
			const response = await fetch(`/jobs/${job.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ hidden: newHiddenValue })
			});

			if (response.ok) {
				job.hidden = newHiddenValue;
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
		} else if (event.key === '\\' && !event.ctrlKey && !event.altKey && !event.metaKey) {
			event.preventDefault();
			if (job.job_url) {
				// Create a temporary link element and simulate ctrl+click to open in background tab
				const link = document.createElement('a');
				link.href = job.job_url;
				link.target = '_blank';
				link.rel = 'noopener noreferrer';
				
				// Simulate ctrl+click which opens in background tab
				const clickEvent = new MouseEvent('click', {
					ctrlKey: true,
					metaKey: true, // For Mac compatibility
					bubbles: true,
					cancelable: true
				});
				
				document.body.appendChild(link);
				link.dispatchEvent(clickEvent);
				document.body.removeChild(link);
			}
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
				             /^[✅❌❔\s]+$/.test(answer.trim()) ||
				             // TODO: Hardcoded rate detection - improve later with better field classification
				             key.toLowerCase() === 'rate' ||
				             key.toLowerCase().includes('rate');

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
			<div class="action-buttons desktop-buttons">
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
					class:active={job.applied}
					on:click={markAsApplied}
					title={job.applied ? "Remove Applied Status" : "Mark as Applied"}
				>
					✓
				</button>
				<button
					class="action-btn status interview"
					class:active={job.interview}
					on:click={markAsInterview}
					title={job.interview ? "Remove Interview Status" : "Mark as Interview"}
				>
					💬
				</button>
				<button
					class="action-btn status rejected"
					class:active={job.rejected}
					on:click={markAsRejected}
					title={job.rejected ? "Remove Rejected Status" : "Mark as Rejected"}
				>
					✗
				</button>
				<button
					class="action-btn status blocked"
					class:active={job.blocked}
					on:click={markAsBlocked}
					title={job.blocked ? "Remove Blocked Status" : "Mark as Blocked"}
				>
					🚫
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

		<div class="job-header-info">
			<div class="action-buttons mobile-buttons">
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
					class:active={job.applied}
					on:click={markAsApplied}
					title={job.applied ? "Remove Applied Status" : "Mark as Applied"}
				>
					✓
				</button>
				<button
					class="action-btn status interview"
					class:active={job.interview}
					on:click={markAsInterview}
					title={job.interview ? "Remove Interview Status" : "Mark as Interview"}
				>
					💬
				</button>
				<button
					class="action-btn status rejected"
					class:active={job.rejected}
					on:click={markAsRejected}
					title={job.rejected ? "Remove Rejected Status" : "Mark as Rejected"}
				>
					✗
				</button>
				<button
					class="action-btn status blocked"
					class:active={job.blocked}
					on:click={markAsBlocked}
					title={job.blocked ? "Remove Blocked Status" : "Mark as Blocked"}
				>
					🚫
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

			<div class="header-info-column">
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
					{#if job.blocked}
						<span class="status blocked">Blocked</span>
					{/if}
					{#if job.metadata}
						<span class="status analyzed">Analyzed</span>
					{/if}
				</div>
			</div>
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
				<div class="section-header">
					<h3>Generated Resume</h3>
					<button
						class="download-pdf-btn"
						on:click={downloadResumePdf}
						title="Download as PDF"
					>
						📥 Download PDF
					</button>
				</div>
				<div class="generated-content">
					{@html renderMarkdown(job.resume)}
				</div>
			</div>
		{/if}

		{#if job.cover_letter}
			<div class="section">
				<div class="section-header">
					<h3>Generated Cover Letter</h3>
					<button
						class="download-pdf-btn"
						on:click={downloadCoverLetterPdf}
						title="Download as PDF"
					>
						📥 Download PDF
					</button>
				</div>
				<div class="generated-content">
					{@html renderMarkdown(job.cover_letter)}
				</div>
			</div>
		{/if}

		<div class="section">
			<h3>
				Notes
				{#if isSavingNotes}
					<span class="save-status saving">Saving...</span>
				{:else if notesSaved}
					<span class="save-status saved">Saved ✓</span>
				{/if}
			</h3>
			<textarea
				bind:value={notes}
				placeholder="Add your notes about this job..."
				class="notes-textarea"
				rows="4"
			></textarea>
		</div>
	</div>

	<!-- Toast Notification -->
	{#if showToast}
		<div class="toast-notification" class:show={showToast}>
			{toastMessage}
		</div>
	{/if}
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
		/* Ensure proper mobile height calculation */
		position: relative;
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
		background-color: #e8f5e8;
		color: #28a745;
		border: 2px solid #28a745;
	}

	.action-btn.status.applied.active {
		background-color: #28a745;
		color: white;
	}

	.action-btn.status.applied:hover {
		background-color: #218838;
		color: white;
		transform: translateY(-1px);
	}

	.action-btn.status.interview {
		background-color: #e8f4fd;
		color: #007bff;
		border: 2px solid #007bff;
	}

	.action-btn.status.interview.active {
		background-color: #007bff;
		color: white;
	}

	.action-btn.status.interview:hover {
		background-color: #0056b3;
		color: white;
		transform: translateY(-1px);
	}

	.action-btn.status.rejected {
		background-color: #fdeaea;
		color: #dc3545;
		border: 2px solid #dc3545;
	}

	.action-btn.status.rejected.active {
		background-color: #dc3545;
		color: white;
	}

	.action-btn.status.rejected:hover {
		background-color: #c82333;
		color: white;
		transform: translateY(-1px);
	}

	.action-btn.status.blocked {
		background-color: #f3e7ff;
		color: #6f42c1;
		border: 2px solid #6f42c1;
	}

	.action-btn.status.blocked.active {
		background-color: #6f42c1;
		color: white;
	}

	.action-btn.status.blocked:hover {
		background-color: #5a2a98;
		color: white;
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

	.job-header-info {
		display: contents;
	}

	.mobile-buttons {
		display: none;
	}

	.desktop-buttons {
		display: flex;
	}

	.header-info-column {
		display: contents;
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

	.status.blocked {
		background-color: #f3e7ff;
		color: #6f42c1;
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
		overflow-x: hidden;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		/* Better mobile scrolling */
		-webkit-overflow-scrolling: touch;
		/* Ensure content can scroll to bottom */
		padding-bottom: 2rem;
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

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.section-header h3 {
		margin-bottom: 0;
		padding-bottom: 0;
		border-bottom: none;
	}

	.download-pdf-btn {
		background: #0a66c2;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s ease;
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.download-pdf-btn:hover {
		background: #004182;
	}

	.download-pdf-btn:active {
		transform: scale(0.98);
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
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
	}

	.boolean-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.4rem 0.6rem;
		border-left: 3px solid #0a66c2;
		background-color: transparent;
		margin: 0;
		min-width: 120px;
		flex: 1 1 auto;
		max-width: 200px;
		overflow: hidden;
	}

	.boolean-title {
		color: #0a66c2;
		font-size: 0.8rem;
		font-weight: 600;
		margin: 0;
		margin-right: 0.5rem;
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.boolean-answer {
		color: #333;
		font-size: 0.9rem;
		font-weight: bold;
		flex-shrink: 0;
		white-space: nowrap;
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
		.container {
			padding: 0.5rem;
		}

		.job-detail {
			border-radius: 4px;
			/* Ensure full height on mobile */
			max-height: 100%;
		}

		.job-info {
			padding: 0.5rem;
			flex-shrink: 0;
			/* Prevent this from growing too much */
			max-height: 30%;
			overflow-y: auto;
		}

		.title-section {
			display: none; /* Hide title section completely on mobile */
		}

		.desktop-buttons {
			display: none !important;
		}

		.job-header-info {
			display: flex;
			gap: 0.5rem;
			align-items: flex-start;
		}

		.mobile-buttons {
			display: flex !important;
			flex-wrap: wrap;
			gap: 0.3rem;
			width: auto;
			max-width: 50%;
			flex-shrink: 0;
			align-content: flex-start;
		}

		.action-btn {
			width: 30px;
			height: 30px;
			font-size: 0.8rem;
			padding: 0;
		}

		.header-info-column {
			display: flex;
			flex-direction: column;
			flex: 1;
		}

		.job-meta {
			display: flex;
			flex-direction: column;
			gap: 0.2rem;
			font-size: 0.75rem;
			flex: 1;
			margin-bottom: 0.5rem;
		}

		.job-status-badges {
			gap: 0.35rem;
		}

		.status {
			font-size: 0.7rem;
			padding: 0.2rem 0.5rem;
		}

		.content-sections {
			padding: 0.75rem;
			gap: 0.75rem;
			/* Fix iOS scrolling */
			-webkit-overflow-scrolling: touch;
			/* Ensure it takes remaining space and scrolls */
			flex: 1;
			min-height: 0;
			overflow-y: auto;
			overflow-x: hidden;
		}

		.section {
			padding: 0.75rem;
		}

		.section h3 {
			font-size: 0.95rem;
			margin-bottom: 0.5rem;
		}

		.job-description, .generated-content {
			font-size: 0.85rem;
			max-height: 250px;
		}

		.boolean-row {
			flex-direction: column;
			gap: 0.5rem;
		}

		.boolean-item {
			min-width: auto;
			max-width: none;
			width: 100%;
		}

		.text-row {
			flex-direction: column;
			gap: 1rem;
		}

		.text-item {
			min-width: auto;
		}

		.text-title {
			font-size: 0.85rem;
		}

		.text-answer {
			font-size: 0.8rem;
		}

		.notes-textarea {
			font-size: 0.85rem;
			min-height: 100px;
		}
	}

	/* Very small mobile screens */
	@media (max-width: 480px) {
		.job-title {
			font-size: 1.1rem;
		}

		.action-buttons {
			grid-template-columns: repeat(4, 1fr);
			gap: 0.35rem;
		}

		.action-btn {
			height: 40px;
			font-size: 0.9rem;
		}

		.job-meta {
			font-size: 0.8rem;
		}

		.content-sections {
			padding: 0.5rem;
		}

		.section {
			padding: 0.5rem;
		}

		.section h3 {
			font-size: 0.9rem;
		}

		.job-description, .generated-content {
			font-size: 0.8rem;
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

	/* Notes section styles */
	.notes-textarea {
		width: 100%;
		box-sizing: border-box;
		min-height: 80px;
		padding: 0.75rem;
		border: 1px solid #e1e5e9;
		border-radius: 4px;
		font-family: inherit;
		font-size: 0.9rem;
		line-height: 1.4;
		resize: vertical;
		background-color: white;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.notes-textarea:focus {
		outline: none;
		border-color: #0a66c2;
		box-shadow: 0 0 0 2px rgba(10, 102, 194, 0.1);
	}

	.notes-textarea::placeholder {
		color: #999;
		font-style: italic;
	}

	.save-status {
		font-size: 0.75rem;
		font-weight: normal;
		margin-left: 0.5rem;
	}

	.save-status.saving {
		color: #ffc107;
	}

	.save-status.saved {
		color: #28a745;
	}

	/* Toast Notification */
	.toast-notification {
		position: fixed;
		bottom: -100px;
		left: 50%;
		transform: translateX(-50%);
		background-color: #28a745;
		color: white;
		padding: 1rem 1.5rem;
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		font-size: 0.9rem;
		font-weight: 500;
		z-index: 10000;
		transition: bottom 0.3s ease-in-out;
		max-width: 90%;
		text-align: center;
	}

	.toast-notification.show {
		bottom: 2rem;
	}

	@media (max-width: 768px) {
		.toast-notification {
			bottom: -100px;
			font-size: 0.85rem;
			padding: 0.75rem 1.25rem;
		}

		.toast-notification.show {
			bottom: 1rem;
		}
	}
</style>