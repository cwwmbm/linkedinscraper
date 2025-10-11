<script>
	import { onMount } from 'svelte';
	import JobList from '$lib/components/JobList.svelte';
	import JobDetail from '$lib/components/JobDetail.svelte';

	let jobs = [];
	let filteredJobs = [];
	let selectedJob = null;
	let loading = true;
	let error = null;
	let searchTerm = '';
	let sortOrder = 'desc'; // 'asc' or 'desc'
	let showHiddenJobs = false;

	// Fetch jobs from Flask backend
	async function fetchJobs() {
		try {
			loading = true;
			const endpoint = showHiddenJobs ? '/api/get_all_jobs_including_hidden' : '/api/get_all_jobs';
			const response = await fetch(endpoint);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			jobs = await response.json();
			filteredJobs = [...jobs];
			sortJobs();
		} catch (err) {
			error = err.message;
			console.error('Error fetching jobs:', err);
		} finally {
			loading = false;
		}
	}

	function selectJob(job) {
		selectedJob = job;
	}

	function handleJobUpdate(event) {
		const { id, updatedFields, fullJob } = event.detail;
		
		// Update the job in the jobs array
		const jobIndex = jobs.findIndex(job => job.id === id);
		if (jobIndex !== -1) {
			// Update the specific job with new data
			jobs[jobIndex] = { ...jobs[jobIndex], ...updatedFields };
			
			// Update selectedJob if it's the same job
			if (selectedJob && selectedJob.id === id) {
				selectedJob = { ...selectedJob, ...updatedFields };
			}
			
			// Trigger reactivity by reassigning the array
			jobs = [...jobs];
			
			// Re-filter and sort jobs
			filterJobs();
		}
	}

	function sortJobs() {
		filteredJobs = filteredJobs.sort((a, b) => {
			const dateA = new Date(a.date || 0);
			const dateB = new Date(b.date || 0);
			return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
		});
	}

	function filterJobs() {
		if (!searchTerm.trim()) {
			filteredJobs = [...jobs];
		} else {
			const term = searchTerm.toLowerCase();
			filteredJobs = jobs.filter(job => {
				return (
					(job.title || '').toLowerCase().includes(term) ||
					(job.company || '').toLowerCase().includes(term) ||
					(job.location || '').toLowerCase().includes(term) ||
					(job.job_description || '').toLowerCase().includes(term)
				);
			});
		}
		sortJobs();
	}

	function toggleSort() {
		sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
		sortJobs();
	}

	// Reactive statements to update filtered jobs when search term changes
	$: if (searchTerm !== undefined) {
		filterJobs();
	}

	// Reactive statement to refetch jobs when show hidden toggle changes
	$: if (showHiddenJobs !== undefined) {
		fetchJobs();
	}

	onMount(() => {
		fetchJobs();
	});
</script>

<main class="container">
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading jobs...</p>
		</div>
	{:else if error}
		<div class="error">
			<p>Error loading jobs: {error}</p>
			<button on:click={fetchJobs} class="retry-btn">Retry</button>
		</div>
	{:else}
		<!-- Search and Sort Controls -->
		<div class="controls">
			<div class="search-container">
				<input
					type="text"
					placeholder="Search jobs, companies, locations..."
					bind:value={searchTerm}
					class="search-input"
				/>
				<span class="search-icon">🔍</span>
			</div>
			<button on:click={toggleSort} class="sort-btn">
				Sort by Date {sortOrder === 'desc' ? '↓' : '↑'}
			</button>
			<label class="toggle-container">
				<input
					type="checkbox"
					bind:checked={showHiddenJobs}
					class="toggle-checkbox"
				/>
				<span class="toggle-label">Show Hidden Jobs</span>
			</label>
			<div class="job-count">
				{filteredJobs.length} of {jobs.length} jobs
			</div>
		</div>

		<!-- Two-Panel Layout -->
		<div class="main-content">
			<div class="left-panel">
				<JobList jobs={filteredJobs} {selectedJob} on:selectJob={(e) => selectJob(e.detail)} />
			</div>
			<div class="right-panel">
				{#if selectedJob}
					<JobDetail job={selectedJob} on:jobUpdated={handleJobUpdate} />
				{:else}
					<div class="no-selection">
						<h3>Select a job to view details</h3>
						<p>Choose a job from the list to see its details and available actions.</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</main>

<style>
	.container {
		max-width: 100vw;
		margin: 0;
		padding: 1rem;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		height: 100vh;
		display: flex;
		flex-direction: column;
	}


	.controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.75rem;
		padding: 0.75rem;
		background-color: #f8f9fa;
		border-radius: 8px;
		flex-shrink: 0;
	}

	.search-container {
		position: relative;
		flex: 1;
		max-width: 400px;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 2.5rem 0.75rem 1rem;
		border: 1px solid #ddd;
		border-radius: 24px;
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.2s;
	}

	.search-input:focus {
		border-color: #0a66c2;
		box-shadow: 0 0 0 2px rgba(10, 102, 194, 0.1);
	}

	.search-icon {
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		color: #666;
		pointer-events: none;
	}

	.sort-btn {
		background-color: #0a66c2;
		color: white;
		border: none;
		padding: 0.75rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		white-space: nowrap;
	}

	.sort-btn:hover {
		background-color: #004182;
	}

	.toggle-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.toggle-checkbox {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.toggle-label {
		font-size: 0.9rem;
		color: #333;
		cursor: pointer;
		user-select: none;
	}

	.job-count {
		color: #666;
		font-size: 0.9rem;
		white-space: nowrap;
	}

	.main-content {
		display: flex;
		gap: 1rem;
		flex: 1;
		min-height: 0;
	}

	.left-panel {
		width: 400px;
		flex-shrink: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.right-panel {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.no-selection {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		background-color: #f8f9fa;
		border-radius: 8px;
		border: 2px dashed #ddd;
		text-align: center;
		color: #666;
	}

	.no-selection h3 {
		margin-bottom: 0.5rem;
		color: #333;
	}

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 3rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #f3f3f3;
		border-top: 4px solid #0a66c2;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.error {
		text-align: center;
		padding: 2rem;
		background-color: #f8d7da;
		border: 1px solid #f5c6cb;
		border-radius: 8px;
		color: #721c24;
	}

	.retry-btn {
		background-color: #0a66c2;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		margin-top: 1rem;
	}

	.retry-btn:hover {
		background-color: #004182;
	}

	@media (max-width: 768px) {
		.main-content {
			flex-direction: column;
		}
		
		.left-panel {
			width: 100%;
			height: 300px;
		}
		
		.controls {
			flex-direction: column;
			align-items: stretch;
		}
		
		.search-container {
			max-width: none;
		}
	}
</style>
