<script>
	import { onMount } from 'svelte';
	import JobList from '$lib/components/JobList.svelte';
	import JobDetail from '$lib/components/JobDetail.svelte';
	import AddJobModal from '$lib/components/AddJobModal.svelte';

	let jobs = [];
	let selectedJob = null;
	let loading = true;
	let error = null;
	let searchTerm = '';
	let sortOrder = 'desc'; // 'asc' or 'desc'
	let selectedCategories = ['new']; // Default to showing 'new' jobs
	let jobStats = { total: 0, not_hidden: 0, applied: 0, interview: 0, rejected: 0, blocked: 0 };
	let dropdownOpen = false;
	let controlsCollapsed = false; // For mobile collapsible header
	let showAddJobModal = false;
	let totalJobs = 0; // Total jobs from API response
	let debounceTimer;

	// Job category options
	const categoryOptions = [
		{ id: 'hidden', label: 'Hidden', color: '#6c757d' },
		{ id: 'new', label: 'New', color: '#17a2b8' },
		{ id: 'applied', label: 'Applied', color: '#28a745' },
		{ id: 'interview', label: 'Interview', color: '#ffc107' },
		{ id: 'rejected', label: 'Rejected', color: '#dc3545' },
		{ id: 'blocked', label: 'Blocked', color: '#6f42c1' }
	];

	// Build query parameters based on current filter state
	function buildQueryParams() {
		const params = new URLSearchParams();

		// Handle category filters
		// Map categories to API parameters
		const categoryMapping = {
			'hidden': { hidden: true },
			'new': { hidden: false, applied: false, interview: false, rejected: false, blocked: false },
			'applied': { applied: true },
			'interview': { interview: true },
			'rejected': { rejected: true },
			'blocked': { blocked: true }
		};

		// If hidden is selected, we need to include hidden jobs
		if (selectedCategories.includes('hidden')) {
			params.append('hidden', 'true');
		} else {
			params.append('hidden', 'false');
		}

		// For status filters, we need to handle them differently
		// The backend supports filtering by specific status, but we have multiple categories selected
		// We'll need to make separate requests or update backend to support OR logic
		// For now, let's fetch with the appropriate filters

		// If only one non-hidden category is selected, we can use the specific filter
		const nonHiddenCategories = selectedCategories.filter(cat => cat !== 'hidden');

		if (nonHiddenCategories.length === 1 && nonHiddenCategories[0] !== 'new') {
			const category = nonHiddenCategories[0];
			params.append(category, 'true');
		}
		// If 'new' is the only category selected, we need jobs with no status flags
		// This requires fetching all and will be filtered on backend if we add support for it
		// For now, we fetch all when multiple categories are selected

		// Add search term
		if (searchTerm && searchTerm.trim()) {
			params.append('search', searchTerm.trim());
		}

		// Add sorting
		params.append('sort', 'date');
		params.append('order', sortOrder.toUpperCase());

		// Pagination - fetch more results
		params.append('limit', '1000');
		params.append('offset', '0');

		return params.toString();
	}

	// Fetch jobs from NestJS backend with current filters
	async function fetchJobs() {
		try {
			loading = true;
			const queryString = buildQueryParams();
			const response = await fetch(`/api/jobs?${queryString}`);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const result = await response.json();
			// NestJS returns { data: Job[], total, limit, offset }
			jobs = result.data || result;
			totalJobs = result.total || jobs.length;

			// Apply client-side category filtering for 'new' and multiple category selections
			// since the backend doesn't support OR logic for status filters yet
			jobs = filterJobsByCategories(jobs);
		} catch (err) {
			error = err.message;
			console.error('Error fetching jobs:', err);
		} finally {
			loading = false;
		}
	}

	// Client-side category filtering (for 'new' jobs and multi-category selections)
	function filterJobsByCategories(jobList) {
		return jobList.filter(job => {
			const category = getJobCategory(job);
			return selectedCategories.includes(category);
		});
	}

	// Get job category based on its status
	function getJobCategory(job) {
		if (job.hidden === 1) return 'hidden';
		if (job.applied === 1) return 'applied';
		if (job.interview === 1) return 'interview';
		if (job.rejected === 1) return 'rejected';
		if (job.blocked === 1) return 'blocked';
		return 'new'; // Default for jobs with no status
	}

	// Fetch job statistics
	async function fetchJobStats() {
		try {
			const response = await fetch('/api/jobs/stats');
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			jobStats = await response.json();
		} catch (err) {
			console.error('Error fetching job stats:', err);
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
		}

		// Refetch jobs and stats since job status may have changed
		fetchJobs();
		fetchJobStats();
	}

	// Toggle category selection
	function toggleCategory(categoryId) {
		if (selectedCategories.includes(categoryId)) {
			selectedCategories = selectedCategories.filter(id => id !== categoryId);
		} else {
			selectedCategories = [...selectedCategories, categoryId];
		}
		// Trigger API call when categories change
		fetchJobs();
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event) {
		if (dropdownOpen && !event.target.closest('.multiselect-container')) {
			dropdownOpen = false;
		}
	}

	function toggleSort() {
		sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
		fetchJobs();
	}

	function handleJobAdded(event) {
		const newJob = event.detail;

		// Select the new job
		selectedJob = newJob;

		// Refresh jobs list and stats
		fetchJobs();
		fetchJobStats();

		// Close modal
		showAddJobModal = false;
	}

	// Refresh button handler
	function refreshJobs() {
		fetchJobs();
		fetchJobStats();
	}

	// Debounced search - call API after user stops typing
	function handleSearchInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			fetchJobs();
		}, 500); // 500ms debounce
	}

	// Reactive statement for search term with debounce
	$: if (searchTerm !== undefined) {
		handleSearchInput();
	}

	// Reactive statement to re-fetch when sort order changes
	$: if (sortOrder !== undefined) {
		// This will be triggered by toggleSort() which already calls fetchJobs()
	}

	onMount(() => {
		fetchJobs();
		fetchJobStats();

		// Add click outside listener
		document.addEventListener('click', handleClickOutside);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			clearTimeout(debounceTimer);
		};
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
		<div class="controls" class:collapsed={controlsCollapsed}>
			<button class="collapse-toggle" on:click={() => controlsCollapsed = !controlsCollapsed}>
				{controlsCollapsed ? '▼' : '▲'} Filters
				<span class="job-count-inline">({jobs.length}/{jobStats.total >= 100 ? '100+' : jobStats.total})</span>
			</button>

			{#if !controlsCollapsed}
				<div class="controls-content">
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
					<button on:click={refreshJobs} class="refresh-btn">
						🔄 Refresh
					</button>
					<button on:click={() => showAddJobModal = true} class="add-job-btn">
						➕ Add Job
					</button>

					<!-- Category Filter Multi-Select Dropdown -->
					<div class="category-filter">
						<span class="filter-label">Show:</span>
						<div class="multiselect-container">
							<button
								class="multiselect-trigger"
								on:click={() => dropdownOpen = !dropdownOpen}
								type="button"
							>
								<span class="selected-text">
									{#if selectedCategories.length === 0}
										Select categories...
									{:else if selectedCategories.length === 1}
										{categoryOptions.find(c => c.id === selectedCategories[0])?.label}
									{:else}
										{selectedCategories.length} categories selected
									{/if}
								</span>
								<span class="dropdown-arrow">{dropdownOpen ? '↑' : '↓'}</span>
							</button>

							{#if dropdownOpen}
								<div class="multiselect-dropdown">
									{#each categoryOptions as category}
										<label class="dropdown-option" style="--category-color: {category.color}">
											<input
												type="checkbox"
												checked={selectedCategories.includes(category.id)}
												on:change={() => toggleCategory(category.id)}
												class="option-checkbox"
											/>
											<span class="option-label">{category.label}</span>
											<span class="category-dot" style="background-color: {category.color}"></span>
										</label>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<div class="job-count">
						Showing {jobs.length} of {jobStats.total >= 100 ? '100+' : jobStats.total} jobs
					</div>
				</div>
			{/if}
		</div>

		<!-- Two-Panel Layout -->
		<div class="main-content">
			<div class="left-panel">
				<JobList jobs={jobs} {selectedJob} on:selectJob={(e) => selectJob(e.detail)} on:jobUpdated={handleJobUpdate} />
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

	<!-- Add Job Modal -->
	<AddJobModal show={showAddJobModal} on:close={() => showAddJobModal = false} on:jobAdded={handleJobAdded} />
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
		flex-wrap: wrap;
	}

	.collapse-toggle {
		display: none;
	}

	.controls-content {
		display: contents;
	}

	.job-count-inline {
		font-size: 0.85rem;
		color: #666;
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

	.refresh-btn {
		background-color: #6c757d;
		color: white;
		border: none;
		padding: 0.75rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		white-space: nowrap;
		transition: background-color 0.2s;
	}

	.refresh-btn:hover {
		background-color: #5a6268;
	}

	.add-job-btn {
		background-color: #28a745;
		color: white;
		border: none;
		padding: 0.75rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		white-space: nowrap;
		transition: background-color 0.2s;
	}

	.add-job-btn:hover {
		background-color: #218838;
	}

	.category-filter {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		white-space: nowrap;
	}

	.filter-label {
		font-size: 0.9rem;
		color: #333;
		font-weight: 500;
	}

	.multiselect-container {
		position: relative;
		min-width: 200px;
	}

	.multiselect-trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.5rem 0.75rem;
		background-color: white;
		border: 1px solid #ddd;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: border-color 0.2s;
	}

	.multiselect-trigger:hover {
		border-color: #0a66c2;
	}

	.multiselect-trigger:focus {
		outline: none;
		border-color: #0a66c2;
		box-shadow: 0 0 0 2px rgba(10, 102, 194, 0.1);
	}

	.selected-text {
		flex: 1;
		text-align: left;
		color: #333;
	}

	.dropdown-arrow {
		color: #666;
		font-size: 0.8rem;
		margin-left: 0.5rem;
	}

	.multiselect-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background-color: white;
		border: 1px solid #ddd;
		border-radius: 4px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		z-index: 1000;
		max-height: 200px;
		overflow-y: auto;
	}

	.dropdown-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		transition: background-color 0.2s;
		border-bottom: 1px solid #f0f0f0;
	}

	.dropdown-option:last-child {
		border-bottom: none;
	}

	.dropdown-option:hover {
		background-color: #f8f9fa;
	}

	.option-checkbox {
		width: 16px;
		height: 16px;
		cursor: pointer;
		accent-color: var(--category-color);
	}

	.option-label {
		flex: 1;
		font-size: 0.9rem;
		color: #333;
		cursor: pointer;
		user-select: none;
	}

	.category-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
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
		.container {
			padding: 0.5rem;
			height: 100vh;
			height: 100dvh; /* Dynamic viewport height for mobile browsers */
		}

		.main-content {
			flex-direction: column;
			overflow: hidden;
		}

		.left-panel {
			width: 100%;
			height: 180px;
			flex-shrink: 0;
		}

		.right-panel {
			flex: 1;
			min-height: 0;
			overflow: hidden;
		}

		.controls {
			flex-direction: column;
			align-items: stretch;
			gap: 0;
			padding: 0;
			margin-bottom: 0.5rem;
			background-color: transparent;
			border-radius: 0;
		}

		.controls.collapsed {
			padding: 0;
		}

		.collapse-toggle {
			display: flex;
			align-items: center;
			justify-content: space-between;
			width: 100%;
			padding: 0.5rem;
			background-color: #f8f9fa;
			border: 1px solid #e1e5e9;
			border-radius: 6px;
			cursor: pointer;
			font-size: 0.9rem;
			font-weight: 500;
			color: #333;
			transition: background-color 0.2s;
		}

		.collapse-toggle:hover {
			background-color: #e9ecef;
		}

		.controls-content {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			padding: 0.5rem;
			background-color: #f8f9fa;
			border: 1px solid #e1e5e9;
			border-radius: 6px;
			margin-top: 0.5rem;
		}

		.search-container {
			max-width: none;
		}

		.sort-btn,
		.refresh-btn,
		.add-job-btn {
			width: 100%;
			padding: 0.6rem;
		}

		.category-filter {
			width: 100%;
		}

		.multiselect-container {
			width: 100%;
		}

		.job-count {
			text-align: center;
			font-size: 0.85rem;
		}
	}
</style>
